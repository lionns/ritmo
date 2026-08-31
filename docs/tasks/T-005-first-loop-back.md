---
id: T-005
title: The first loop, back half — read the portfolio, write an entry
status: ready
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

- [ ] WHEN `GET /api/portfolio` is called, THE SYSTEM SHALL return every active project of the
      seeded owner, each with its open next action and its recent entries, and SHALL place progress
      before outstanding work in the response shape itself (`FR-18`, `AC-G1`).
- [ ] WHEN `POST /api/entries` receives a valid entry, THE SYSTEM SHALL store it and return its id,
      and a following `GET /api/portfolio` SHALL show it.
- [ ] WHEN `POST /api/entries` names a project that does not exist or is shelved, THE SYSTEM SHALL
      reject it with a 4xx and a message naming the project, and SHALL write nothing.
- [ ] `effortMinutes` and `note` are optional: an entry carrying neither is accepted (`FR-4`).
- [ ] No response field is a streak, a consecutive-day count, a point, a badge or a debt (`AC-X4`,
      `NFR-7`), and consistency, where present, is a ratio over a period.
- [ ] WHEN a file under `src/pages/api/` imports from `core/` or `adapters/`, that is allowed; WHEN
      any `.astro` file does, THE SYSTEM SHALL fail `npm run check:core`.
- [ ] `npm run seed` populates a local D1 from empty and is safe to run twice.
- [ ] Integration tests drive both endpoints against a local D1 through the real adapter, including
      the rejection above.
- [ ] All five gates stay green from a clean `npm ci`, and `harness-lint` stays clean.

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

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- Severity · `file:line` · issue · impact · recommendation

## Validation

- Validated by:
- Date:
