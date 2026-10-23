BEGIN;
INSERT INTO blog_post_summaries(post_id,content_hash,summary,source) VALUES
('ai-engineering/01-用-agent-sdk-构建-ai-应用','fc8cb0dfd73a5641b639797af55b2dbefdd7b9fa0afed3b3a0d0e6920ededb55','Preserve original human description','manual'),
('ai-engineering/02-从零构建-ai-聊天应用','1ba9267fdf5f83e023d5ccfaa5ca76134f79f31f21d906aeb2290702ca262de1','Keep generated summary','model'),
('ai-engineering/03-多智能体研究助理拆解','ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff','Later human baseline','manual');
\ir ../migrations/006-align-initial-summary-baselines.sql
DO $$ BEGIN
 ASSERT (SELECT content_hash='493c600b9dca4c0e775b91033ef97e26a3b4952b58d12af4b50de79542fecff1' AND summary='Preserve original human description' AND source='manual' FROM blog_post_summaries WHERE post_id='ai-engineering/01-用-agent-sdk-构建-ai-应用');
 ASSERT (SELECT content_hash='1ba9267fdf5f83e023d5ccfaa5ca76134f79f31f21d906aeb2290702ca262de1' AND summary='Keep generated summary' AND source='model' FROM blog_post_summaries WHERE post_id='ai-engineering/02-从零构建-ai-聊天应用');
 ASSERT (SELECT content_hash='ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' AND summary='Later human baseline' FROM blog_post_summaries WHERE post_id='ai-engineering/03-多智能体研究助理拆解');
END $$;
\ir ../migrations/006-align-initial-summary-baselines.sql
ROLLBACK;
