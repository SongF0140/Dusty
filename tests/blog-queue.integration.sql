BEGIN;
DO $$
DECLARE j jsonb; i integer;
BEGIN
 ASSERT blog_enqueue('queue-sql','A','queue-sql-c','a','2026-10-22','{}')='pending';
 j:=blog_claim('lease-A',1000); ASSERT j->>'requestId'='A';
 ASSERT blog_enqueue('queue-sql','B','queue-sql-c','b','2026-10-22','{}')='pending';
 ASSERT blog_enqueue('queue-sql','C','queue-sql-c','c','2026-10-22','{}')='pending';
 ASSERT blog_claim('no-preemption',1001) IS NULL;
 ASSERT blog_finish('queue-sql','A','wrong-lease','{}',NULL)=false;
 ASSERT blog_finish('queue-sql','A','lease-A','{}',NULL);
 j:=blog_claim('lease-C',1002); ASSERT j->>'requestId'='C';
 ASSERT blog_finish('queue-sql','C','lease-C','{}',NULL);
 j:=blog_claim('lease-B',1003); ASSERT j->>'requestId'='B';
 ASSERT blog_finish('queue-sql','B','lease-B','{}',NULL);
 ASSERT blog_enqueue('queue-sql','A','queue-sql-c','different','2026-10-22','{}')='conflict';
 ASSERT blog_enqueue('another-user','A','queue-sql-c','a','2026-10-22','{}')='forbidden';
 FOR i IN 1..5 LOOP
  ASSERT blog_enqueue('pool-'||i,'A','pool-c-'||i,'a','2026-10-22','{}')='pending';
 END LOOP;
 FOR i IN 1..4 LOOP ASSERT blog_claim('pool-lease-'||i,2000) IS NOT NULL; END LOOP;
 ASSERT blog_claim('pool-full',2001) IS NULL;
 -- Interrupted leases release slots without automatically rerunning the old model task.
 ASSERT blog_claim('pool-recovery',200000) IS NOT NULL;
 FOR i IN 1..20 LOOP
  ASSERT blog_enqueue('daily','r-'||i,'daily-c','hash-'||i,'2026-10-22','{}')='pending';
 END LOOP;
 ASSERT blog_enqueue('daily','over','daily-c','over','2026-10-22','{}')='quota';
END;
$$;
ROLLBACK;
