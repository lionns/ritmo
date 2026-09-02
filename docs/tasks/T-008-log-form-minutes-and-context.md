---
id: T-008
title: The log form the canvas drew — optional minutes, the plan in view, the project as context
status: doing
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
  and four chips, `15 / 30 / 60 / 120`, one selectable at a time and **deselectable**, submitting
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

- [x] WHEN the owner selects a minutes chip and saves, THE SYSTEM SHALL send `effortMinutes` with
      that value, and the next render of `/` SHALL draw that day's mark taller than the untimed floor.
- [x] WHEN no chip is selected, THE SYSTEM SHALL omit `effortMinutes`, and the mark SHALL stay at the
      12px floor of `design-handoff.md` § The Hero Chart.
- [x] WHEN a selected chip is tapped again, THE SYSTEM SHALL deselect it, because the label says
      optional and a value that cannot be taken back is not.
- [x] Every chip is at least 56px tall on desktop and 58px on mobile. **The artboard draws them at
      52px; the handoff's target floor outranks it** (`T-006` § Assumptions).
- [x] WHEN `/registrar` is opened with a `project` parameter, THE SYSTEM SHALL render that project's
      title as context and its open next action above the field, and SHALL NOT render the select.
- [x] WHEN `/registrar` is opened with no `project` parameter, THE SYSTEM SHALL render the select as
      it does today.
- [ ] Accent coverage is measured after the change and still reads ~2% of the screen (`AC-9`): the
      selected chip and the save button are both accent, and `design-handoff.md` § Navigation Map
      says two highlighted things are none. If the measurement fails, the chip's selected state is a
      finding for the owner, not a silent redesign.
- [x] `npm run check:core` stays green, proving the form still reaches data only through `contracts/`.
- [x] All five gates stay green from a clean `npm ci`.

## Verification

- Baseline: the five gates of `quality-gates.md`, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset && npm run seed && npm run dev`, then write one entry with a chip
  and one without, and read `/` after each — the timed mark is taller, the untimed one is not.
- Task-specific: at 390px, with a stopwatch, from tapping a project row to seeing the entry saved,
  under twenty seconds (`NFR-1`). This is the manual validation `quality-gates.md` names.

## Assumptions

- **The four values are the owner's, settled 2026-09-01.** `R-Movil` draws `10 / 20 / 45 / 90` and
  no source explains that choice. Review asked what a session over ninety minutes records; the owner
  replaced them with `15 / 30 / 60 / 120`. Nothing under the form capped at 90
  (`0001_initial_schema.sql:114` takes any non-negative integer), so this is the handoff change this
  bullet always said it would be, not a contract one.
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

- Changes: prefilled project heading and next-action context; optional `10 / 20 / 45 / 90` toggle
  chips; typed request omission; 12px optimistic floor with SSR-owned proportional height; § The
  Log Form handoff and contract tests.
- Files: form/page, `entry-form.ts`, its test, handoff, task/trace and generated status (8 files).
- Baseline result: clean `npm ci`; unit 25/25, isolation, lint, typecheck and build green.
- Final result: clean `npm ci`; unit 29/29, isolation, lint, typecheck/build, integration 4/4. Live
  SSR/API probe: untimed mark 12px; 45-minute mark 95px; both project-entry modes correct.
- Decisions recorded: none.
- Follow-up: **back to the Frontend Implementer, 2026-09-01, after Reviewer round 2.** Three things,
  one round: the owner's new chip values in `EFFORT_MINUTE_OPTIONS` (the seven call sites in
  `entry-form.test.ts` become type errors, which is the gate that catches this — `npm test` strips
  types and will not); export `UNTIMED_HEIGHT` from `hero-chart.ts` for the Low below; re-run the
  task-specific verification, because the `45`-minute probe recorded above used a chip that no
  longer exists. Handoff and plan are already updated here. No backend, no `core/`. Then owner
  validation: accent coverage and the 390px under-20s flow.

## Review

- 2026-09-01 · Reviewer, round 1 · five gates re-run here. Two Medium, two Low, three nits.
  Medium · the optimistic bar scaled to a fixed 90-minute cap while `hero-chart.ts:65` scales to the
  window maximum — on this task's own seed data a 45-minute entry drew 58px and reloaded at 95px,
  and same-day totals drifted · **closed in round 2**, by the client no longer inventing a
  proportion. Medium · that rule sat inline in the client script where no test reached it, which is
  why five green gates said nothing about the first · **closed**, extracted and covered. Low · a
  timed day could end up carrying `data-state="untimed"` · **closed**. Three nits raised without
  asking for action (dead branch at `:12`, document-scoped chip query at `:105`, literal caps at
  `:67`) — still open, still not worth a round.
- 2026-09-01 · Reviewer, round 2 · all five gates re-run here, green: unit 29/29, isolation,
  typecheck, build, integration 4/4. `confirmOptimisticChartMark` returns the 12px floor and never a
  guessed proportion, so a reload can only raise a mark, never contradict one; the helper's third
  case pins the `data-state` fix as a regression test. Scope held — nothing in `core/`, `adapters/`
  or `contracts/`. Two Low left, both record hygiene rather than behaviour.
- Low · `design-handoff.md` § The Log Form, **Confirmation** · promised a timed entry rises above the
  floor at once, which the round-1 fix made false · the section exists so the screen can be rebuilt
  without the canvas, so that bullet would rebuild the defect · **fixed here.** The round-1 handback
  said "the handoff wording is the owner's", meaning the colour sentence; that routing was too broad
  and the implementer reasonably read it as the whole document.
- Low · `entry-form.ts:46` · the floor is a bare `12` while `hero-chart.ts:20` keeps it as a private
  `UNTIMED_HEIGHT` · the handoff defines that number once and the code now says it twice, in modules
  that cannot see each other · export it and import it. Routed in the follow-up above.
- Owner's, unchanged: the `AC-9` accent measurement, and whether "colour is not its only channel"
  earns a second visual channel on the selected chip.

## Validation

- Validated by:
- Date:
