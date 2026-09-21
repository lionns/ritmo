---
id: T-018
title: Steps in the model, beside the next action
status: done
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Give `Step` a table, a port, rules and tests, and carry the owner's open next actions across
  into it — additively, leaving `next_actions` and everything that reads it untouched, so the
  running product stays green while the interface catches up in later tasks.
decisions: [D-024]
implements: [FR-6, FR-22]
---

## Sources

- `docs/project/data-model.md` § Step — the table this builds, and § Validation rules for the two
  rules that replaced the retired one-open-action invariant
- `docs/project/data-model.md` § Data lifecycle — "Day rollover": a `markedFor` that is not today
  is dead, nothing counts what went undone, and clearing it is not an event
- `docs/decisions/D-024-steps-and-the-day-list.md` — what was traded and why
- `migrations/0001_initial_schema.sql:75` — `next_actions`, and the partial unique index at `:89`
  that enforced the invariant `D-024` retired
- `adapters/sqlite/database.ts` — the migration ledger: `.sql` files apply in name order the next
  time the database is opened, including the owner's own
- `core/rules/next-action.ts` and `core/ports/store.ts:24` — the shape the step rules mirror
- `docs/project/quality-gates.md` — the five gates

## Scope

- **`migrations/0002_steps.sql`, additive only.** Creates `steps`, mirroring the `Step` table:
  `id`, `owner_id`, `project_id`, `title`, `estimate_minutes`, `marked_for`, `created_at`,
  `done_at`, with the same compound foreign key and cascade `next_actions` uses.
- **The carry-across.** Every next action with `closed_at IS NULL` becomes a step: `act` → `title`,
  `estimate_minutes` and `created_at` carried, `trigger` and `obstacle` dropped per `D-024`. The
  step **keeps the action's id** — different table, no collision, and it makes the origin readable
  without a mapping column. Closed actions are not carried: they are `FR-20` history and stay where
  they are.
- **Nothing is dropped.** `next_actions`, its partial unique index and every reader of it stay
  exactly as they are. Removing them is `T-020`, after the interface has moved.
- **`core/model/entities.ts`** — the `Step` interface.
- **`core/ports/store.ts`** — reads and writes for steps, including one that returns a project's
  open steps and one that returns what is marked for a given date.
- **`core/rules/step.ts`** — write a step; mark one for a date; unmark; mark done. Enforces: only a
  step of an `active` project may be marked · a step carries at most one `markedFor` at a time ·
  a `markedFor` is read only when it equals the date being asked for · no cap on how many are
  marked, `Owner.activeCap` being the only one (`FR-22`, `FR-13`).
- **`adapters/sqlite/store.ts`** — the implementation behind the port.
- **Tests.** Unit tests for the rules against the fake store, in the shape `test/core/` already
  uses. One integration case that opens a database holding next actions, applies the migration, and
  asserts the carry-across landed — the check that exercises this change against what exists.

## Out of Scope

- **The API and the interface.** No file under `src/` or `contracts/`. `/api/next-actions` keeps
  working against `next_actions` exactly as today; the product behaves identically after this task.
- **Dropping `next_actions`**, its index, its rules, its contracts or its tests (`T-020`).
- **The day surface on `/`** and the step list inside the project (`T-019`).
- **Down-migrations.** The project has no rollback mechanism and this task does not invent one; the
  migration is additive, which is what makes that acceptable.
- Objectives, commitments, `/semana`, calibration.

## Acceptance Criteria

- [x] WHEN `0002_steps.sql` is applied to a database holding one open and one closed next action
      THE SYSTEM SHALL create exactly one step, carrying the open action's `act`, `estimate_minutes`
      and `created_at`, under that action's own id.
- [x] WHEN the migration is applied twice THE SYSTEM SHALL leave the second run a no-op, because
      the ledger in `adapters/sqlite/database.ts` records it by name.
- [x] WHEN a step is marked for a date and its project is not `active` THE SYSTEM SHALL reject the
      mark naming the project.
- [x] WHEN a step already marked for one date is marked for another THE SYSTEM SHALL replace the
      mark rather than hold two.
- [x] WHEN steps marked for yesterday are read for today THE SYSTEM SHALL return none of them, and
      SHALL report no count of what went unmarked or undone.
- [x] WHEN more steps are marked for one day than `Owner.activeCap` THE SYSTEM SHALL allow it: the
      cap is on active projects, not on marks (`FR-22`).
- [x] `next_actions` still holds every row it held before, its partial unique index still exists,
      and `npm run test:integration` still exercises the next-action path green — the product's
      current behaviour is unchanged by this task.
- [x] `npm run check:core` stays clean: no platform global, no `Env`, nothing outside `core/`
      reaching in.
- [x] The five gates are green, and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, all green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: apply the migration to a **copy** of a seeded database (`npm run seed` against
  `RITMO_DB_PATH`, never `data/ritmo.sqlite`) and read `steps` and `next_actions` side by side.

## Assumptions

- Assumption: the step keeps the id of the action it came from. Rests on them being separate tables
  with separate primary keys; it costs nothing and makes the origin traceable without a column.
- Assumption: closed next actions are not carried across. Rests on `FR-20`, which calibrates
  against history — moving it would either duplicate it or orphan it.
- Assumption: `marked_for` is a date string, not a timestamp, because `FR-22` forbids an hour.

## Risks

- **This migration runs against the owner's real database** the next time they open the app — the
  ledger applies it on `openDatabase`, with no separate command. It only adds a table and copies
  rows, and `D-019` is explicit that copying a live SQLite file is not a backup: a real backup is
  `VACUUM INTO` against a stopped server, before the first run.
- Two tables describe the same work until `T-020`. The window is deliberate and is what keeps every
  task green, but a write landing in the wrong one during it would be invisible. Only
  `next_actions` is written until the interface moves.
- `estimate_minutes` carries a `CHECK` in `0001`; the new table must carry the same one or the
  constraint silently weakens on the way across.

## Outcome

- Changes: `steps` created and every open next action carried across under its own id; `Step` in
  the model; six reads and writes on the port and in the SQLite adapter; `core/rules/step.ts` with
  write, mark, unmark, complete and the one day-list read; ten new test cases.
- Files: `migrations/0002_steps.sql`, `core/model/entities.ts`, `core/ports/store.ts`,
  `core/rules/step.ts`, `adapters/sqlite/store.ts`, `test/core/step.test.ts`,
  `test/integration/sqlite-store.test.ts`, `test/core/{next-action,project,first-loop}.test.ts`.
- Baseline result: unit 45/45 · isolation · typecheck 0 errors · build · integration 7/7.
- Final result: unit 53/53 · isolation · typecheck 0 errors · build · integration 9/9.
- Decisions recorded: none new; `D-024` implemented.
- Follow-up: `T-019` the interface — the step list inside the project and the day mark on `/`;
  `T-020` removes `next_actions` and everything that reads it, once nothing does.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `test/integration/sqlite-store.test.ts:463` · An existing assertion was changed: the
  migration ledger now expects two rows. It is a consequence of adding a migration, not a
  weakening — the test still asserts the exact set, and would fail on a third. · Named here because
  editing an existing check to reach green is otherwise a defect.
- Low · `migrations/0002_steps.sql` · The partial unique index on `next_actions` is left standing
  and is proven only behaviourally, by the next-action tests that still pass, not by schema
  introspection. · It is dropped with the table in `T-020`; asserting it now would test SQLite.
- Low · `core/rules/step.ts` · Nothing caps how many steps a project holds, so "the next stretch,
  never the whole project" lives in the interface and in `brief.md`, not in a rule. · A store-level
  cap would be a number invented without evidence; `§10` gives none.
- Note · Two tables now describe the same work. Only `next_actions` is written until `T-019`, and
  `steps` has no reader at all, so the window cannot diverge in this task.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-21

## Trace

Team profile — `docs/traces/<date>_T-018_backend-implementer.md`.
