---
id: T-024
title: The project screen, and a row that goes back to reading
status: done
profile: team
harness: 0.9.0
role: Frontend Implementer
goal: Build `/p/:id` — one project, its steps, its history, its ending and a log form inline — and
  take the disclosure back out of every portfolio row, so the landing returns to the four elements
  the approved canvas drew.
decisions: [D-024, D-025]
implements: [FR-6, FR-22, FR-23, NFR-1]
---

## Sources

- `docs/project/design-handoff.md` § Routes — `/p/:id`: "History, the full step list, dormant
  state, log form inline", reached by "Tapping a project"
- `docs/project/design-handoff.md` § The Project Row `:220` — the row links to `/registrar` today
  *because this route does not exist*, and the disclosure was added beside it for the same reason
- `docs/project/architecture.md:108` — the same route, same description
- `research.md` §12 — attention residue: working inside one project at a time is the rule that
  argued for the day view, applied to a screen
- `NFR-1` — under 20 seconds from opening the app to a saved entry; today two taps, and this task
  must not make it three
- `src/components/organisms/{StepList,FinishedRow,EntryForm}.astro` — what moves
- The design canvas approved by the owner on 2026-09-21,
  `https://claude.ai/artifact/DWF9g1gc1EaZuAMBTjs3tJ` — three artboards: the screen on desktop and
  on mobile, and the portfolio row after the disclosure leaves it. The log form sits first in both,
  the step list is plain rows rather than a disclosure, and finishing sits last, quiet, below a
  rule. Approved as drawn

## Scope

- **`GET /api/project/[id]`** and `contracts/project.ts`: the project, its area, every open step
  with `markedFor`, `finishedAt`, `today`, and its recent entries.
- **A port read for a project's history.** `readRecentEntries` is bounded to the portfolio's
  28-day window; the project screen needs further back, with a bound of its own.
- **`src/pages/p/[id].astro`.** In order: the project, **the log form first and inline** so two
  taps stay two, then the step list, then the history, then finishing.
- **The step list moves here** — mark for today, unmark, done, write another — from `StepList`.
- **Finishing moves here**, with undo, from `FinishedRow` and the step disclosure. `/archivo`
  keeps its own undo for projects finished before this week.
- **The portfolio row goes back to reading.** `ProjectCard` loses the disclosure and the finished
  row; the four elements remain and the whole row links to `/p/:id`.
- **`design-handoff.md`** § The Project Row rewritten to say the row is a link and nothing else,
  and § Routes updated for what `/p/:id` now holds.
- **`/api/archivo` renamed `/api/archive`.** Page routes are Spanish and API routes are English;
  `T-023` broke that and this fixes it before anything depends on it.
- **`README.md`** — a section for the project screen, and `/p/:id` out of "Todavía no existe".

## Out of Scope

