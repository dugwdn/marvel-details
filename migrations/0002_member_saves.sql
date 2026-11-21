-- Member perks sync (ADR-008): one JSON blob per signed-in person holding
-- their saved list, seen movies, favorite characters, found details, rank and
-- spoiler setting. Keyed by users.id from 0001_accounts.sql. The API refuses
-- anything over 16 KB. Deleting the account deletes this row too.
CREATE TABLE IF NOT EXISTS saves (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data    TEXT NOT NULL,
  updated INTEGER NOT NULL
);
