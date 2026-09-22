---
id: T-027
title: The history of a project, closed steps included
status: done
profile: team
harness: 0.9.0
role: Frontend Implementer
goal: Show what a step was estimated at while it is open, and keep it in the project's history once
  it is closed — with what it actually took when that is known and silence when it is not — so a
  step marked done stops disappearing.
decisions: [D-024, D-027]
implements: [FR-6, FR-20]
---

## Sources

- The design approved by the owner on 2026-09-21, artboards "Pasos y cierre" and "Cuando no se
  supo" at `https://claude.ai/artifact/DWF9g1gc1EaZuAMBTjs3tJ`
- `D-027` and `T-026` — `Entry.stepId` and `readEffortForStep`, the exact actual this renders
- `core/rules/project-detail.ts` — `readProjectDetail`, which today returns open steps and entries
- `src/components/organisms/ProjectPanel.astro` — the panel that draws both
- `data-model.md` § Derived values · `brief.md` § Constraints (no count, no red, no debt)

## Scope

- **A port read for a project's done steps**, bounded like the entry history it joins.
- **`readProjectDetail` returns one merged history**, newest first: entries and closed steps in a
  single time-ordered list, each closed step carrying its estimate and the effort attributed to it.
- **`contracts/project.ts`** — the history becomes a discriminated list so the page renders it
  without deciding anything.
- **`ProjectPanel`** — open steps show "N min estimados" under the title when they carry one; the
  history draws a filled `accent` circle on closed steps, none on entries, and no checkbox
  anywhere. A closed step says "estimaste N", adds "· registraste M" **only when M is above zero**,
  and says neither when it has neither.
- **`README.md`** § La pantalla del proyecto and **`design-handoff.md`** § The Project Row.

## Out of Scope

- **The calibration factor.** `FR-20`'s ratio across the last twenty done steps stays unbuilt; this
  shows the two numbers side by side and computes nothing from them.
- Reopening a closed step, editing one, or deleting anything.
- The portfolio row and `/archivo`, which show neither closed steps nor estimates.

## Acceptance Criteria

- [x] WHEN an open step carries an estimate THE SYSTEM SHALL render it under the step's title, and
      WHEN it carries none THE SYSTEM SHALL render no line in its place.
- [x] WHEN a step is marked done THE SYSTEM SHALL keep it in that project's history rather than
      removing it from every screen — the defect this task exists for.
- [x] WHEN effort was attributed to a closed step THE SYSTEM SHALL show the estimate and that
      effort together; WHEN none was, THE SYSTEM SHALL show the estimate alone and **no zero, no
      dash and no placeholder**.
- [x] WHEN the history renders THE SYSTEM SHALL order entries and closed steps together by time,
      newest first, and SHALL contain no checkbox and no count of either.
- [x] WHEN a step is closed and an entry is logged the same day THE SYSTEM SHALL show both, in the
      order they happened — the check that exercises this against `T-026`'s attribution.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: seed a throwaway `RITMO_DB_PATH`, mark a step, log against it, close it, and read
  the screen against the approved artboards. Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption: "registraste M" appears only for M above zero. Attributed entries with no minutes and
  no attributed entries both mean the product does not know the number, and one rule — say only
  what there is a number for — is easier to trust than two that look the same on screen.
- Assumption: closed steps share the entry history's bound rather than having their own.

## Risks

- **Half the owner's history predates attribution**, so most closed steps will show an estimate
  alone for a long time. The approved artboard "Cuando no se supo" is that case, judged before
  being built.
- Two kinds of row in one list is where a design goes muddy. The filled circle carries the whole
  distinction, so if it ever stops reading, the list stops meaning anything.

## Outcome

- Changes: `readDoneSteps`; `readProjectDetail` returns closed steps with their attributed effort;
  `ProjectHistoryItem` merged in the endpoint; open steps show their estimate; the history draws
  entries and closed steps together, a filled circle on the steps; manual and handoff updated.
- Files: `core/ports/store.ts`, `core/rules/project-detail.ts`, `adapters/sqlite/store.ts`,
  `contracts/project.ts`, `src/pages/api/project/[id].ts`,
  `src/components/organisms/ProjectPanel.astro`, four test files, `README.md`,
  `docs/project/design-handoff.md`, `docs/images/05-proyecto.jpg`.
- Baseline result: unit 51/51 · isolation · typecheck 0 errors · build · integration 23/23.
- Final result: unit 51/51 · isolation · typecheck 0 errors · build · integration 25/25.
- Decisions recorded: none new; `D-027` rendered.
- Follow-up: `FR-20`'s calibration factor — actual ÷ estimate across the last twenty done steps.
  Both numbers are now on screen and nothing computes from them yet. And `FR-14` still has no
  interface, which remains the oldest unbuilt promise.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `core/rules/project-detail.ts` · The actual is read per closed step, so a project's
  screen issues up to twenty small queries instead of one join. · Deliberate:
  `readEffortForStep` is the single definition of what a step took (`D-027`), and duplicating it
  as a join is how the window rule ended up stated in three places and wrong in all three. If it
  ever costs anything, it becomes one query behind the same port method.
- Low · `src/components/organisms/ProjectPanel.astro` · Two row shapes in one list, told apart by
  a filled circle. · The whole distinction rests on that dot; the note in the markup says so, and
  if it ever stops reading the list stops meaning anything.
- Low · `ProjectDetailResponse` now carries both `recentEntries` and `history`, and the page only
  renders `history`. `recentEntries` still feeds the log form's context. · Two shapes of the same
  rows is a smell; it survives because `EntryForm` speaks the portfolio's shape, and unifying them
  belongs with whatever next needs it.
- Note · Zero means "not known" in `history[].effortMinutes`, and the screen's silence is what
  carries that. A reader of the contract alone could print "0 min" and be wrong in the product's
  own terms — which is why the handoff states the rule rather than leaving it to the field.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-22

## Trace

Team profile — `docs/traces/<date>_T-027_frontend-implementer.md`.
