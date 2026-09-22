-- D-027: effort is attributed to a step when the entry is written, not derived from a window.
--
-- D-024 replaced one open next action per project with a list, so the window the actual was
-- derived from (`createdAt`..`closedAt`) now overlaps and the same minutes counted in full toward
-- every step open at the time. Reading backwards is closed off by FR-22 — a past `marked_for` is
-- never read — so the attribution happens while the mark is alive and is stored.
--
-- Additive. No existing row is rewritten: nothing knows which step the entries already in the
-- database belonged to, and inventing it is what this decision refuses.

ALTER TABLE entries ADD COLUMN step_id TEXT REFERENCES steps(id);

CREATE INDEX entries_by_step ON entries(step_id) WHERE step_id IS NOT NULL;