- **Shelving and activating** (`FR-14`'s missing interface). Still its own task, and putting it
  here would make this one two.
- **Objectives and dormant state.** The route table names them for `/p/:id`; objectives are
  unbuilt, so the row will say so rather than claim them.
- Editing a project's title, area or deadline. Creation stays in `/ajustes`.
- Deleting entries or steps. Nothing on this page removes history.
- `/registrar` keeps working unchanged, including its project select.

## Acceptance Criteria

- [x] WHEN a project row on `/` is tapped THE SYSTEM SHALL open `/p/:id`, and the rendered
      portfolio SHALL contain no `<details>` and no step form — the row is a link and nothing else.
- [x] WHEN `/p/:id` renders THE SYSTEM SHALL place the log form before the step list and the
      history in document order, so a saved entry is still two taps from opening the app (`NFR-1`).
- [x] WHEN an entry is saved from `/p/:id` THE SYSTEM SHALL record it against that project without
      asking which project it belongs to.
- [x] WHEN a step is marked for today from `/p/:id` THE SYSTEM SHALL show it on the portfolio row
      on the next load — the check that exercises this screen against the landing.
- [x] WHEN a project is finished from `/p/:id` THE SYSTEM SHALL free its cap slot and the row on
      `/` SHALL read "Terminado" for the rest of that week.
- [x] WHEN `/p/:id` is requested for an id that does not exist THE SYSTEM SHALL answer 404 rather
      than an empty screen.
- [x] WHEN the history renders THE SYSTEM SHALL show entries newest first with no count of them,
      nothing in red, and no streak.
- [x] `grep -rn "api/archivo" src/ test/` returns nothing.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: seed a throwaway `RITMO_DB_PATH`, then walk it — tap a project from `/`, log from
  the screen, mark a step, finish it, and check the row. Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption: history is bounded to the most recent entries rather than the whole log. A page that
  renders years on every open contradicts `NFR-2`'s fast first render, and no requirement asks for
  the full history on this screen. The bound is a number this task picks and records.
- Assumption: the row on `/` keeps rendering today's steps. They are what the owner chose this
  morning, and moving them to the project screen would empty the landing of its point.
- Assumption: `/p/:id` uses the id in the path, as the route table writes it, not a query string.

## Risks

- **`NFR-1` is what this task can break.** Two taps must stay two taps, and the only guard is
  document order — a log form pushed below the history would pass every test and fail the product.
- Undo will exist on `/p/:id` and `/archivo`. `T-023` § Review already named the duplication; if
  this task leaves it duplicated a third time it should become a shared control instead.
- The portfolio row loses controls people have been using for a day. Nothing is lost — it all
  moved one tap away — but the first open after this will feel like something disappeared.

## Outcome

- Changes: `/p/:id` with the log form inline and first, the step list, the history and finishing;
  `/api/project/[id]` and a bounded history read; the portfolio row reduced to four elements and a
  link; `StepList` and `FinishedRow` deleted; `/api/archivo` renamed `/api/archive`; the handoff
  row rewritten, the manual given a section, two screenshots retaken.
- Files: `core/{ports/store,rules/project-detail}.ts`, `adapters/sqlite/store.ts`,
  `contracts/project.ts`, `src/pages/p/[id].astro`, `src/pages/api/project/[id].ts`,
  `src/components/organisms/{ProjectPanel,EntryForm}.astro`,
  `src/components/molecules/ProjectCard.astro`, three test files, `design-handoff.md`,
  `README.md`, `docs/images/{02-portfolio,05-proyecto}.jpg`.
- Baseline result: unit 51/51 · isolation · typecheck 0 errors · build · integration 16/16.
- Final result: unit 51/51 · isolation · typecheck 0 errors · build · integration 18/18.
- Decisions recorded: none new. The design was approved on a canvas rather than in a decision file:
  it settles a layout, not a rule, and `design-handoff.md` is where it lands.
- Follow-up: **`FR-14` still has no interface** — `changeProjectState` is called by no screen, so
  "what is active is changeable every Monday" cannot be done. `T-023` named it; it is now the
  oldest unbuilt thing the product promises.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `src/pages/p/[id].astro` · The layout was wrong twice and **no test caught either
  time**: the panels overflowed the stage, then the log form's save button sat below the fold.
  Both passed the whole suite. `NFR-1` is a claim about what a person can reach, and the only
  thing that found it was screenshotting the built page against the approved canvas. · The
  acceptance criterion tests document order because that is what is testable; it is not the same
  as the requirement, and a validator should know the gap is real.
- Low · `src/pages/p/[id].astro` · The way back first shipped inline beside the area name, which
  reads as metadata rather than as an exit, and broke the pattern every other page keeps — its own
  line under the intro. Caught by the owner on review, not by me or a test. · The area became a
  mono eyebrow beside the marks, which buys the line back; a fourth page wanting this block should
  make it a component rather than copy it.
- Low · `src/components/organisms/EntryForm.astro` · Two new props, `showContext` and `compact`,
  both existing only for this screen. · One form with two callers beats two forms; if a third
  caller needs a third flag, it has become a layout the component should not be deciding.
- Low · `src/pages/p/[id].astro` · A scoped `@media` block bounds the left column the way
  `PageStage` bounds its own direct children. · The stage's rule only reaches direct children and
  this column holds a title above a panel; if a second page needs this, it belongs in `PageStage`.
- Note · Undo now lives on `/p/:id` and `/archivo`, the same duplication `T-023` § Review named —
  `FinishedRow` is gone, so it is still two mounts, not three. The line it drew still holds.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-21

## Trace

Team profile — `docs/traces/<date>_T-024_frontend-implementer.md`.
