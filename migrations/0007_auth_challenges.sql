-- Sessions remain stateless; only one-use ceremonies and abuse counters persist.
CREATE TABLE auth_challenges (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'login')),
  expires_at INTEGER NOT NULL
);
CREATE INDEX auth_challenges_expiry ON auth_challenges(expires_at);
CREATE TABLE auth_attempts (
  owner_id TEXT PRIMARY KEY REFERENCES owners(id),
  window INTEGER NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0)
);
