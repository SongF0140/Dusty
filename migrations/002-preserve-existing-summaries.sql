-- Current state per article. Initial descriptions are preserved verbatim.
-- Existing blog_summary_cache data is intentionally left untouched.
CREATE TABLE IF NOT EXISTS blog_post_summaries (
  post_id text PRIMARY KEY,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  summary text NOT NULL,
  source text NOT NULL CHECK (source IN ('manual','model')),
  model text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source='manual' OR length(summary) BETWEEN 1 AND 240)
);
