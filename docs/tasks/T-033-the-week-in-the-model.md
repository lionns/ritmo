---
id: T-033
title: The week in the model — commitments, the reserve as an event, and no debt
status: done
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Give the week rules, ports and tests of its own — a commitment with a target and a reserve,
  a reserve spent as a recorded event rather than a decremented counter, and a close that carries
  nothing forward — against the tables that have sat empty in the schema since the first migration.
decisions: []
implements: [FR-7, FR-8, FR-9, FR-19]
---

## Sources

- **`D-030`**, which T-032 recorded on 2026-09-22 and which this task implements: Monday on the
  local calendar through `calendarDateOf`, the median of the last 4 closed weeks, a week that
  closes itself unlabelled, and `Commitment.unit`.
- `migrations/0001_initial_schema.sql` — `weeks` and `commitments` as declared. Read them before
  writing a new migration; the columns may already be right, or may not match T-032's answers.
- `core/rules/step.ts` — `calendarDateOf`, and the shape the rules in this repository take
- `core/rules/project.ts` — `countCappedActiveProjects`, which `FR-14`'s Monday rule will meet
- `core/ports/store.ts` — every query the core is allowed to ask for

## Scope

- `core/rules/week.ts` — opening a week, closing one, and reading the current one
- `core/rules/commitment.ts` — writing a commitment as target plus reserve, where the reserve is
  `ceil(0.30 x target)` with a minimum of 1 (`FR-7`), and spending a reserve as an event (`FR-8`)
- The port methods each needs, added to `core/ports/store.ts` and implemented in
  `adapters/sqlite/store.ts`
- A migration: `D-030` gives `Commitment` a `unit` column (`times` \| `minutes`) that
  `0001_initial_schema.sql` does not have, and without it neither the close nor `FR-10`'s proposal
  can read `target`. Check the rest of `weeks` and `commitments` against `data-model.md` while
  there.
- The self-closing week from `D-030` §3, and it must be idempotent — two opens of the app on a
  Monday must not close the week twice
- Unit tests in `test/core/`, integration tests in `test/integration/sqlite-store.test.ts`

## Out of Scope

- Contracts and API routes — T-034
- Any screen — T-035
- `FR-10`'s derivation of next week's targets. It is the hardest part and it belongs with the
  close, in T-034, once the model can say what a week actually held.
- Turning on `FR-14`'s Monday restriction. `hasClosedWeek` starts returning true as a consequence
  of this task, which is why T-035 must land close behind it.

## Acceptance Criteria

- [x] A commitment stores its target and its reserve, and refuses a target expressed as a clock
      slot (`FR-7` — "never a recurring clock slot")
- [x] Spending a reserve writes a row that can be read back, with no counter anywhere in the
      model that is silently decremented (`FR-8`)
- [x] Closing a week accepts the capacity label as the authoritative correction, applied
      retroactively, and never blocks on the inferred value (`FR-9`)
- [x] Nothing a closed week held appears in the week after it — no carried target, no shortfall,
      no counter (`FR-19`). There is a test that closes a week with work missing and asserts the
      next week opens empty.
- [x] `npm run check:core` stays clean: no `Date.now()`, no platform global, no SQL in `core/`

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, all green
- Task-specific: run every probe against a throwaway `RITMO_DB_PATH`. The owner's
  `data/ritmo.sqlite` holds weeks of real use and the product still has no export (`FR-21`).
- Task-specific: **stop the application before touching a real database.** Migrations apply on
  `openDatabase()`, with no separate command, so a running app migrates the live file the moment
  it serves a request. In T-031 this fired before the planned copy verification and defeated it.
  Confirm nothing is running, then migrate the copy, then the real file.
- Task-specific: after this lands, `hasClosedWeek` can return true for the first time. Confirm by
  hand what `/` and `/p/:id` do once it does, **before** T-035 exists — if the Monday restriction
  starts refusing state changes on a screen that offers no way to see the week, say so.

## Assumptions

- The `weeks` and `commitments` tables as declared in `0001` are a reasonable starting shape. They
  were written before the week was thought through and may not survive contact with T-032.

## Risks

- A migration cannot be rehearsed on a copy while the app is running, because opening the database
  is what applies it. Found in T-031's review. If this task adds a migration, that is the control
  that protects the owner's data, and it is procedural — nothing in the code enforces it.
- This task switches on a restriction (`FR-14`'s Monday) that has been dormant since the product
  began, from the model layer, with no screen able to explain it. The gap between this task and
  T-035 is the window where the owner can be refused an action for a reason nothing tells them.

## Outcome

- Changes: local-Monday week rules; transactional, idempotent self-close/open; immutable manual
  close with authoritative optional capacity label; commitments with units and reserve events.
- Files: `core/{model/entities,ports/store,rules/week,rules/commitment}.ts`, SQLite store,
  migration 0006, core week tests and three existing doubles, both integration suites; task,
  trace, journal and generated status (16 files).
- Baseline result: unit 55/55, integration 30/30, isolation, harness lint, typecheck, build green.
- Final result: unit 63/63, integration 36/36, isolation, typecheck, build green; 3 existing hints.
  Week tests also pass under America/Bogota and America/New_York, including DST boundaries.
- Migration: no application/live DB handle running; SQLite backup preserved at
  `/var/folders/v9/dgb9pgf91vsfnm0zyp8y5_6c0000gn/T/ritmo-t033-2rGeqa/before.sqlite`.
  Copy then live migration preserved every business row; integrity/FK checks clean.
  Both live week tables were and remain empty. Unitless populated legacy tables fail atomically.
- Decisions recorded: none; implements D-030. The older two-week formula in data-model.md
  conflicts with D-030/FR-10 but proposal derivation is wholly deferred to T-034.
- Follow-up: T-034 wires the app boundary to openWeek; T-035 must address the rotation gap below.
  No route or screen calls these new rules yet. Browser interaction remains for the Reviewer.

## Review

Reviewer: Claude Code, on work it did not write. Verified against the code, the live database and
the clock, not read off the trace.

- Medium · `core/rules/project.ts:175` · **`FR-14`'s Monday has never existed.** Any closed week
  refuses every state change, on Monday as much as on Thursday, while
  `ProjectMenu.astro:125` already tells the owner "Lo activo se cambia los lunes" — copy that
  promises what the rule does not do. Not this task's code; this task is what made it reachable.
  Raised by the implementer. **New task `T-041`**, per `D-029` §2: `T-035` owns the message, not
  the rule, so no `ready` task covered it.
- Medium · `docs/project/data-model.md:222` · **The spec contradicts itself about `FR-10`, and I
  caused it.** An owner-confirmed rule from 2026-08-30 derives the proposal from the reserve across
  two weeks, with its reasoning recorded and the percentage-band alternative explicitly rejected.
  `D-030` §2 replaced it with a median over four weeks without citing it, because I wrote `D-030`
  without reading this section. Flagged by the implementer, who correctly deferred rather than
  picking. Marked in place as unimplementable until the owner chooses (`D-029` reserves numbers
  with no evidence to them).
- Note · The migration's `NOT NULL` without a default is deliberate and correct: verified that
  SQLite accepts it on an empty table and refuses it on a populated one, which is exactly the
  "fail rather than guess a unit" the file claims.
- Note · The implementer stopped short of `done` and said the interactive check was outstanding.
  For a model-only task with no screen, the HTTP probe it ran is the check; closing it.

Verified independently: five gates green (unit 63/63, integration 36/36, isolation, typecheck 0
errors, build, lint clean); `weekStartsOn` correct at both edges of the week, across New Year, a
leap day and two timezones, and a DST week measures 169 hours rather than 168 — calendar
arithmetic, as the file claims; `weeks` has the `UNIQUE (owner_id, starts_on)` the upsert needs;
the owner's live database holds zero weeks and zero commitments, so nothing changes for them yet.

Approved.

## Validation

- Validated by: Claude Code, as Reviewer (`D-029`)
- Date: 2026-09-22
