---
id: T-009
title: The fourth kind of front file — `src/lib/` outside the boundary `check:core` enforces
status: ready
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Settle where plain `.ts` helpers under `src/` sit among `D-009`'s three layers, record that
  answer, and make `check:core` enforce it — so the gate the architecture calls the boundary's proof
  stops reporting clean on a directory it never looks at.
decisions: [D-009]
---

## Sources

- `docs/traces/2026-09-01_T-008_reviewer.md` — the mutation probe that found this, and its result
- `docs/decisions/D-009-boundaries-front-back-split.md` § Decision — names `.astro` routes and
  components as the front. Plain `.ts` under `src/` is not in it
- `docs/project/architecture.md` § Layout — the tree and the import table; neither lists `src/lib/`
- `scripts/check-core-isolation.mjs:39` — `isFront`, whose regex mirrors `D-009`'s wording exactly
- `docs/tasks/T-004-harness-loose-ends.md` § Scope — the precedent for a `scripts/` change

## Scope

- **The decision comes first.** `src/lib/` holds `project-row.ts` (`T-006`) and `entry-form.ts`
  (`T-008`): presentation logic lifted out of components so `node --test` can reach it without a
  DOM. Settle whether that is front, and record it. `boundaries` is a foundation topic, so this
  either amends `D-009` in place or supersedes it — `harness-lint`'s foundation gate fails on two
  accepted decisions for one topic.
- `scripts/check-core-isolation.mjs` — `isFront` matches whatever the decision says, so the rule and
  its enforcement keep coming from one place rather than two that can drift.
- `docs/project/architecture.md` — `src/lib/` joins the § Layout tree and the import table. The
  table currently claims `check:core` "enforces all four rows" while a fifth directory exists.
- A check that fails before the change and passes after, rather than a paragraph asserting it.

## Out of Scope

- **Moving or renaming what is already there.** Whether `confirmOptimisticChartMark` belongs in
  `hero-chart.ts` is a design question `T-008`'s review raised and did not settle; answering the
  boundary question may make it moot either way.
- **The product.** Nothing in `core/`, `adapters/`, `contracts/`, `migrations/` or any `.astro`
  file changes. Both files under `src/lib/` are already clean — this task repairs the proof, not
  the code.
- **Every other unenforced path.** If widening the check surfaces more directories outside the
  table, they are findings for a follow-up task, not scope absorbed here.
- **`docs/sdd/` and `harness.json`.** This is a project check, not harness tooling.

## Acceptance Criteria

- [ ] WHEN a file under `src/lib/` imports from `adapters/` or `core/`, THE SYSTEM SHALL fail
      `npm run check:core` naming that file and line — the behaviour `src/components/` has today.
- [ ] WHEN no such import exists, `npm run check:core` SHALL report clean.
- [ ] `docs/project/architecture.md` § Layout lists `src/lib/`, and the import table carries a row
      for it whose allowed imports are the ones the decision names.
- [ ] Exactly one accepted decision carries `- Foundation: boundaries` when the task closes.
- [ ] All five gates green from a clean `npm ci`, and `node scripts/harness-lint.mjs` clean.

## Verification

- Baseline: the five gates of `quality-gates.md`, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: write `src/lib/__probe.ts` importing `adapters/d1/store.ts`, run
  `npm run check:core`, see it fail naming that path; delete it and see it clean. This is the probe
  that found the gap, run as its own inverse — and the same import in `src/components/` must keep
  failing, so the fix widened the rule rather than replacing it.

## Assumptions

- **The likely answer is "front, `contracts/` only".** These files are presentation logic lifted out
  of components for testability, so nothing would change about what they may import — only about
  what is checked. Labelled as an assumption because it is the owner's call, not the implementer's;
  the task is written so a different answer changes the table row and the regex, not the work.
- **No `VERSION.md` entry.** Rests on `T-004` § Scope: an entry is owed only when behaviour changes
  for anyone but this repo, and `check-core-isolation.mjs` is this project's own.

## Risks

- **Widening `isFront` may light up files nobody has read.** That is the point, but it can turn a
  one-line fix into a red baseline. If it does, the task is `blocked` and the findings are reported
  — narrowing the regex to reach green is the defect `quality-gates.md` names, not the fix.
- **The gap is older than the gate's reputation.** `architecture.md` has told readers that
  `check:core` proves the boundary since before `src/lib/` existed, and `T-008` checked an
  acceptance criterion on that basis. Whatever else changes, that sentence should stop over-claiming.
- **A superseding decision costs more than it looks.** `D-009` is cited across the specification;
  amending it in place keeps those citations true, and is likely the cheaper of the two shapes.

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
