---
id: T-012
title: Capture — your own areas, your own projects, and a cap you answered
status: done
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

- Changes: empty-database setup; owner-derived identity; cap, area and project capture; capped
  shelving; shared right-panel bounds; visible shelved projects; corrected first-run display copy.
- Files: store port/SQLite adapter, project and portfolio rules, capture/portfolio contracts, four
  API surfaces, setup/settings/project UI, design handoff, unit and real-SQLite integration tests.
- Baseline result: 29/29 unit, isolation, harness lint, typecheck 0, Node build, integration 6/6.
- Final result, re-run at close: 33/33 unit, isolation, typecheck 0, Node build, integration 7/7,
  lint clean. The flow re-verified on a throwaway `RITMO_DB_PATH` database — setup, both area types,
  capped overflow, shelved rendering, and an entry moving the mark 9px `empty` → 104px `timed`. The
  owner's own file was never touched.
- Decisions recorded: none; implementation follows `D-019` and `D-021`.
- Follow-up: none here. Two `FR-14` findings and the undocumented cap floor are routed to `/semana`;
  one nit stays open on the positional bound. The next-action cycle is next, and is the other half
  of daily use.

## Review

- 2026-09-02 · Reviewer, round 1 · five gates green. Reviewed from an empty database rather than
  from the diff: the question carried no `value`, a second `POST /api/setup` returned 409, three
  projects against a cap of 2 gave active/active/shelved, the uncapped area stayed active (`FR-15`),
  shelved rendered in `ARCHIVADOS`, and the copy was a count and nothing else (`US-2`, `NFR-7`). The
  cap rule's tests bind: mutating `>=` and dropping `countsAgainstCap` each fail one test.
- Medium · `core/rules/project.ts` · the `FR-14` guard is one-sided — `changeProjectState` checks
  `hasClosedWeek`, `createProjectWithinCap` and `updateActiveCap` do not. Verified with a week
  closed by hand: raising the cap 3→5 and creating a project returned it `active`, inside a week
  `FR-14` calls fixed. The task's assumption covered state *changes* only, so this does not deviate
  from the plan, but a reader infers the boundary is enforced · **not reachable today** · routed to
  `/semana`, which must settle whether `FR-14` governs creation too.
- Medium · `core/rules/project.ts:102` · after the first closed week the cap can only rise, since
  lowering it needs shelving and shelving is then blocked, against `FR-13`'s audit · also latent,
  also `/semana`'s. Low · that refusal is undocumented, so over-answering has no path back.
- 2026-09-02 · **Owner validation, round 1 — two visual findings from real use, neither reachable by
  any gate; both surfaced by entering actual areas.**
- Medium · `SettingsPanel.astro:11` · the panel grew with every area and walked off the stage ·
  `PortfolioPanel` carried the bound and this one carried nothing, so the rule § Responsive
  Behavior already states was on one panel of four · **closed in round 2**.
- Medium · `index.astro:46` · the first-run headline was the whole question, sixty characters in a
  `clamp(76px, 9.2vw, 132px)` display face · **the planner's, not the implementer's**: § Setup and
  Capture said the headline *is* the question and Codex built what was written · owner settled “Una
  semana mala.” with the question below; `US-1` holds because the pair is the question and the field
  label repeats the frame · **closed in round 2**, § Setup and Capture corrected with the reasoning.
- 2026-09-02 · Reviewer, round 2 · five gates re-run: unit 33/33, isolation, typecheck 0 errors,
  build, integration 7/7, lint clean. Both closed, and Codex took the better of the two shapes
  offered: the bound moved into `PageStage` as one rule rather than three classes repeated per
  panel, so all four are covered and `PortfolioPanel` shed its own copy. Verified structurally
  rather than from a screenshot — parsed the rendered `<main>` on all three routes and
  `:nth-child(2)` lands on the portfolio, the settings panel and the entry form respectively, and
  the compiled rule sits in `@media (width>=75rem)`, matching `--breakpoint-xl`, so nothing moved at
  the breakpoint. The tests moved with the implementation instead of being dropped, `doesNotMatch`
  guards included.
- Nit · `PageStage.astro:35` · `:nth-child(2)` is positional and the child count already varies —
  `/` has two, `/ajustes` and `/registrar` three, because Astro inlines a `<script>`. Correct on all
  three today; a reordering would move it silently. Every panel carries `glass-panel`, so
  `> :global(.glass-panel)` would be robust and say what it means.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-02
