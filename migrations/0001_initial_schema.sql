PRAGMA foreign_keys = ON;

CREATE TABLE owners (
  id TEXT PRIMARY KEY,
  active_cap INTEGER NOT NULL CHECK (active_cap > 0),
  cap_raises TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  label TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  sign_count INTEGER NOT NULL CHECK (sign_count >= 0),
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE TABLE areas (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  name TEXT NOT NULL,
  counts_against_cap INTEGER NOT NULL CHECK (counts_against_cap IN (0, 1))
);

CREATE TABLE objectives (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  area_id TEXT NOT NULL REFERENCES areas(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('learning', 'outcome')),
  horizon TEXT,
  why TEXT NOT NULL
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  label TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  area_id TEXT NOT NULL REFERENCES areas(id),
  objective_id TEXT REFERENCES objectives(id),
  title TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('active', 'shelved')),
  external_deadline TEXT,
  deadline_source TEXT,
  CHECK (external_deadline IS NULL OR deadline_source IS NOT NULL)
);

CREATE TABLE weeks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  starts_on TEXT NOT NULL,
  capacity_label TEXT CHECK (capacity_label IN ('light', 'normal', 'heavy')),
  tag_id TEXT REFERENCES tags(id),
  reflection TEXT,
  closed_at TEXT
);

CREATE TABLE next_actions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  act TEXT NOT NULL,
  obstacle TEXT,
  estimate_minutes INTEGER CHECK (estimate_minutes IS NULL OR estimate_minutes > 0),
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE UNIQUE INDEX one_open_next_action_per_project
  ON next_actions(project_id)
  WHERE closed_at IS NULL;

CREATE TABLE commitments (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  week_id TEXT NOT NULL REFERENCES weeks(id),
  target INTEGER NOT NULL CHECK (target > 0),
  proposed_target INTEGER CHECK (proposed_target IS NULL OR proposed_target > 0),
  reserve INTEGER NOT NULL CHECK (reserve >= 1),
  UNIQUE (project_id, week_id)
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  kind TEXT NOT NULL CHECK (kind IN ('progress', 'reserve_spend')),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  credits_objective_id TEXT REFERENCES objectives(id),
  occurred_at TEXT NOT NULL,
  what TEXT NOT NULL,
  effort_minutes INTEGER CHECK (effort_minutes IS NULL OR effort_minutes >= 0),
  note TEXT
);

CREATE INDEX entries_by_project_and_time ON entries(project_id, occurred_at);
