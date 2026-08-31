---
id: T-005
title: The first loop, back half — read the portfolio, write an entry
status: done
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Give the front two endpoints and the contracts behind them, so a real portfolio can be read
  and a real progress entry written, and seed enough data that there is something to look at.
decisions: [D-001, D-002, D-009, D-011]
implements: [FR-4, FR-18]
---

## Sources

- `docs/project/data-model.md` § Entities, § Derived values — `Entry`, and what is never stored
- `docs/project/architecture.md` § Backend, § Layout — the three layers and where each file goes
- `docs/project/requirements.json` — `FR-4`, `FR-18`, `NFR-1`, `NFR-7` · `acceptance-criteria.json`
  `AC-G1`, `AC-X4`
- `docs/tasks/T-001-skeleton-and-next-action.md` — the store, ports and rule this extends

## Scope

- `core/ports/store.ts` — add what the loop needs: create and read an `Owner` and an `Area`, create
  an `Entry`, list a owner's active projects, and read recent entries for a set of projects.
- `core/rules/portfolio.ts` — assemble the landing view: each active project with its open next
  action and what moved on it recently, ordered so progress comes before anything outstanding.
- `core/rules/entry.ts` — the write path of `FR-4`. Rejects an entry against a project that does
  not exist or is shelved; `effortMinutes` and `note` stay optional.
- `adapters/d1/store.ts` — the D1 side of the new port methods.
- `contracts/` — the request and response types for both endpoints, and nothing else.
- `src/pages/api/portfolio.ts` and `src/pages/api/entries.ts` — `GET` and `POST`.
- `scripts/seed-local.mjs` plus an `npm` script: one owner, two or three areas, a handful of
  projects with next actions and a fortnight of entries, applied to the local D1.

## Out of Scope

- **Identity.** No passkey, no session, no cookie. The owner is seeded and the endpoints trust the
  local environment. `D-004` still stands; this runs on `wrangler dev` and is not deployed until it
  is built. Say so in the seed script's output.
- **The interface.** `T-006` builds it. Nothing here renders HTML beyond what `T-001` left.
- **Commitments, weeks, objectives, tags and credentials.** Their tables exist; nothing reads or
  writes them yet. The weekly cycle is a later task.
- **Editing or deleting an entry.** The log only grows here.

## Acceptance Criteria

- [x] WHEN `GET /api/portfolio` is called, THE SYSTEM SHALL return every active project of the
      seeded owner, each with its open next action and its recent entries, and SHALL place progress
      before outstanding work in the response shape itself (`FR-18`, `AC-G1`).
- [x] WHEN `POST /api/entries` receives a valid entry, THE SYSTEM SHALL store it and return its id,
      and a following `GET /api/portfolio` SHALL show it.
- [x] WHEN `POST /api/entries` names a project that does not exist or is shelved, THE SYSTEM SHALL
      reject it with a 4xx and a message naming the project, and SHALL write nothing.
- [x] `effortMinutes` and `note` are optional: an entry carrying neither is accepted (`FR-4`).
- [x] No response field is a streak, a consecutive-day count, a point, a badge or a debt (`AC-X4`,
      `NFR-7`), and consistency, where present, is a ratio over a period.
- [x] WHEN a file under `src/pages/api/` imports from `core/` or `adapters/`, that is allowed; WHEN
      any `.astro` file does, THE SYSTEM SHALL fail `npm run check:core`.
- [x] `npm run seed` populates a local D1 from empty and is safe to run twice.
- [x] Integration tests drive both endpoints against a local D1 through the real adapter, including
      the rejection above.
- [x] All five gates stay green from a clean `npm ci`, and `harness-lint` stays clean.

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build`, then
  `npm run test:integration` and `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset && npm run seed`, then `wrangler dev` and a real `GET` and `POST`
  against the running worker — not only the test harness.

## Assumptions

- **The seeded owner stands in for authentication**, which is why this cannot be deployed. Labelled
  here and in the seed output rather than left for someone to discover.
- **Recent meant fourteen days, and that was wrong.** Chosen by the assistant against the mobile
  chart without checking the desktop one in the same handoff, which asks for 28. Corrected in review;
  the number stays a constant in one place.

## Risks
 
- The portfolio response is the first contract the front depends on. Getting its shape wrong is
  cheap now and expensive after `T-006`; prefer the shape the design already implies.
- `D-001` gives each render 10 ms of CPU. One query per project would not survive a real portfolio;
  read entries for all projects in one query.

## Outcome

- Changes: the portfolio read and the entry write, end to end — two rules, the store methods behind them, the D1 adapter, `contracts/`, two endpoints, and a seed that serves every state the front has to render.
- Files: 20 across core, adapters, contracts, endpoints, the seed, tests, the task and its two traces, plus the generated records.
- Baseline result: unit 7/7, isolation, typecheck, build, integration 2/2, `harness-lint` clean.
- Final result: green from a clean `npm ci` — unit 9/9, isolation, typecheck 0 errors across both passes, build, integration 3/3, `harness-lint` clean at 648/650. Verified on a running worker, not only the harness: 200, 201, the entry appearing on the next read, 422 naming the project on both rejection paths, and 200 with `nextAction: null` after closing an action.
- Decisions recorded: none.
- Follow-up: none from this task. `T-006` consumes this contract and renders the null next action.
## Review

- The loop works against a running worker: `GET /api/portfolio` 200 · `POST /api/entries` 201 and the next read shows it · an entry with neither `effortMinutes` nor `note` comes back with both `null` · a missing and a shelved project each return 422 naming it. `FR-18` lives in the response shape, and the integration suite asserts the serialised order of `progress` before `outstanding`.
- The High is closed against the probe that opened it: closing an open next action returns **200** with that project at `nextAction: null`, the others untouched and `POST` still 201, where it had been 500 for the whole surface. The three Lows are closed — one `IN (…)` query for areas, `getOwner(id)` with the single-owner assumption moved to `adapters/local-owner.ts` and imported by the seed, the tests and both endpoints, and a seed serving all three states the front must build.
- The window Medium is closed, and both traps with it. `RECENT_PROGRESS_DAYS` is 28. The seeded entries now sit at days 0, 1, 2, 3, 7, 8, 16, 19, 24 and 27 — six inside fourteen days and four in the 15-to-27 band — so a broken 14/28 slice in `T-006` would be visible on screen rather than invisible. And the exclusion boundary is computed from the constant: one entry a millisecond outside is excluded, one a millisecond inside is kept. It no longer pins a date that a changed window would quietly invalidate.
- Regression after widening the window: all three states survive — a project with an action, one with `nextAction: null`, and one still in `outstanding` with no recent entries. Widening the window could have collapsed that last one and did not.
- Assessment: no finding remains at any severity. Nine acceptance criteria pass, five gates green from a clean `npm ci` with unit 9/9 and integration 3/3. Recommended for owner validation and closure; `T-006` can consume this contract.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-08-31
