-- Apply to the Neon database before enabling model summaries in Vercel builds.
CREATE TABLE IF NOT EXISTS blog_summary_cache (
  post_id text NOT NULL,
  fingerprint text NOT NULL,
  summary text NOT NULL CHECK (length(summary) BETWEEN 1 AND 240),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id,fingerprint)
);
