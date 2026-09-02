---
id: T-008
title: The log form the canvas drew — optional minutes, the plan in view, the project as context
status: review
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
- [x] `/registrar` renders exactly one accent-filled **control**, the save button — the veiled hero
      marks are ground, not a highlighted thing (§ Interaction States). The selected chip reads as
      `accent` border, `accent` text and a 300→400 weight step, carries no accent fill, and keeps
      the unselected chip's border width so a tap reflows nothing. This replaces the earlier
      "~2% of the screen" wording, which was never measurable: at 390px the save button alone
      covers 5.4%. § The 2% rule enumerates the elements; § Navigation Map is the count.
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

- Changes: prefilled project heading and next-action context; optional `15 / 30 / 60 / 120` toggle
  chips with outlined/weighted selection; typed request omission; 12px optimistic floor with
  SSR-owned proportional height; § The Log Form handoff and contract tests.
- Files: form/page/chart, `entry-form.ts`, its test, handoff, task/traces and generated status
  (10 files).
- Baseline result: clean `npm ci`; unit 25/25, isolation, lint, typecheck and build green.
- Final result: clean `npm ci`; unit 29/29, isolation, lint, typecheck/build, integration 4/4. Live
  SSR/API probe: exact owner-settled chips; untimed mark 12px; 60-minute mark 104px. Built form has
  one accent-filled control; selected chip is glass with accent border/text and 300→400 weight.
- Decisions recorded: none.
- Follow-up: Reviewer round 4, then owner validation of the 390px under-20s flow.

## Review

- 2026-09-01 · Reviewer, rounds 1-3, five gates re-run each round; round 3 green at unit 29/29,
  isolation, lint, typecheck, build, integration 4/4. Two Medium, two Low, three nits, all closed.
  Medium · the optimistic bar scaled to a fixed 90-minute cap while `hero-chart.ts:65` scales to the
  window maximum, so a 45-minute entry drew 58px and reloaded at 95px. Medium · that rule sat inline
  where no test reached it, which is why five green gates said nothing about the first. Low · a
  timed day could carry `data-state="untimed"`. Low · § The Log Form promised a timed entry rises
  above the floor at once, which the fix made false — corrected in the handoff; round 1's handback
  said "the handoff wording is the owner's" meaning only the colour sentence, and that routing was
  mine and too broad. Low · the floor was a bare `12` beside a private `UNTIMED_HEIGHT`. Three nits
  raised without asking for action (`:12`, `:105`, `:67`) stay open. Round 3 verified the floor in
  the build rather than the source, and that `buildChartDays` does not follow the new cross-import
  into the client; the re-probe's 104px is arithmetically the only value it could be.
- Medium · `check-core-isolation.mjs:39` · `isFront` matches `src/components/`, `src/layouts/` and
  `src/pages/` but not `src/lib/`, so a file there may import an adapter and the check reports clean
  · mutation-probed both ways: `src/lib/__probe.ts` importing `adapters/d1/store.ts` passes, the
  identical import under `src/components/` fails. `D-009` names only routes and components, so the
  gap is the decision's before the script's. This task's `check:core` criterion therefore over-claims
  — the gate is green and `entry-form.ts` is in fact clean, but nothing looked at it · **routed to
  `T-009`**; `scripts/` needs approval and a decision, and `src/lib/` arrived with `T-006`.
- 2026-09-01 · the accent criterion, settled by the owner rather than measured. Measuring showed it
  could not be met by anything: at 390px the save button alone covers 5.4%, 2.7x the whole "~2%"
  budget, and that was true before this task. The rule's checkable content is § Navigation Map's
  count, not an area. The owner dropped the chip's accent fill, which closes the count and makes
  "colour is not its only channel" true — weight becomes the second channel.
- 2026-09-01 · Reviewer, round 4 · five gates re-run here, green: unit 29/29, isolation, lint,
  typecheck, build, integration 4/4. The chip matches § The Log Form: no `bg-accent`, `accent`
  border and text, 1px border in both states so nothing reflows, and `bg-accent` now appears once
  in the whole `/registrar` tree — the save button. The 300→400 step is real: `AppShell.astro:31`
  loads exactly those two Martian Mono weights, which is also why the resting chip had to drop to
  300. Three imprecisions were mine and are fixed here, not by the implementer: the handoff said
  "a weight step" without naming it or the fallback, and this criterion said "element" where the
  veiled chart marks are also accent-filled — the implementer's own Outcome said "control", which
  was the more accurate word. **Recommended for owner validation.**
- Correction: this review called `AC-2`, `AC-5` and `AC-9` fabricated. They are not — they are
  `T-006`'s criteria by position, and all three fit their context. I searched
  `acceptance-criteria.json`, missed them, and did not try the other reading. What survives is
  smaller: a bare `AC-N` is ambiguous against that file's `AC-G*`/`AC-X*` ids and breaks silently if
  a criterion is inserted into `T-006`. Left as it stands, at the owner's call. Separately, `T-006`
  checked its own ninth criterion — "accent covers roughly 2%" — without measuring it.

## Validation

- Validated by:
- Date:
