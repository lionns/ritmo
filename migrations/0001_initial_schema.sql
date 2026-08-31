-- Editable only until the first remote apply; use `npm run db:reset` to rebuild local D1 state.
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
  counts_against_cap INTEGER NOT NULL CHECK (counts_against_cap IN (0, 1)),
  UNIQUE (id, owner_id)
);

CREATE TABLE objectives (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  area_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('learning', 'outcome')),
  horizon TEXT,
  why TEXT NOT NULL,
  UNIQUE (id, owner_id),
  FOREIGN KEY (area_id, owner_id) REFERENCES areas(id, owner_id)
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  label TEXT NOT NULL,
  UNIQUE (id, owner_id)
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  area_id TEXT NOT NULL,
  objective_id TEXT,
  title TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('active', 'shelved')),
  external_deadline TEXT,
  deadline_source TEXT,
  CHECK (external_deadline IS NULL OR deadline_source IS NOT NULL),
  UNIQUE (id, owner_id),
  FOREIGN KEY (area_id, owner_id) REFERENCES areas(id, owner_id),
  FOREIGN KEY (objective_id, owner_id) REFERENCES objectives(id, owner_id)
);

CREATE TABLE weeks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  starts_on TEXT NOT NULL,
  capacity_label TEXT CHECK (capacity_label IN ('light', 'normal', 'heavy')),
  tag_id TEXT,
  reflection TEXT,
  closed_at TEXT,
  UNIQUE (id, owner_id),
  FOREIGN KEY (tag_id, owner_id) REFERENCES tags(id, owner_id)
);

CREATE TABLE next_actions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  project_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  act TEXT NOT NULL,
  obstacle TEXT,
  estimate_minutes INTEGER CHECK (estimate_minutes IS NULL OR estimate_minutes > 0),
  created_at TEXT NOT NULL,
  closed_at TEXT,
  UNIQUE (id, owner_id),
  FOREIGN KEY (project_id, owner_id) REFERENCES projects(id, owner_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX one_open_next_action_per_project
  ON next_actions(project_id)
  WHERE closed_at IS NULL;

CREATE TABLE commitments (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  project_id TEXT NOT NULL,
  week_id TEXT NOT NULL,
  target INTEGER NOT NULL CHECK (target > 0),
  proposed_target INTEGER CHECK (proposed_target IS NULL OR proposed_target > 0),
  reserve INTEGER NOT NULL CHECK (reserve >= 1),
  UNIQUE (project_id, week_id),
  FOREIGN KEY (project_id, owner_id) REFERENCES projects(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY (week_id, owner_id) REFERENCES weeks(id, owner_id)
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  kind TEXT NOT NULL CHECK (kind IN ('progress', 'reserve_spend')),
  project_id TEXT NOT NULL,
  credits_objective_id TEXT,
  occurred_at TEXT NOT NULL,
  what TEXT NOT NULL,
  effort_minutes INTEGER CHECK (effort_minutes IS NULL OR effort_minutes >= 0),
  note TEXT,
  FOREIGN KEY (project_id, owner_id) REFERENCES projects(id, owner_id) ON DELETE RESTRICT,
  FOREIGN KEY (credits_objective_id, owner_id) REFERENCES objectives(id, owner_id)
);

CREATE INDEX entries_by_project_and_time ON entries(project_id, occurred_at);
