-- Member accounts for Marvel Details (D1 database "marvel-details-members").
-- We keep only Google's account number (sub) and the first name. No email.

CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub  TEXT NOT NULL UNIQUE,
  first_name  TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,           -- ms since 1970
  last_seen   INTEGER NOT NULL
);

-- id is the SHA-256 of the random token in the visitor's cookie.
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires_at);

-- One JSON blob per person (saved list, seen movies, favorites, found
-- details, settings). The API refuses anything over 16 KB.
CREATE TABLE IF NOT EXISTS saves (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);
