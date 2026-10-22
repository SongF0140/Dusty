CREATE TABLE IF NOT EXISTS blog_queue (
 seq bigserial UNIQUE, user_id text NOT NULL, request_id text NOT NULL,
 conversation_id text NOT NULL REFERENCES blog_conversations(id), fingerprint text NOT NULL,
 day text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending',
 lease_id text, lease_until bigint, result jsonb, error text,
 PRIMARY KEY(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS blog_queue_pending ON blog_queue(seq DESC) WHERE status='pending';
CREATE UNIQUE INDEX IF NOT EXISTS blog_queue_one_running ON blog_queue(user_id) WHERE status='running';

CREATE OR REPLACE FUNCTION blog_enqueue(p_user text,p_request text,p_conversation text,p_fingerprint text,p_day text,p_payload jsonb)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE r blog_queue%ROWTYPE; v_owner text; v_used integer; v_waiting integer;
BEGIN
 PERFORM pg_advisory_xact_lock(778899332211::bigint);
 SELECT * INTO r FROM blog_queue WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN
  IF r.fingerprint<>p_fingerprint THEN RETURN 'conflict'; END IF;
  RETURN r.status;
 END IF;
 INSERT INTO blog_conversations VALUES(p_conversation,p_user) ON CONFLICT DO NOTHING;
 SELECT user_id INTO v_owner FROM blog_conversations WHERE id=p_conversation;
 IF v_owner<>p_user THEN RETURN 'forbidden'; END IF;
 SELECT coalesce((SELECT used FROM blog_usage WHERE user_id=p_user AND day=p_day),0) INTO v_used;
 SELECT count(*) INTO v_waiting FROM blog_queue q WHERE q.user_id=p_user AND q.day=p_day AND
  (q.status='pending' OR (q.status='running' AND NOT EXISTS(SELECT 1 FROM blog_runs run_row WHERE run_row.user_id=p_user AND run_row.request_id=q.request_id)));
 IF v_used+v_waiting>=20 THEN RETURN 'quota'; END IF;
 INSERT INTO blog_queue(user_id,request_id,conversation_id,fingerprint,day,payload) VALUES(p_user,p_request,p_conversation,p_fingerprint,p_day,p_payload);
 RETURN 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION blog_claim(p_lease text,p_now bigint)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE r blog_queue%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(778899332211::bigint);
 UPDATE blog_queue SET status='failed',error='任务已中断，请重新发送。' WHERE status='running' AND lease_until<=p_now;
 IF (SELECT count(*) FROM blog_queue WHERE status='running')>=4 THEN RETURN NULL; END IF;
 SELECT * INTO r FROM blog_queue q WHERE q.status='pending' AND NOT EXISTS
  (SELECT 1 FROM blog_queue running WHERE running.user_id=q.user_id AND running.status='running')
  ORDER BY q.seq DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE blog_queue SET status='running',lease_id=p_lease,lease_until=p_now+130000 WHERE user_id=r.user_id AND request_id=r.request_id;
 RETURN jsonb_build_object('userId',r.user_id,'requestId',r.request_id,'payload',r.payload,'leaseId',p_lease);
END;
$$;

CREATE OR REPLACE FUNCTION blog_finish(p_user text,p_request text,p_lease text,p_result jsonb,p_error text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
 UPDATE blog_queue SET status=CASE WHEN p_error IS NULL THEN 'completed' ELSE 'failed' END,result=p_result,error=p_error
 WHERE user_id=p_user AND request_id=p_request AND lease_id=p_lease AND status='running';
 RETURN FOUND;
END;
$$;
