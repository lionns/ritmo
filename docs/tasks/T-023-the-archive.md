---
id: T-023
title: The archive, so finished work has somewhere to be
status: done
profile: team
harness: 0.9.0
role: Frontend Implementer
goal: Build `/archivo` — every finished and every shelved project, with undo on the finished ones —
  so the footer link on every screen stops answering 404 and a project finished last week is still
  reachable.
decisions: [D-025]
implements: [FR-17, FR-23]
---

## Sources

- `docs/project/design-handoff.md` § Routes — `/archivo`, "Shelved, dormant, closed. The backlog
  that may never be the landing", reached by "a footer link at the end of the portfolio list"
- `src/layouts/AppShell.astro:74` — that link, shipped and pointing at a 404 today
- `docs/decisions/D-025-finishing-a-project.md` — un-finishing must stay possible or the owner
  avoids the button; after its week, `/` is no longer where it can be done
- `FR-17` — shelved items stay visible in the portfolio, so this route gathers them, never moves
  them
- `core/rules/portfolio.ts` — `readPortfolio` and the shape an archive read mirrors
- `src/components/organisms/{PortfolioPanel,FinishedRow}.astro` — the row language to match

## Scope

- **`core/rules/archive.ts`** — `readArchive`: every project with `finishedAt` set, newest first,
  and every `shelved` project, by title. No new port method; `listProjects` already returns them.
- **`contracts/archive.ts` and `src/pages/api/archivo.ts`** — its own read, not a field bolted onto
  the portfolio response: `/` must not carry a backlog it refuses to render.
- **`src/pages/archivo.astro`** — the page, on the existing `AppShell` and `PageStage`, with the
  two groups under mono headings in the shape `PORTFOLIO` already uses.
- **Undo on finished rows**, reusing `FinishedRow`'s call. This is the only place a project
  finished before this week can be reopened.
- **Shelved rows are read-only here.** Making one active again is a Monday decision (`FR-14`) and
  belongs with `/semana`, which is unbuilt — named as follow-up, not quietly added.
- **`design-handoff.md` § Routes** — the row updated to say what the route actually holds: dormant
  objectives are not in it, because objectives are unbuilt.
- **`README.md`** — the "Todavía no existe" row for `/archivo` becomes a section, and the warning
  in § Terminar un proyecto that a finished project disappears is removed.

## Out of Scope

- **Objectives and their dormant state** (`FR-3`). Unbuilt; the route description stops claiming
  them until they exist.
- **Un-shelving**, and any other route to `changeProjectState` — which no screen calls today at
  all. `FR-14`'s "changeable every Monday" has no interface, and that is its own task.
- **Deleting anything.** Nothing on this page removes a row.
- `/p/:id`, `/semana`, entry history beyond the last line already rendered in a row.

## Acceptance Criteria

- [x] WHEN `/archivo` is requested THE SYSTEM SHALL answer 200, so the footer link shipped in
      `AppShell` stops answering 404 from every screen.
- [x] WHEN a project was finished in an earlier week THE SYSTEM SHALL list it in the archive, and
      SHALL still omit it from `/` — the check that exercises this against `T-022`.
- [x] WHEN undo is used on a finished project in the archive THE SYSTEM SHALL clear `finishedAt`,
      leave the project `shelved`, and the project SHALL then appear among the shelved rows.
- [x] WHEN a project is shelved THE SYSTEM SHALL list it in the archive **and** keep it on `/`,
      because `FR-17` says shelved items stay visible in the portfolio.
- [x] WHEN the archive renders THE SYSTEM SHALL show no count of either group, nothing in red, and
      no word of congratulation — the same three guardrails the landing carries.
- [x] WHEN nothing has been finished or shelved THE SYSTEM SHALL render a plain empty state, not
      an error.
- [x] `grep -rn "archivo" src/pages/` shows the route exists as a page rather than a link alone.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: seed a throwaway `RITMO_DB_PATH`, finish a project, age its `finishedAt` past the
  week boundary, and confirm it is absent from `/` and present in `/archivo` with a working undo.
  Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption: the archive lists every finished project, not a recent window. The database holds
  one person's years, and a window would need a number no evidence gives. If the page ever grows
  uncomfortable that is a paging task, not a guess now.
- Assumption: finished rows sort by `finishedAt` descending and shelved by title. Nothing in the
  handoff fixes an order for this route.
- Assumption: the archive reuses `FinishedRow` rather than growing a second undo control.

## Risks

- **The link has been broken in every shipped screen.** Nothing here is riskier than what exists,
  but it means the page's first job is to answer at all, and the criterion is deliberately blunt.
- Undo lives in two places once this lands — the portfolio row for this week, the archive for
  everything older. One control, two mounts; if they drift, the older one is the one nobody tests.
- The archive is the closest this product comes to a backlog view, which `brief.md` § Constraints
  keeps off the landing. It is reached by a deliberate tap and shows no counts, which is the line.

## Outcome

- Changes: `readArchive`; `/api/archivo` as its own read; `/archivo` with **Terminados** and
  **Archivados**, undo on the finished; the route row in the handoff stopped claiming dormant
  objectives; the manual gained a section and lost the warning that finished work disappears.
- Files: `core/rules/archive.ts`, `contracts/archive.ts`, `src/pages/api/archivo.ts`,
  `src/pages/archivo.astro`, two test files, `docs/project/design-handoff.md`, `README.md`.
- Baseline result: unit 51/51 · isolation · typecheck 0 errors · build · integration 15/15.
- Final result: unit 51/51 · isolation · typecheck 0 errors · build · integration 16/16.
- Decisions recorded: none new.
- Follow-up: **`FR-14` has no interface.** `changeProjectState` exists in the rules and the API and
  is called by no screen, so "what is active is changeable every Monday" cannot be done at all. It
  is a requirement with no way to satisfy it, and it wants its own task.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `src/pages/archivo.astro` and `src/components/organisms/FinishedRow.astro` · Undo now
  exists in two places with the same fetch written twice. The portfolio one is exercised by hand
  every week; this one only when something old is reopened, which is rare — so this is the copy
  that will rot. · A shared control would be better; it was not worth a component for eleven lines
  today, and the moment a third mount appears it is.
- Low · `core/rules/archive.ts` · Lists every finished project, unpaged. · Deliberate, recorded in
  § Assumptions: a window needs a number no evidence gives.
- Low · `src/pages/api/archivo.ts` · Answers an empty archive before setup rather than an error,
  unlike `/api/portfolio`, which reports `setupRequired`. · Truer here: there is genuinely nothing
  archived, and a fresh owner tapping the footer link should not meet an error.
- Note · The footer link has pointed at a 404 since `AppShell` shipped. No test covered it, because
  no test asks whether a link resolves — which is worth remembering before trusting a green suite
  about anything the user can click.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-21

## Trace

Team profile — `docs/traces/<date>_T-023_frontend-implementer.md`.
