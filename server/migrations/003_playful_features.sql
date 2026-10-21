ALTER TABLE checkins ADD COLUMN IF NOT EXISTS fun_answers JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS predicted_at TIMESTAMPTZ;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS manager_note TEXT;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS oracle_lines JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS reset_source TEXT NOT NULL DEFAULT 'curated';

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS image_key TEXT;

CREATE TABLE IF NOT EXISTS daily_challenges (
  local_date DATE PRIMARY KEY,
  prompt TEXT NOT NULL,
  image_key TEXT,
  source TEXT NOT NULL DEFAULT 'curated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS image_requests (
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, challenge_date)
);
