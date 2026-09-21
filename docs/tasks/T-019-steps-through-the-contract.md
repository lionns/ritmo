---
id: T-019
title: Steps through the contract and the endpoints
status: done
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Put steps and the day list behind contracts and API routes, and have the portfolio endpoint
  carry what is marked for today — additively, so `/api/next-actions` and every screen still reading
  it keep working until the front moves in `T-020`.
decisions: [D-024]
implements: [FR-6, FR-22]
---

## Sources

- `docs/project/data-model.md` § Step, § Validation rules, § Data lifecycle ("Day rollover")
- `core/rules/step.ts` and `core/ports/store.ts` — written by `T-018`; this task adds no rule
- `contracts/next-actions.ts` and `src/pages/api/next-actions.ts` — the shape to mirror
- `contracts/portfolio.ts` — `PortfolioProject`, which gains today's steps beside `nextAction`
- `src/pages/api/portfolio.ts` — where the response is assembled
- `docs/project/design-handoff.md` § The Project Row — what the front will need to render
- `docs/decisions/D-020-deploy-local-on-demand.md` — the runtime is the owner's own machine, which
  is what makes the server's local date the owner's today

## Scope

- **`contracts/steps.ts`.** Write a step; mark one for a date; unmark; complete. Request and
  response shapes and the error response, in the shape `contracts/next-actions.ts` uses.
- **`contracts/portfolio.ts`.** `PortfolioStep` and a `todaySteps: PortfolioStep[]` on
  `PortfolioProject`. **`nextAction` stays** — removing it would break every screen in the same
  commit, which is what `T-020` is for.
- **`src/pages/api/steps.ts`.** `POST` writes a step; `PATCH` marks, unmarks or completes one.
  Validation and error mapping exactly as `next-actions.ts` does it: rule errors to 422, malformed
  bodies to 400, no owner to 409.
- **`src/pages/api/portfolio.ts`.** Fills `todaySteps` from `readStepsMarkedFor` for the owner and
  today's date, leaving `nextAction` and `progressSincePlan` exactly as they are.
- **Today, once.** One helper deriving the calendar date from the `Clock`, used by the endpoint so
  "today" has a single definition rather than one per caller.
- **Integration tests** for both routes against a real SQLite file, including the day boundary.

## Out of Scope

- **Every screen.** Nothing under `src/components/`, `src/layouts/`, `src/lib/` or `*.astro`.
  The portfolio page keeps rendering `nextAction` and ignores `todaySteps` until `T-020`.
- **Removing `next_actions`**, its contract, its route, its rules or its tests (`T-021`).
- **Timezone configuration.** The owner's machine is the runtime (`D-020`), so its local date is
  today. A setting would be a feature with no requirement behind it.
- New rules in `core/` — `T-018` wrote them; if one is missing this task stops and says so.

## Acceptance Criteria

- [x] WHEN `POST /api/steps` receives a title and a project id THE SYSTEM SHALL create one step and
      return it with `markedFor` null.
- [x] WHEN `POST /api/steps` receives a blank title THE SYSTEM SHALL answer **400** naming the
      title, and SHALL create nothing. *Corrected mid-task from 422: it contradicted this task's
      own § Scope ("malformed bodies to 400") and the convention `next-actions.ts` already sets for
      the identical case. 422 stays for rule errors, which is what the shelved-project case is.*
- [x] WHEN `PATCH /api/steps` marks a step whose project is shelved THE SYSTEM SHALL answer 422
      naming the project, and the step SHALL stay unmarked.
- [x] WHEN `PATCH /api/steps` sends an hour where a date belongs THE SYSTEM SHALL answer 422 and
      SHALL NOT write it, so `FR-22` holds at the boundary as well as in the schema.
- [x] WHEN `GET /api/portfolio` runs on a day after the one a step was marked for THE SYSTEM SHALL
      return that project with an empty `todaySteps` and no count of what went undone.
- [x] WHEN `GET /api/portfolio` runs THE SYSTEM SHALL still return `nextAction` exactly as it did
      before this task — the check that exercises the change against what already exists.
- [x] `npm run check:core` stays clean, and no file under `src/pages/api/` imports from `core/`
      other than through the port and the rules, as the existing routes do.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: `npm run dev` against a seeded `RITMO_DB_PATH`, and read `/api/portfolio` to see
  `todaySteps` beside `nextAction` for the same project. Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption, and the one worth a second opinion: **`progressSincePlan` is left untouched**, still
  counted from the open next action's `createdAt`. `design-handoff.md` § The Project Row anchors the
  filled markers to "the current plan", and with a list rather than a single action the natural
  anchor is the **oldest open step's `createdAt`**. `T-017` did not settle it and this task does not
  either: the markers are front, they are `T-020`'s to draw, and moving the anchor here would change
  a rendering no one has redesigned yet.
- Assumption: today is the server's local calendar date. Rests on `D-020` — the runtime is the
  owner's own machine, so its clock is theirs. A UTC date would roll the day over mid-evening.
- Assumption: a step is completed through `PATCH`, not by logging an entry against it. Linking
  entries to steps is `FR-20`'s calibration and has no task yet.

## Risks

- Two write paths exist until `T-020`: the front writes next actions, this route writes steps. A
  step written here is invisible to every screen, which is intended and is also why a mistake here
  would not surface until the front moves.
- `todaySteps` lands in the portfolio response before anything renders it. It costs one query per
  request for a field nobody reads yet — acceptable for one task, and `NFR-1`'s budget is measured
  on the rendered page, not on the unread field.

## Outcome

- Changes: `contracts/steps.ts`; `todaySteps` on `PortfolioProject` beside an untouched
  `nextAction`; `/api/steps` with `POST` and `PATCH`; the portfolio endpoint reads the day list and
  groups it by project; `calendarDateOf` gives today one definition; five integration cases.
- Files: `contracts/steps.ts`, `contracts/portfolio.ts`, `core/rules/step.ts`,
  `src/pages/api/steps.ts`, `src/pages/api/portfolio.ts`, `test/integration/worker.ts`,
  `test/integration/sqlite-store.test.ts`.
- Baseline result: unit 53/53 · isolation · typecheck 0 errors · build · integration 9/9.
- Final result: unit 53/53 · isolation · typecheck 0 errors · build · integration 14/14.
- Decisions recorded: none new.
- Follow-up: `T-020` the front — today's steps on the project row, the step list in its disclosure,
  the create form down to one field, and the markers' anchor settled. `T-021` removes
  `next_actions`, its contract, its route and its rules.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `docs/tasks/T-019-…md` § Acceptance Criteria · A criterion was corrected mid-task
  (422 → 400 for a blank title). It contradicted this task's own § Scope and the convention
  `next-actions.ts` sets. · The code was not bent to meet a criterion; the criterion was wrong.
  Named because editing a criterion to reach green is otherwise indistinguishable from cheating.
- Low · `src/pages/api/portfolio.ts` · The day list is read on every portfolio request for a field
  no screen renders until `T-020`. · One indexed query per request against `steps_marked_by_day`;
  `NFR-1` is measured on the rendered page, and `T-020` lands the reader.
- Low · `core/rules/step.ts` · `calendarDateOf` sits in core and reads the machine's local calendar
  through a `Date` it is handed. · The `Clock` port still supplies the moment, so core stays free
  of platform globals — `check:core` is clean — but the helper does assume the process runs where
  the owner is, which is exactly what `D-020` says.
- Note · Two write paths exist until `T-020`: the screens still write next actions, this route
  writes steps. Nothing reads `steps` yet, so they cannot disagree inside this task.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-21

## Trace

Team profile — `docs/traces/<date>_T-019_backend-implementer.md`.
