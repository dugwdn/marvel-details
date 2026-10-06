-- Sign-in (ADR-008). People and their sessions. We keep the provider's id and
-- the first name it gives, never an email. Session tokens are stored hashed.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  sub TEXT NOT NULL,
  name TEXT NOT NULL,
  created INTEGER NOT NULL,
  UNIQUE (provider, sub)
);
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
