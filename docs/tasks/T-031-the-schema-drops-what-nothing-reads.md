---
id: T-031
title: The schema drops the next action it already replaced
status: done
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Remove `next_actions` from the schema, so the database describes the product that exists
  rather than the one `D-024` replaced, and so the next person reading `0001_initial_schema.sql`
  is not misled about what Ritmo stores.
decisions: [D-028]
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

- [x] A fresh database built from `migrations/` contains no `next_actions` table
- [x] An existing database migrates without error and keeps every row in `steps`, `entries`,
      `projects`, `areas` and `objectives`
- [x] `_ritmo_migrations` records the new migration exactly once, and re-running is a no-op
- [x] No reader outside `migrations/` names `next_actions` — enforced by the guard test at
      `test/core/page-layout.test.ts:334`. (Amended 2026-09-22: as first written this criterion
      asked `grep` to find only commentary, which no ordered upgrade can satisfy — 0001's
      `CREATE TABLE` and 0002's `SELECT` are executable SQL that must stay. The Planner wrote it
      wrong; the implementer was right to leave it unchecked rather than rewrite history.)
- [x] `tags` is still present and unchanged

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

- The carry-across left one closed action unmatched. The owner confirmed on 2026-09-22 that
  these are disposable test data; D-028 resolves the stop condition and retention requirement.

## Risks

- Dropping a table is not reversible by another migration. The copy named in Verification is the
  only thing standing between a mistake here and the owner's real history.

## Outcome

- Changes: migration 0005 drops the retired table and its indexes/constraints; schema tests
  verify fresh creation, upgrade preservation and idempotency; data model records D-028.
- Files: migration, integration test, data model, D-028, task, backend trace, journal,
  generated status and decision index (9 files).
- Backup: `data/ritmo-T-031-before-20260922T141909.sqlite`; SQLite backup API, integrity `ok`.
- Evidence: before drop, 5 actions (1 unmatched closed). Afterward all surviving rows equal
  the original backup: 8 steps, 6 entries, 4 projects, 4 areas, 0 objectives, 0 tags, 1 owner.
  Credentials, commitments and weeks also unchanged. Synthetic upgrade includes nonempty
  objectives, tags, weeks and commitments and an entry pointing at the carried step.
- Verification: fresh `RITMO_DB_PATH`, original-backup copy and local DB pass integrity,
  foreign-key, full-row preservation, ledger-once and repeat-apply checks.
- Operational deviation: the local DB already recorded 0005 at 19:23:12.983Z UTC before the
  planned copy probe; likely the running app applied it automatically. A probe failed with
  `no such table: next_actions` on the newer snapshot. Repeated with the original pre-drop
  backup successfully; the local DB's surviving rows exactly match that original backup.
- Baseline and final: unit 55/55, isolation, typecheck, build, integration 26/26 green;
  3 pre-existing typecheck hints. Regenerated records; harness lint and diff whitespace pass.
- Decisions recorded: D-028, owner's authorization to discard the legacy test rows.
- Follow-up: independent Claude `/code-review` and owner validation remain required.

## Review

Reviewer: Claude Code, on work it did not write. Findings re-verified against the databases and
the gates, not read off the trace.

- Medium · `adapters/sqlite/store.ts` · Migrations apply on `openDatabase()`, so this task's
  "run it against a copy first" control cannot hold while the app is running: the live database
  recorded 0005 at 19:23:12.983Z before the copy probe. No harm here — a pre-drop backup existed
  and the live database matches it row for row — but the safeguard was illusory, and **T-040
  carries months of records to another vendor under the same procedure**. T-040 and T-033 need an
  explicit stop-the-app step, or a runner that can be held off by environment variable.
- Low · `migrations/0005_drop_next_actions.sql:3` · `DROP TABLE` without `IF EXISTS`. The ledger
  normally prevents a second apply and I could not construct a path that reaches the statement
  with the table already gone, so this is hardening, not a defect.
- Low · `docs/project/data-model.md` § Retired: NextAction · The rewrite silently corrects a false
  claim: the old note called the five rows "the evidence the decision rests on", and the owner
  says they were test data. `D-024` rests on the owner's report after weeks of use, not on those
  rows. The old sentence was the Planner's overclaim; worth one line so nobody re-derives it from
  `git log`.
- Low · `data/` · Three 176k working backups left behind, gitignored and uncommitted. Keep
  `ritmo-T-031-before-20260922T141909.sqlite` until the owner validates; the other two are scratch.
- **Not a defect · the fourth acceptance criterion is unsatisfiable as written**, and the Planner
  wrote it. 0001's `CREATE TABLE` and 0002's `SELECT ... FROM next_actions` are executable SQL that
  ordered upgrades require. Leaving the box unchecked and saying why was correct; rewriting history
  to make it tick would not have been. Amend it to "no reader outside `migrations/`", which
  `test/core/page-layout.test.ts:334` already enforces.

Verified independently: five gates green; all ten surviving tables byte-identical between
`data/ritmo.sqlite` and the pre-drop backup, `PRAGMA foreign_key_check` empty, ledger records 0005
once; the blocker was real — 5 actions, the 4 open ones each with a matching step, 1 closed with
none; `tags` present and unchanged.

Approved. The Medium finding is a change to T-040 and T-033, not to this work.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-22
