-- D-024: steps and a day list replace the if-then next action.
-- Additive on purpose. `next_actions`, its partial unique index and every reader of it stay
-- exactly as they are, so the running product is unchanged by this migration (T-018 § Out of
-- Scope). Dropping them is T-020, after the interface has moved.

CREATE TABLE steps (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id),
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  estimate_minutes INTEGER CHECK (estimate_minutes IS NULL OR estimate_minutes > 0),
  -- FR-22 forbids an hour, so the column is constrained to a calendar date and cannot hold one.
  marked_for TEXT CHECK (
    marked_for IS NULL
    OR marked_for GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  created_at TEXT NOT NULL,
  done_at TEXT,
  UNIQUE (id, owner_id),
  FOREIGN KEY (project_id, owner_id) REFERENCES projects(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX steps_open_by_project ON steps(project_id) WHERE done_at IS NULL;

CREATE INDEX steps_marked_by_day ON steps(owner_id, marked_for) WHERE marked_for IS NOT NULL;

-- The carry-across. Every OPEN next action becomes a step: `act` becomes the title, the estimate
-- and the creation time come along, and `trigger` and `obstacle` are dropped because D-024
-- overrides the research rule that was their only source. The step keeps the action's id --
-- separate tables, no collision -- so the origin stays readable without a mapping column.
-- Closed actions are FR-20's calibration history and stay where they are.
INSERT INTO steps
  (id, owner_id, project_id, title, estimate_minutes, marked_for, created_at, done_at)
SELECT id, owner_id, project_id, act, estimate_minutes, NULL, created_at, NULL
  FROM next_actions
 WHERE closed_at IS NULL;
