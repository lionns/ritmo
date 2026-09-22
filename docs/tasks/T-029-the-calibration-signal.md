---
id: T-029
title: The calibration signal, where the estimate is written
status: done
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Finish `FR-20` — say how the owner's estimates have actually gone, under the field where the
  next one is typed, from the last twenty done steps that can answer, and say nothing until five
  of them can.
decisions: [D-027]
implements: [FR-20]
---

## Sources

- The design approved by the owner on 2026-09-22, artboard "Calibración · con la muestra" at
  `https://claude.ai/artifact/DWF9g1gc1EaZuAMBTjs3tJ` — the line under the estimate field, naming
  its sample
- `FR-20` and `data-model.md` § Derived values — the ratio across the last twenty done steps
- `D-027` and `T-026` — the attributed effort this divides by, and why unattributed steps cannot
  be samples
- `research.md` §10 — decomposition and the planning fallacy; §14 — no reward layer, so an accurate
  estimate is reported, never congratulated
- `src/components/molecules/StepFields.astro` — the form the line sits under, and the alignment
  defect the owner found on the canvas: each column is its own box, so a label that wraps drops
  its input out of line
- `src/components/organisms/SettingsPanel.astro:23` — `grid-template-rows: subgrid`, the pattern
  this repository already uses to keep paired fields aligned

## Scope

- **`core/rules/calibration.ts`** — the ratio: actual ÷ estimate over the last twenty done steps
  that carry **both** an estimate and attributed effort above zero, `null` below **five** of them.
  Five is a starting value with no evidence behind it, recorded as such beside the twenty that
  already is one.
- **A port read** for those samples, bounded, newest first.
- **`ProjectDetailResponse`** carries the ratio and its sample count, or null.
- **`StepFields`** renders the line under the estimate field: "Tus últimos N pasos tardaron R×
  lo estimado", and the accurate case plainly — never a congratulation (§14).
- **`StepFields` alignment fixed**: the two columns share one grid so the label row and the input
  row line up however a label wraps. Found by the owner on the canvas; it is the same defect in
  the product, currently hidden by the labels happening to fit.
- **`README.md`** and **`design-handoff.md`**.

## Out of Scope

- Any per-project calibration. §10 is about how *the owner* estimates, so the signal is personal
  and identical on every project's screen.
- Changing what an estimate is, or making it required — `brief.md` § Open Questions still has that
  one open and this task does not settle it.
- Showing the ratio anywhere else: not the portfolio, not `/archivo`, not the weekly close, which
  is unbuilt.

## Acceptance Criteria

- [x] WHEN fewer than five done steps carry both an estimate and attributed effort THE SYSTEM
      SHALL report no calibration and the form SHALL render no line.
- [x] WHEN five or more do THE SYSTEM SHALL report the ratio of their summed actual to their
      summed estimate, and the count of them.
- [x] WHEN a done step has an estimate but no attributed effort THE SYSTEM SHALL NOT count it as
      a sample — `D-027` refuses to guess what it took, and a zero would drag the ratio down.
- [x] WHEN more than twenty qualify THE SYSTEM SHALL use the twenty most recently done.
- [x] WHEN the ratio rounds to 1.0 THE SYSTEM SHALL say so plainly, with no congratulation, no
      exclamation and nothing in `accent` (§14, `NFR-7`).
- [x] WHEN a label in `StepFields` wraps to two lines THE SYSTEM SHALL keep both inputs on one
      line — asserted on the markup, since the wrap depends on the viewport.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: seed a throwaway `RITMO_DB_PATH`, close five steps with attributed effort, and
  read the line. Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption: **five** samples is the minimum, and the ratio is of sums rather than a mean of
  per-step ratios. A mean of ratios lets one five-minute step estimated at one minute dominate;
  summing weighs each sample by its size. Both numbers are starting values, as twenty already is.
- Assumption: the line is identical on every project screen, because it describes the owner.

## Risks

- **The owner will see nothing for weeks.** Five samples need five closed steps with effort
  attributed, and attribution only began with `T-026`. Silence is correct and will look broken.
  The manual says what has to happen for the line to appear.
- A ratio is one number standing for a habit. §14 forbids making it a score, so the wording carries
  the whole weight: it reports, and `NFR-7` means it never turns red or congratulates.

## Outcome

- Changes: `core/rules/calibration.ts` with the window and the minimum both named as starting
  values; `readCalibrationSamples`; the ratio on the project response; the line under the estimate
  field, naming its sample and never congratulating; `StepFields` columns put on one shared grid.
- Files: `core/rules/calibration.ts`, `core/ports/store.ts`, `adapters/sqlite/store.ts`,
  `contracts/project.ts`, `src/pages/api/project/[id].ts`,
  `src/components/molecules/StepFields.astro`, `src/components/organisms/ProjectPanel.astro`,
  four test files, `README.md`, `docs/project/design-handoff.md`, `docs/images/05-proyecto.jpg`.
- Baseline result: unit 51/51 · isolation · typecheck 0 errors · build · integration 26/26.
- Final result: unit 55/55 · isolation · typecheck 0 errors · build · integration 26/26.
- Decisions recorded: none new. Two numbers were chosen — five and the existing twenty — and both
  are labelled starting values in the rule itself rather than buried.
- Follow-up: `/semana`, `/p/:id`'s dormant objective state, and objectives themselves. `FR-20` and
  `FR-14` are both complete as far as their halves can be without weeks.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `src/components/molecules/StepFields.astro` · The alignment defect was found by the
  owner **on a mockup**, and it was in the product too — each column its own box, so a wrapping
  label drops its own input. It never showed because the labels happened to fit at the widths
  shipped so far. No test could have caught it; the assertion added now checks the grid, not the
  rendering. · Worth noting that the repository already had the right pattern in `SettingsPanel`
  and this component simply did not use it.
- Low · `core/rules/calibration.ts` · Five is invented. So is twenty, which `data-model.md`
  already admitted. · Both say so in their own doc comments, which is the most that can be done
  before there is use to revise them against.
- Low · The ratio sums rather than averaging per-step ratios, so a long step weighs more than a
  short one. That is deliberate and recorded in § Assumptions, but it means one badly estimated
  four-hour step moves the number more than three good short ones.
- Note · The owner will see silence for a while: five samples need five closed steps with effort
  attributed, and attribution only began yesterday. The manual states the condition so the silence
  reads as "not yet" rather than "broken".

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-22

## Trace

Team profile — `docs/traces/<date>_T-029_backend-implementer.md`.
