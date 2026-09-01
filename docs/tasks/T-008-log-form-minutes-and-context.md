---
id: T-008
title: The log form the canvas drew — optional minutes, the plan in view, the project as context
status: ready
profile: team
harness: 0.8.1
role: Frontend Implementer
goal: Give `/registrar` the three things the approved artboard has and the screen does not — optional
  minutes, the next action you are acting on, and the project as context rather than a dropdown — so
  that an entry can carry effort at all, and the chart's third state stops being unreachable.
decisions: [D-008, D-009]
implements: [US-4, FR-4]
---

## Sources

- `https://claude.ai/code/artifact/c21822cb-584e-4600-8f31-0b9afbc8d629`, artboard `R-Movil`
  (page `page-ux`) — the whole screen. It is the only drawing of it.
- `docs/project/design-handoff.md` § The Hero Chart (why minutes matter), § Interaction States
  (targets, hover, the veiled hero), § Design Tokens
- `docs/project/requirements.json` — `FR-4`, `FR-20`, `NFR-1`, `NFR-7` · `user-stories.json` `US-4`
- `docs/tasks/T-006-first-loop-front.md` § Scope — "the log form, one field first", the line this
  task exists to finish · `contracts/entries.ts` — `effortMinutes` is already in the request

## Scope

- `docs/project/design-handoff.md` — write § The Log Form. The artboard is the only record of this
  screen and, as with § The Project Row, an unwritten design cannot be built twice the same way.
- `src/components/organisms/EntryForm.astro` — the minutes control: the label `MINUTOS · OPCIONAL`
  and four chips, `10 / 20 / 45 / 90`, one selectable at a time and **deselectable**, submitting
  `effortMinutes` when one is chosen and omitting it when none is. No free-numeric input.
- The next action of the selected project, rendered above the field under its own mono label, so the
  owner acts instead of deciding (`US-4`). It comes from the portfolio response the page already
  fetches; no new endpoint.
- The project as context when one arrives prefilled from a row: its title as a heading rather than a
  select. The select stays as the fallback for arriving at `/registrar` with no project.
- `src/pages/registrar.astro` — pass what the form needs; it already holds the portfolio.
- Coverage in `test/core/` for the chip contract: values, single selection, deselection, and that a
  submission without a chip carries no `effortMinutes`.

## Out of Scope

- **The backend.** `contracts/entries.ts` already carries `effortMinutes` and
  `src/pages/api/entries.ts` already reads it. Nothing in `core/`, `adapters/` or `contracts/`
  changes; a needed change there is a finding, not an edit.
- **Free-form minutes.** Four chips only. `NFR-1` is a twenty-second budget, and a numeric keypad on
  a phone is where that budget goes.
- **`FR-20` calibration.** This task gives that requirement its missing input; computing actual
  against estimate stays its own later task.
- **Writing or closing a next action.** Still nowhere in the product; the form only displays it.
- **The other screens.** Weekly close, project detail and archive are later.
- **`AC-2`'s repair copy.** A project without an open next action is invalid data
  (`data-model.md:233`); render nothing rather than inventing a second empty state.

## Acceptance Criteria

- [ ] WHEN the owner selects a minutes chip and saves, THE SYSTEM SHALL send `effortMinutes` with
      that value, and the next render of `/` SHALL draw that day's mark taller than the untimed floor.
- [ ] WHEN no chip is selected, THE SYSTEM SHALL omit `effortMinutes`, and the mark SHALL stay at the
      12px floor of `design-handoff.md` § The Hero Chart.
- [ ] WHEN a selected chip is tapped again, THE SYSTEM SHALL deselect it, because the label says
      optional and a value that cannot be taken back is not.
- [ ] Every chip is at least 56px tall on desktop and 58px on mobile. **The artboard draws them at
      52px; the handoff's target floor outranks it** (`T-006` § Assumptions).
- [ ] WHEN `/registrar` is opened with a `project` parameter, THE SYSTEM SHALL render that project's
      title as context and its open next action above the field, and SHALL NOT render the select.
- [ ] WHEN `/registrar` is opened with no `project` parameter, THE SYSTEM SHALL render the select as
      it does today.
- [ ] Accent coverage is measured after the change and still reads ~2% of the screen (`AC-9`): the
      selected chip and the save button are both accent, and `design-handoff.md` § Navigation Map
      says two highlighted things are none. If the measurement fails, the chip's selected state is a
      finding for the owner, not a silent redesign.
- [ ] `npm run check:core` stays green, proving the form still reaches data only through `contracts/`.
- [ ] All five gates stay green from a clean `npm ci`.

## Verification

- Baseline: the five gates of `quality-gates.md`, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset && npm run seed && npm run dev`, then write one entry with a chip
  and one without, and read `/` after each — the timed mark is taller, the untimed one is not.
- Task-specific: at 390px, with a stopwatch, from tapping a project row to seeing the entry saved,
  under twenty seconds (`NFR-1`). This is the manual validation `quality-gates.md` names.

## Assumptions

- **The four values are the canvas's, not the planner's.** `10 / 20 / 45 / 90` are read off
  `R-Movil`; no source explains the choice. If the owner wants different ones, that is a handoff
  change before implementation, not a judgement during it.
- **The artboard's 52px chip is a defect in the artboard.** Rests on `design-handoff.md`
  § Accessibility Notes, "targets are 56px desktop / 58px mobile, minimum", and on `T-006`
  § Assumptions, which already settled that the handoff outranks the artboards on this exact class
  of disagreement.
- **The next action always exists for an active project.** Rests on `data-model.md:233` and the
  owner's 2026-09-01 reading. Where the data violates it, render nothing.

## Risks

- **Accent is now spent twice on one screen.** A filled chip plus the save button is exactly what
  `design-handoff.md` warns about under the navigation decision. The criterion above turns that into
  a measurement rather than a preference.
- **Chips make four values easy and every other value impossible.** That is the trade `NFR-1` asks
  for, but it also means `FR-20`'s calibration will only ever see four numbers. Worth knowing before
  the calibration task is planned, not after.
- **The form grows while `NFR-1` holds at twenty seconds.** Three new elements on the screen that
  must stay the fastest path in the product; the stopwatch check is not decoration.

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
