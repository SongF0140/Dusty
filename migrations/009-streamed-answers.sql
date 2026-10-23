ALTER TABLE blog_queue ADD COLUMN IF NOT EXISTS partial_answer text NOT NULL DEFAULT '';
