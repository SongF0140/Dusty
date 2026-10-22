-- Run once on the server's PostgreSQL database before using PostgresRunStore.
-- Each function call is one transaction, including over HTTP database clients.
BEGIN;
CREATE TABLE IF NOT EXISTS blog_conversations (id text PRIMARY KEY, user_id text NOT NULL);
CREATE TABLE IF NOT EXISTS blog_usage (
  user_id text NOT NULL, day text NOT NULL, used integer NOT NULL CHECK (used BETWEEN 0 AND 20),
  PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS blog_runs (
  seq bigserial UNIQUE, user_id text NOT NULL, request_id text NOT NULL,
  conversation_id text NOT NULL REFERENCES blog_conversations(id), fingerprint text NOT NULL,
  question text NOT NULL, day text NOT NULL, status text NOT NULL,
  lease_id text NOT NULL, lease_until bigint NOT NULL,
  model_calls integer NOT NULL DEFAULT 0 CHECK (model_calls BETWEEN 0 AND 4),
  tool_calls integer NOT NULL DEFAULT 0 CHECK (tool_calls BETWEEN 0 AND 6), result jsonb,
  PRIMARY KEY (user_id, request_id)
);
CREATE INDEX IF NOT EXISTS blog_runs_active ON blog_runs(user_id) WHERE status='running';
CREATE INDEX IF NOT EXISTS blog_runs_history ON blog_runs(user_id,conversation_id,seq DESC) WHERE status='completed';
CREATE TABLE IF NOT EXISTS blog_events (
  seq bigserial PRIMARY KEY, user_id text NOT NULL, request_id text NOT NULL, type text NOT NULL, data text NOT NULL,
  FOREIGN KEY (user_id,request_id) REFERENCES blog_runs(user_id,request_id)
);

CREATE OR REPLACE FUNCTION blog_begin(
  p_user text, p_request text, p_conversation text, p_fingerprint text,
  p_question text, p_day text, p_lease text, p_now bigint
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE r blog_runs%ROWTYPE; v_owner text; v_used integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user,0));
  -- Mark abandoned work before duplicate handling, refunding only unstarted model work.
  FOR r IN SELECT * FROM blog_runs WHERE user_id=p_user AND status='running' AND lease_until<=p_now LOOP
    UPDATE blog_runs SET status='interrupted' WHERE user_id=p_user AND request_id=r.request_id;
    IF r.model_calls=0 THEN
      UPDATE blog_usage SET used=greatest(0,used-1) WHERE user_id=p_user AND day=r.day;
    END IF;
  END LOOP;
  SELECT * INTO r FROM blog_runs WHERE user_id=p_user AND request_id=p_request;
  IF FOUND THEN
    IF r.fingerprint<>p_fingerprint THEN RETURN jsonb_build_object('kind','conflict'); END IF;
    IF r.status='completed' THEN RETURN jsonb_build_object('kind','replay','result',r.result); END IF;
    IF r.status='running' THEN RETURN jsonb_build_object('kind','busy'); END IF;
    RETURN jsonb_build_object('kind','interrupted');
  END IF;
  -- ON CONFLICT serializes two accounts attempting to claim the same conversation.
  INSERT INTO blog_conversations VALUES(p_conversation,p_user) ON CONFLICT DO NOTHING;
  SELECT user_id INTO v_owner FROM blog_conversations WHERE id=p_conversation;
  IF v_owner<>p_user THEN RETURN jsonb_build_object('kind','forbidden'); END IF;
  IF EXISTS(SELECT 1 FROM blog_runs WHERE user_id=p_user AND status='running') THEN
    RETURN jsonb_build_object('kind','busy');
  END IF;
  INSERT INTO blog_usage VALUES(p_user,p_day,0) ON CONFLICT DO NOTHING;
  SELECT used INTO v_used FROM blog_usage WHERE user_id=p_user AND day=p_day;
  IF v_used>=20 THEN RETURN jsonb_build_object('kind','quota'); END IF;
  UPDATE blog_usage SET used=used+1 WHERE user_id=p_user AND day=p_day;
  INSERT INTO blog_runs(user_id,request_id,conversation_id,fingerprint,question,day,status,lease_id,lease_until)
    VALUES(p_user,p_request,p_conversation,p_fingerprint,p_question,p_day,'running',p_lease,p_now+120000);
  RETURN jsonb_build_object('kind','started','token',jsonb_build_object('userId',p_user,'requestId',p_request,'leaseId',p_lease));
END;
$$;

CREATE OR REPLACE FUNCTION blog_budget(p_user text,p_request text,p_lease text,p_kind text,p_limit integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE r blog_runs%ROWTYPE; v_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user,0));
  SELECT * INTO r FROM blog_runs WHERE user_id=p_user AND request_id=p_request AND lease_id=p_lease AND status='running' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task is no longer active'; END IF;
  IF p_kind='model' THEN
    IF p_limit IS NULL OR p_limit<1 OR r.model_calls>=least(p_limit,4) THEN RAISE EXCEPTION 'Model budget exhausted'; END IF;
    v_count:=r.model_calls+1;
    UPDATE blog_runs SET model_calls=v_count WHERE user_id=p_user AND request_id=p_request;
    INSERT INTO blog_events(user_id,request_id,type,data) VALUES(p_user,p_request,'model_start',v_count::text);
  ELSIF p_kind='tool' THEN
    IF p_limit IS NULL OR p_limit<1 OR r.tool_calls>=least(p_limit,6) THEN RAISE EXCEPTION 'Tool budget exhausted'; END IF;
    v_count:=r.tool_calls+1;
    UPDATE blog_runs SET tool_calls=v_count WHERE user_id=p_user AND request_id=p_request;
  ELSE RAISE EXCEPTION 'Unknown budget';
  END IF;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION blog_mutate(p_user text,p_request text,p_lease text,p_operation text,p_type text,p_data text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE r blog_runs%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user,0));
  SELECT * INTO r FROM blog_runs WHERE user_id=p_user AND request_id=p_request AND lease_id=p_lease AND status='running' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task is no longer active'; END IF;
  IF p_operation='event' THEN
    INSERT INTO blog_events(user_id,request_id,type,data) VALUES(p_user,p_request,p_type,p_data);
  ELSIF p_operation='complete' THEN
    UPDATE blog_runs SET status='completed',result=p_data::jsonb WHERE user_id=p_user AND request_id=p_request;
  ELSIF p_operation='fail' THEN
    IF r.model_calls=0 THEN UPDATE blog_usage SET used=greatest(0,used-1) WHERE user_id=p_user AND day=r.day; END IF;
    UPDATE blog_runs SET status='failed' WHERE user_id=p_user AND request_id=p_request;
  ELSE RAISE EXCEPTION 'Unknown operation';
  END IF;
  RETURN true;
END;
$$;
COMMIT;
