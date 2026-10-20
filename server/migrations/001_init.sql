CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sign_in_links (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sign_in_links_email_created_idx ON sign_in_links(email, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS checkins (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  energy SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 10),
  focus SMALLINT NOT NULL CHECK (focus BETWEEN 1 AND 10),
  pressure SMALLINT NOT NULL CHECK (pressure BETWEEN 1 AND 10),
  note VARCHAR(500) NOT NULL DEFAULT '',
  reset_title TEXT NOT NULL,
  reset_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, local_date)
);
CREATE INDEX IF NOT EXISTS checkins_user_created_idx ON checkins(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS submissions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  response VARCHAR(400) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);
CREATE INDEX IF NOT EXISTS submissions_date_idx ON submissions(challenge_date, created_at DESC);

CREATE TABLE IF NOT EXISTS reactions (
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, submission_id)
);
