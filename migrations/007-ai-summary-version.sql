-- Existing descriptions remain available until a valid AI summary replaces them.
ALTER TABLE blog_post_summaries ADD COLUMN IF NOT EXISTS summary_version text;
