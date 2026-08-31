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
- **Recent means the last fourteen days**, matching the mobile hero chart in `design-handoff.md`.
  Chosen by the assistant; the number is a constant in one place, not scattered.

## Risks
 
- The portfolio response is the first contract the front depends on. Getting its shape wrong is
  cheap now and expensive after `T-006`; prefer the shape the design already implies.
- `D-001` gives each render 10 ms of CPU. One query per project would not survive a real portfolio;
  read entries for all projects in one query.

## Outcome

- Changes: portfolio read rule and contract, progress-entry write rule and contract, D1 methods,
  two Astro API endpoints, idempotent local seed data, and core/integration coverage.
- Files: 17 implementation, contract, test and task-record files.
- Baseline result: unit 7/7, isolation, typecheck, build, integration 2/2, harness lint clean.
- Final result: clean `npm ci`; unit 9/9, isolation/typecheck/build, integration 3/3; real Worker
  GET/POST/GET and shelved rejection green; seed from empty and second run green.
- Decisions recorded: none.
- Follow-up: independent Claude review, owner validation, then T-006 can consume the contracts.

## Review

- Verified against a running worker, not only the harness: `GET /api/portfolio` 200 · `POST /api/entries` 201 with the id, and the next `GET` shows it · an entry with neither `effortMinutes` nor `note` is accepted and comes back with both `null` · a missing project and a shelved project each return 422 naming the project · `check:core` green. `FR-18` lives in the shape — `progress` and `outstanding` are separate arrays, and `d1-store.test.ts:77` asserts the serialised order, so the front cannot render backlog first by restyling.
- High · `core/rules/portfolio.ts:88` · closing a next action takes the whole landing surface down · verified on the running worker: closing the open action of one active project made `GET /api/portfolio` return **500 `Portfolio could not be read`** — not a degraded card, the entire response, so the other projects and the log form go with it · reachability, stated exactly: no endpoint closes an action today, so this cannot be triggered over HTTP yet — but `closeNextAction` exists in the store and the rule, the index enforces at most one open action and never at least one, and the first button anyone adds for `US-4` lands straight on it, with no way back through the product · make `nextAction` nullable in the contract and let `T-006` render a prompt to write one; forcing a replacement at close time would mean you cannot close an action until you know the next one, which is the opposite of what the product is for.
- Low · `core/rules/portfolio.ts:40` · areas are read one query per area while entries and open actions are batched · `D-001` gives each render 10 ms of CPU and the risk this task recorded named only the entries case · add a `readAreas(areaIds)` and read them in one.
- Low · `scripts/seed-local.mjs` · every seeded active project has recent entries, so `outstanding` is always empty · both test suites cover that branch, but the seed is what `T-006` will develop against, and a branch nobody ever sees on screen gets built blind · seed one quiet project, and one active project with no open next action, so both states the front must render exist on screen.
- Low · `core/ports/store.ts:5` · `getOwner()` takes no id, so the single owner is now in the port rather than only in the data · `NFR-3` asks that a second party be additive; this is the one place it would not be.
- Assessment: the loop works and the contract is well shaped. The High must be fixed before `T-006` starts — this task's own risk says getting the response shape wrong is cheap now and expensive after the front consumes it, and this is exactly that.

## Validation

- Validated by:
- Date:
