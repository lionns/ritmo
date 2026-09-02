---
id: T-013
title: The next action — write one, close it, write the next
status: ready
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Give every active project the one open next action `FR-6` requires and the product cannot
  currently write, and let the owner close it by writing its replacement — so the plan the portfolio
  already renders can actually move, and a project created through capture stops being invalid data.
decisions: [D-019, D-021]
implements: [FR-6]
---

## Sources

- `docs/project/requirements.json` — `FR-6`: exactly one next action per active project, written as
  a trigger and an act, with an optional obstacle
- `docs/project/data-model.md` § NextAction and its invariant list at `:233` — "An active project
  must have exactly one `NextAction` with `closedAt` null"
- `docs/project/design-handoff.md` § The Project Row — the row already renders the action as a
  sentence and draws the open-step marker as unconditional, "so the step always exists"
- `core/rules/next-action.ts` — `createNextAction` and `closeNextAction` already written and covered
  by `T-007`, including the atomic close-and-replace and its integration case
- `docs/tasks/T-012-…md` § Out of Scope — "Nothing here writes a `NextAction`", the line that made
  the invalid state routine

## Scope

- **Capture writes the first action.** The project form on `/` gains the action fields, so a project
  is created with its open action in the same submission and the invariant holds from the first
  moment. A project cannot be created without one.
- **The cycle, on the project row.** An active project's row offers closing the current action by
  writing its replacement. `closeNextAction` already requires both together and `T-007` proved it
  atomic; the interface must not offer a close that leaves the project with none.
- **The repair path.** Projects created by `T-012` before this task exist with no open action. Their
  rows offer writing the first one, using the same form as capture.
- `core/ports/store.ts` and `adapters/sqlite/store.ts` — only if the rules need something they lack;
  they were written for exactly this and are expected to need nothing.
- `contracts/` and `src/pages/api/` — the request and response types and the endpoint. One surface,
  not two: writing the first action and replacing an existing one are the same shape.
- `estimateMinutes`, optional. `data-model.md` says it is captured when the action is written, and
  there is no later moment; without it `FR-20`'s calibration can never be built. `obstacle` is
  offered and never required, per the model and research §6.
- `docs/project/design-handoff.md` — extend § The Project Row with the cycle, and § Setup and
  Capture with the action fields. Both sections already exist and neither describes this.
- Coverage in `test/core/` for what is pure and in `test/integration/` for the round trip: create a
  project with its action, close it with a replacement, and read the portfolio between each.

## Out of Scope

- **`/p/:id`.** § Navigation Map gives the project route history, dormant state and an inline log
  form. That is its own task; the cycle needs no new route.
- **Finishing a project.** `closeNextAction` deliberately has no "close with nothing after it" — a
  project with no more steps is shelved, and shelving is `FR-14`'s week boundary, already routed to
  `/semana`. Nothing here changes project state.
- **`FR-20`'s calibration.** This captures the estimate; comparing it against logged effort stays a
  later task, and this one must not compute a ratio anywhere.
- **Editing an action in place.** The model has no update path by design: the history of closed
  actions is what `FR-20` reads. A typo is corrected by closing and replacing.
- **Closing an action from `/registrar`.** `NFR-1` gives the log form twenty seconds and `T-008`
  kept it to one decision; adding a second there is a measurement, not an assumption.

## Acceptance Criteria

- [ ] WHEN a project is created through the product, THE SYSTEM SHALL create exactly one open
      `NextAction` for it in the same submission, and SHALL refuse a submission with no trigger or
      no act, so no path creates a project that violates `data-model.md:233`.
- [ ] WHEN an active project has an open action and the owner writes a replacement, THE SYSTEM SHALL
      close the current one and open the replacement atomically, and a failure of either SHALL leave
      both unchanged (`T-007`'s integration case, re-run against this path).
- [ ] WHEN an active project has no open action — every project `T-012` created — THE SYSTEM SHALL
      offer writing the first one, and the portfolio row SHALL stop showing "Escribe la próxima
      acción cuando esté clara" once written.
- [ ] `trigger` and `act` are required; `obstacle` and `estimateMinutes` are accepted and optional,
      and an omitted `estimateMinutes` is stored as `NULL` rather than `0`.
- [ ] WHEN the same action is submitted for closure twice, THE SYSTEM SHALL refuse the second,
      because `replaceNextAction` returns `false` and the rule turns that into an error.
- [ ] The action reads back through `readAsSentence` unchanged — `T-006` settled that rendering and
      this task does not touch it.
- [ ] `npm run check:core` stays green, and the cycle's rules are covered in `test/core/` without a
      database.
- [ ] All five gates green from a clean `npm ci`, and `node scripts/harness-lint.mjs` clean.

## Verification

- Baseline: the five gates of `quality-gates.md`, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset` with no seed, then answer setup, create an area and a project
  with its first action, and read `/` — the row shows the action as a sentence and the open-step
  marker. Close it with a replacement and read `/` again: the new action, one closed row in history.
- Task-specific: against a database created before this task, confirm a project with no open action
  offers writing one and stops asking afterwards.

## Assumptions

- **The cycle belongs on the project row, not on a new route.** § Navigation Map's six routes were
  settled with the owner on 2026-08-30, and § The Project Row already renders the action there.
  Labelled because the artboards draw the row without any affordance on it; if the owner wants this
  on `/p/:id` instead, that is a handoff change before implementation.
- **Requiring the action at creation is the right repair.** It makes the invariant true by
  construction rather than by a check that fires afterwards. It also makes creating a project a
  longer form, which is the cost, and `US-2`'s "no softening" applies to whatever copy explains it.

## Risks

- **The form grows at the moment the owner is entering their whole portfolio.** Four more fields per
  project, two of them required, right where someone is creating six projects in a row. If that
  proves too heavy in use, the answer is a handoff change, not a silent optional `trigger`.
- **Closing requires writing the next, and sometimes there is no next.** That is deliberate and
  `closeNextAction` enforces it, but the first owner who finishes a project will hit it and find
  shelving unavailable until `/semana`. Named here so it is not discovered as a bug.
- **`estimateMinutes` will be filled inconsistently**, and `FR-20` will read whatever is there.
  Better than the alternative: it cannot be captured retroactively, so an unasked estimate is a
  permanent hole in the calibration history.

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
