---
id: T-005
title: The first loop, back half — read the portfolio, write an entry
status: review
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

- Changes: portfolio read/write paths, nullable next-action contract, batched area reads,
  id-addressed local owner lookup, representative idempotent seed data, and focused coverage.
- Files: 19 implementation, contract, test and task-record files.
- Baseline result: unit 7/7, isolation, typecheck, build, integration 2/2, harness lint clean.
- Final result: clean `npm ci`; unit 9/9, isolation/typecheck/build, integration 3/3; real Worker
  returns an actionless active project with `nextAction: null`, and GET/POST/GET stays green; seed
  from empty and second run green.
- Decisions recorded: none.
- Follow-up: independent re-review of the corrections, owner validation, then T-006 can consume the
  contracts and render the nullable-action prompt.

## Review

- The loop works, verified against a running worker rather than the harness alone: `GET /api/portfolio` 200 · `POST /api/entries` 201 and the next `GET` shows it · an entry with neither `effortMinutes` nor `note` comes back with both `null` · a missing and a shelved project each return 422 naming it. `FR-18` lives in the response shape, and `d1-store.test.ts` asserts the serialised order of `progress` before `outstanding`.
- The High is closed against the probe that opened it. Closing an open next action now returns **200** with that project degraded to `nextAction: null`; the other projects are untouched and `POST /api/entries` still answers 201. It was 500 for the whole surface. The three Lows are closed too: areas come back in one `IN (…)` query, `getOwner(id)` takes an id with the single-owner assumption moved to `adapters/local-owner.ts` — imported by the seed, the tests and both endpoints, so there is one source of truth — and the seed now serves all three states the front must build: a project with an action, one with `nextAction: null`, and one sitting in `outstanding`.
- Medium · `core/rules/portfolio.ts:5` · `RECENT_PROGRESS_DAYS = 14`, so the response cannot feed the desktop hero chart · `design-handoff.md:129` and `T-006`'s own criterion both call for **28 marks at desktop widths and 14 below 768px**, and 14 days of entries can only draw half of it — the front would have to pad with fabricated empties or silently render a shorter chart than the design specifies · **this is my planning error, not the implementation's**: the assumption in this task says fourteen days *matching the mobile chart*, and I wrote it without checking it against the desktop figure in the same handoff · return 28 and let `T-006` slice to 14 below the breakpoint; at personal scale the extra rows cost nothing, and the assumption in this file is already corrected. Two traps, both of which would let the fix ship unnoticed: the seed's entries all land within 13 days, so a 28-day window renders **identical data at both breakpoints** and a broken slice in `T-006` would be invisible — seed entries in the 15-to-27 day band. And `first-loop.test.ts:23` pins the exclusion boundary to a hardcoded date that a 28-day window puts *inside* the window; express the boundary against the constant and keep it proving what it proves — one entry just outside excluded, one just inside kept.
- Assessment: everything asked for is done and probed. One Medium remains and belongs to the same class as the High — a contract that cannot serve the screen that consumes it — so it lands before `T-006` starts, for the same reason.

## Validation

- Validated by:
- Date:
