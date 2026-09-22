-- D-025: finishing a project is a timestamp, not a third state.
--
-- `state` carries CHECK (state IN ('active', 'shelved')) and SQLite cannot alter a CHECK without
-- rebuilding the table — which, with entries, steps, commitments and next_actions all pointing at
-- projects, would mean disabling foreign keys inside a migration the runner executes in a
-- transaction. A column costs one statement and copies nothing. It also says the truer thing:
-- `state` is the commitment, `finished_at` is the outcome, and the two are independent.

ALTER TABLE projects ADD COLUMN finished_at TEXT;

CREATE INDEX projects_unfinished ON projects(owner_id, state) WHERE finished_at IS NULL;
