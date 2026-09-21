---
id: T-020
title: The screens move to steps and the day list
status: done
profile: team
harness: 0.9.0
role: Frontend Implementer
goal: Make every screen read and write steps instead of the if–then next action — today's steps on
  the project row, the step list in its disclosure, one field in the create form — so the product
  the owner runs is the one `D-024` describes.
decisions: [D-024]
implements: [FR-6, FR-22]
---

## Sources

- `docs/project/design-handoff.md` § The Project Row — today's steps as prose and **never as a
  checklist**, the disclosure, the one-field step form, and § The Log Form
- `docs/decisions/D-024-steps-and-the-day-list.md` and `brief.md` § Constraints — the three
  guardrails this task must not break
- `contracts/portfolio.ts`, `contracts/steps.ts`, `contracts/capture.ts` — written by `T-019`
- `src/components/molecules/ProjectCard.astro`, `src/lib/project-row.ts`,
  `src/components/organisms/{NextActionCycle,ProjectCapture,EntryForm}.astro`
- `core/rules/portfolio.ts:108` — where `nextAction` and `progressSincePlan` are assembled
- `src/pages/api/projects.ts:137` — `parseNextActionFields`, which the create form still posts to

## Scope

- **The contract changes shape.** `todaySteps` becomes `openSteps: PortfolioStep[]`, each carrying
  its `markedFor`. `T-019` shipped only today's, and the disclosure needs the whole list; two
  parallel lists of the same rows would drift. `hasOpenSteps` is not added: the array answers it.
- **The project row.** Steps whose `markedFor` is today render as their own `dim` lines, verbatim,
  **no box, no checkmark, no strikethrough, no number**. Nothing marked shows the prompt to choose;
  an empty `openSteps` shows the prompt to write the next few instead.
- **The disclosure** replaces `NextActionCycle`: the project's open steps, each markable for today
  and completable, plus one field to write another. Its summary carries **no count** — collapsed,
  the landing surface shows nothing of the list.
- **`ProjectCapture`** drops to `Nombre | Área` and one first step with its optional estimate.
- **`/api/projects` and `contracts/capture.ts`** take a first step instead of a trigger and an act,
  and `createProjectWithNextAction` gives way to the step equivalent. This is the one endpoint the
  front cannot move without, which is why back work sits in a front task.
- **`progressSincePlan` moves its anchor** to the **oldest open step's `createdAt`** — "since the
  current plan opened", with a list, is since the oldest step still standing was written
  (`design-handoff.md` § The Project Row). `T-019` left this deliberately for the task that draws it.
- **`/registrar`** shows today's steps where it showed the open action.
- **`design-handoff.md`** records the disclosure's resolution: a collapsed `<details>` renders
  nothing, which is how the list can live on `/` without being on the landing surface.

## Out of Scope

- **Removing `next_actions`**, its table, contract, route, rules or tests (`T-021`). They keep
  compiling and keep passing; they simply stop being reached from a screen.
- Completing a step by logging an entry against it — `FR-20`'s calibration has no task yet.
- The four screenshots in `README.md`, replaced once this is running (`T-021`).
- `/semana`, `/archivo`, `/p/:id`, objectives, commitments.

## Acceptance Criteria

- [x] WHEN a project has two steps marked for today THE SYSTEM SHALL render both as sentences in
      the row, and the rendered HTML SHALL contain no checkbox, no `<input type="checkbox">` and no
      count of steps.
- [x] WHEN a project has open steps but none marked for today THE SYSTEM SHALL render the prompt to
      choose, and WHEN it has no open steps THE SYSTEM SHALL render the prompt to write them.
- [x] WHEN the disclosure is collapsed THE SYSTEM SHALL show neither the step list nor any number
      derived from it.
- [x] WHEN a project is created through `/ajustes` with a title, an area and one step THE SYSTEM
      SHALL create the project with that step open and marked for nothing.
- [x] WHEN a project is created without a step THE SYSTEM SHALL answer 400 naming the step, and
      SHALL create no project.
- [x] WHEN entries are logged after the oldest open step was written THE SYSTEM SHALL count them in
      `progressSincePlan`, and SHALL count none logged before it.
- [x] WHEN `/registrar?project=<id>` opens THE SYSTEM SHALL show that project's steps for today
      and SHALL still save an entry in the same number of interactions as before (`NFR-1`).
- [x] `grep -rn "Disparador" src/` returns nothing.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: `npm run seed` and `npm run dev` against a throwaway `RITMO_DB_PATH`, then walk
  the real screens — create a project, write a step, mark it, log against it. Never against
  `data/ritmo.sqlite`.

## Assumptions

- Assumption: the row renders every step marked for today, not a truncated few. A project's marked
  steps are the owner's own choice from that morning; truncating them would hide a decision they
  made. If a row grows uncomfortable in use, that is evidence for a later task, not a guess now.
- Assumption: `progressSincePlan` anchored to the oldest open step. Recommended to the owner on
  2026-09-21 and recorded here; `design-handoff.md` § The Project Row is amended to match.
- Assumption: a step created with a project is not marked for today. Creating a project is not
  deciding to work on it today.

## Risks

- **This is the task the owner feels.** Every previous one was invisible to the running product;
  this one changes the screen they open. A mistake here reads as the product breaking, not as a
  task failing.
- `next_actions` keeps its data and its rules while no screen writes them. Between this task and
  `T-021` the database holds a frozen set of actions that nothing updates — expected, and the
  reason `T-021` follows rather than waits.
- The row can only grow: the previous design had exactly one sentence, this one has as many as the
  owner marked. `design-handoff.md` § The Project Row fixes the spacing at 8px and the density rule
  contracts only outer padding, so a long row scrolls rather than compressing the hierarchy.

## Outcome

- Changes: `openSteps` replaces `todaySteps` and the response carries `today`; `progressSincePlan`
  re-anchored to the oldest open step; `StepFields` and `StepList` replace the two next-action
  components, which are deleted; the row draws today's steps as sentences and never as a checklist;
  capture and `/api/projects` take one first step; the log form shows today; the seed writes steps.
- Files: `contracts/{portfolio,capture}.ts`, `core/rules/{portfolio,project}.ts`,
  `core/ports/store.ts`, `adapters/sqlite/store.ts`, `src/pages/api/{portfolio,projects}.ts`,
  `src/lib/project-row.ts`, `src/components/**`, `src/pages/{index,registrar}.astro`,
  `scripts/seed-local.mjs`, `design-handoff.md`, four test files.
- Baseline result: unit 53/53 · isolation · typecheck 0 errors · build · integration 14/14.
- Final result: unit 53/53 · isolation · typecheck 0 errors · build · integration 14/14.
- Decisions recorded: none new.
- Follow-up: `T-021` removes `next_actions` — table, contract, route, rules, tests — and replaces
  the four screenshots in `README.md`, which still show the trigger.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `test/integration/sqlite-store.test.ts` · The capture test no longer covers
  `/api/next-actions` through the create path, because that path no longer writes an action. The
  route stays covered by writing an action straight to the store. · Deliberate: the route still
  ships until `T-021`, so dropping its coverage now would leave shipped code untested.
- Medium · `core/rules/portfolio.ts` · `progressSincePlan` changed meaning. An owner who had four
  filled marks may see a different number, because the anchor moved from the action's `createdAt`
  to the oldest open step's. On a carried-across database those are the same timestamp, so the
  count does not jump today — but it will drift as steps are written.
- Low · `src/components/molecules/StepFields.astro` · The field is `title` in the step list and
  `step` in the create form, because a project's own `title` already occupies that name and two
  inputs of one name make `form.elements.namedItem` return a list. · Named because the same field
  answering to two names is the kind of thing that reads as an accident later.
- Low · `scripts/seed-local.mjs` · The seed now marks two steps for **today**, so a seeded database
  looks different tomorrow. · Correct for a fixture whose point is to show the row populated.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-21

## Trace

Team profile — `docs/traces/<date>_T-020_frontend-implementer.md`.
