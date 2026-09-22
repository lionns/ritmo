---
id: T-031
title: The schema drops the next action it already replaced
status: ready
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Remove `next_actions` from the schema, so the database describes the product that exists
  rather than the one `D-024` replaced, and so the next person reading `0001_initial_schema.sql`
  is not misled about what Ritmo stores.
decisions: []
implements: [NFR-3]
---

## Sources

- `migrations/0001_initial_schema.sql` — where both tables are declared
- `migrations/0002_steps.sql` — its header says dropping `next_actions` "is T-020, after the
  interface has moved". T-020 and T-021 are both `done`; the drop never happened.
- `D-024` — steps and the day list replaced the if-then next action outright
- Verified 2026-09-22: `grep -rl next_actions core/ adapters/ src/` returns nothing. No rule, port,
  contract, route or component reads the table.

## Scope

- A new migration, numbered after `0004_entry_step.sql`, that drops `next_actions` along with any
  index or constraint declared against it in `0001_initial_schema.sql`
- Whatever `test/integration/sqlite-store.test.ts` asserts about the schema's shape
- `docs/project/data-model.md`, if it still lists either table

## Out of Scope

- `credentials` — `D-004` is still `accepted` and T-038 builds against it. It stays.
- `tags` — unread by any code today, but `FR-12` requires the owner to tag what took a week from
  tags they define, and T-034 fills it. It stays. Dropping it was this task's first draft and was
  wrong.
- `weeks` and `commitments` — unused today, but T-032…T-035 are the tasks that fill them. They stay.
- `objectives` — unused by any screen, but `FR-2` and `FR-3` still stand. It stays.
- Any change to what the product does. Nothing here is visible to the owner.

## Acceptance Criteria

- [ ] A fresh database built from `migrations/` contains no `next_actions` table
- [ ] An existing database migrates without error and keeps every row in `steps`, `entries`,
      `projects`, `areas` and `objectives`
- [ ] `_ritmo_migrations` records the new migration exactly once, and re-running is a no-op
- [ ] `grep -r next_actions migrations/ core/ adapters/ src/ contracts/` returns only the new
      migration's own `DROP` statement and historical commentary
- [ ] `tags` is still present and unchanged

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, all green
- Task-specific: **before running anything against a real database, copy it.** The product has no
  export yet (`FR-21` is unbuilt), so the owner's `data/ritmo.sqlite` is the only copy of weeks of
  real use. Run the migration first against a throwaway `RITMO_DB_PATH`, then against a *copy* of
  the real file, and compare row counts per table before and after.
- Task-specific: count the rows in `next_actions` in the owner's database before dropping.
  `0002_steps.sql` carried the open actions across into `steps`; if `next_actions` holds rows that
  never made that trip, stop and report rather than dropping them.

## Assumptions

- The carry-across in `0002_steps.sql` moved everything that mattered out of `next_actions`. This
  is an assumption until the row count above confirms it.

## Risks

- Dropping a table is not reversible by another migration. The copy named in Verification is the
  only thing standing between a mistake here and the owner's real history.

## Outcome

Filled in as the task progresses; overwritten, not appended.

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- Severity · `file:line` · issue · impact · recommendation

## Validation

`team` only — required before `done`, and linted.

- Validated by:
- Date:
