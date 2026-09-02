---
id: T-012
title: Capture — your own areas, your own projects, and a cap you answered
status: review
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Let the owner start from an empty database and enter their real portfolio from inside the
  product — the bad-week cap, the areas, the projects — so that Ritmo stops being seeded fixtures
  and becomes the owner's own, which is the last thing between it and daily use.
decisions: [D-019, D-021]
implements: [US-1, US-2, FR-1, FR-13, FR-15, FR-17]
---

## Sources

- `docs/project/user-stories.json` — `US-1` and `US-2`, whose criteria are the acceptance criteria
  here almost verbatim, including the three copy rules
- `docs/project/requirements.json` — `FR-13` (asked, never shipped), `FR-1`, `FR-15`, `FR-17`
- `docs/project/data-model.md` § Owner, § Area, § Project — the fields, and line 230: `Project.state`
  transitions only on a week boundary
- `docs/project/design-handoff.md` § Navigation Map — `/ajustes` already carries "Capacity cap
  (US-1), areas". No section draws setup, `/ajustes`, or creating a project
- `src/pages/api/entries.ts:23` — the 503 an empty database produces today

## Scope

- `docs/project/design-handoff.md` — write **§ Setup and Capture**. Three screens have now been
  built from a table row or an artboard alone (`T-006`, `T-008`, `T-010`); an unwritten screen gets
  invented twice. Cover the first-run question, the area and project forms, and `/`'s empty state.
- **First run.** An empty database has no `owners` row, so `/` and `/registrar` answer 503 today.
  First run asks the bad-week number, creates the owner with it as `activeCap`, and nothing ships a
  default. The question names a bad week, not an average one (`US-1`).
- `/ajustes` — the cap and the areas, which is what § Navigation Map already assigns it. An area
  carries a name and `countsAgainstCap`; the fixed job is the area where that is false (`FR-15`).
- `/` — its empty state is where the first project is created, and the affordance stays afterwards.
  No new route: the map's six were settled with the owner on 2026-08-30.
- `core/rules/project.ts` — the cap rule, and the only place it lives. A project created while the
  capped areas are full is created `shelved`, and the count is shown plainly (`US-2`).
- `core/ports/store.ts` and `adapters/sqlite/store.ts` — the methods capture needs and the port
  lacks: update the owner's cap, list areas, list projects including shelved, set a project's state.
- `contracts/` and `src/pages/api/` — the request and response types, and the endpoints.
- Coverage in `test/core/` for the cap rule, and in `test/integration/` for the round trip from an
  empty database to a portfolio with one area and one project.

## Out of Scope

- **Objectives.** `Project.objectiveId` is nullable by an owner decision of 2026-08-30, so projects
  are created without one. `FR-2` and `FR-3` are their own task.
- **`FR-16`'s external deadline.** `externalDeadline` and `deadlineSource` need copy that keeps
  self-imposed dates out, which is a design problem rather than a field.
- **`FR-14`'s weekly rotation.** Changing what is active after the fact belongs to `/semana`; see
  Assumptions for the one narrow exception this task takes.
- **Editing or deleting an area or a project.** Creation and the cap only. Renaming is not what
  stands between the owner and daily use.
- **The next-action cycle.** Closing an action and writing its replacement is the task after this
  one and the other half of daily use. Nothing here writes a `NextAction`.
- **Removing the seed.** `npm run seed` stays for tests and demos; this task makes it optional
  rather than deleting it.

## Acceptance Criteria

- [x] WHEN `npm run db:reset` is run with no seed and `/` is opened, THE SYSTEM SHALL ask the
      bad-week question rather than answering 503, and SHALL NOT offer a pre-filled number.
- [x] WHEN the owner answers it, THE SYSTEM SHALL create the `owners` row with that `activeCap` and
      record nothing in `capRaises`, and `/` SHALL then render an empty portfolio.
- [x] WHEN a project is created and the areas that count against the cap already hold `activeCap`
      active projects, THE SYSTEM SHALL create it `shelved` and state the count plainly.
- [x] WHEN a project is created in an area whose `countsAgainstCap` is false, THE SYSTEM SHALL
      create it `active` regardless of the cap (`FR-15`).
- [x] Shelved projects render in the portfolio rather than disappearing (`FR-17`), and no copy added
      by this task softens, congratulates or apologises for the number (`US-2`, `NFR-7`).
- [x] `grep -rn "seedId\|LOCAL_OWNER_ID" src/` returns nothing: the product no longer depends on
      seeded identifiers to function.
- [x] `npm run check:core` stays green, and the cap rule is covered in `test/core/` without a
      database.
- [x] All five gates green from a clean `npm ci`, and `node scripts/harness-lint.mjs` clean.

## Verification

- Baseline: the five gates of `quality-gates.md`, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset` **without** `npm run seed`, then `npm run dev` — answer the
  cap question, create one uncapped area and one capped one, create projects until the cap is
  exceeded, and confirm the extra one is shelved and still visible.
- Task-specific: with that database, write an entry through `/registrar` against a project the
  owner created, and read `/` — the first loop still works on data that was never seeded.

## Assumptions

- **State is settable until the first week is closed.** `FR-14` fixes the active set within a week
  and `data-model.md:230` says transitions happen on a week boundary — but at setup no week exists
  to be fixed within, and a cap answered before the projects are entered will be wrong on the first
  try. So a project's state may change while the owner has no closed week, and is locked to the
  boundary afterwards. **Labelled because it is a reading of `FR-14`, not a quote of it**; if the
  owner disagrees, that is a handoff change before implementation, not a judgement during it.
- **`capRaises` stays empty here.** `data-model.md` § Owner says each raise is recorded with a date
  and that the record is itself the signal. The first answer is not a raise.

## Risks

- **Without the exception above, a wrong first answer is unrecoverable** until `/semana` exists —
  the owner would enter projects, watch some land shelved, and have no way back. That is the whole
  reason the assumption is taken rather than deferred.
- **This is the first screen the canvas never drew at all.** `/entrar` at least had a row in the
  navigation map; creating a project has neither a row nor an artboard, which is why § Setup and
  Capture is scope rather than documentation.
- **The cap is a refusal, and refusals are where copy goes wrong.** `US-2` forbids softening and
  `NFR-7` forbids debt language. Stating a limit plainly while sounding like neither a scold nor an
  apology is the hard part of this task, and it is not a detail.

## Outcome

- Changes: empty-database setup; owner-derived API identity; cap and area settings; capped and
  uncapped project capture; pre-first-week state changes; visible shelved projects; empty state.
- Files: store port/SQLite adapter, project and portfolio rules, capture/portfolio contracts, four
  API surfaces, setup/settings/project UI, design handoff, unit and real-SQLite integration tests.
- Baseline result: 29/29 unit, isolation, harness lint, typecheck 0, Node build, integration 6/6.
- Final result: 33/33 unit, isolation, typecheck 0, Node build, integration 7/7; identifier grep and
  diff check clean. Built HTTP flow passed on a throwaway empty database through setup, two area
  types, capped overflow, shelved rendering, and a progress entry. No controllable browser was
  available, so visual interaction remains for owner validation.
- Decisions recorded: none; implementation follows D-019 and D-021.
- Follow-up: owner validation. The two Medium and the Low are routed to the `/semana` task, which
  is where `FR-14`'s week boundary gets built and where they become reachable; none is fixable here
  without deciding whether `FR-14` governs creation. Next in sequence is the next-action cycle.

## Review

- 2026-09-02 · Reviewer, round 1 · five gates re-run here: unit 33/33, isolation, typecheck 0
  errors, Node build, integration 7/7, `harness-lint` clean. Reviewed from an empty database rather
  than from the diff, because that is what the task promises: `db:reset` with no seed, then the
  built server. `/` asked the bad-week question with no `value` and no numeric placeholder, a second
  `POST /api/setup` returned 409, two areas and three projects against a cap of 2 produced
  `active (1/2)`, `active (2/2)`, `shelved (2/2)`, a project in the uncapped area came back active
  (`FR-15`), and an entry against an owner-created project moved today's mark from 9px `empty` to
  104px `timed`. Shelved projects render in an `ARCHIVADOS` section with their area. The copy is a
  count and nothing else — no softening, congratulation or apology (`US-2`, `NFR-7`). The
  `seedId|LOCAL_OWNER_ID` grep is empty and `npm run seed` still works, as § Out of Scope required.
  The cap rule's tests bind: mutating `>=` and then dropping `countsAgainstCap` each fail exactly
  one test. § Setup and Capture is written and matches what was built.
- Medium · `core/rules/project.ts` · the `FR-14` guard is one-sided. `changeProjectState` checks
  `hasClosedWeek`, but `createProjectWithinCap` and `updateActiveCap` do not · verified live with a
  week row closed by hand: raising the cap from 3 to 5 and creating a project returned it `active`,
  so the active set changed inside a week `FR-14` says is fixed. The task's assumption covered state
  *changes* only, so this does not deviate from the plan — but a reader sees a guard and infers the
  boundary is enforced · **not reachable today**, since nothing in the product closes a week ·
  routed to the `/semana` task, which must settle whether `FR-14` governs creation as well.
- Medium · `core/rules/project.ts:102` · after the first closed week the cap can only rise.
  `updateActiveCap` refuses a cap below the active count, lowering that count needs shelving, and
  shelving is blocked once a week has closed · so the cap becomes monotonically non-decreasing,
  which `FR-13` contradicts when it asks that the cap be audited against stale rate, and it is the
  same trap the task's own assumption was written to avoid. `capRaises` recording only raises is
  consistent with the asymmetry · also latent, and also `/semana`'s to settle.
- Low · refusing to lower the cap at all is undocumented — neither § Setup and Capture nor this task
  states it, so an owner who over-answers the first question has no written path back.
- **Recommended for owner validation.** Both Medium are design gaps to close before `/semana`
  exists, not defects in what was built.

## Validation

- Validated by:
- Date:
