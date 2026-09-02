---
id: T-009
title: The fourth kind of front file — `src/lib/` outside the boundary `check:core` enforces
status: doing
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Make `check:core` enforce what `D-017` decided — that `src/lib/` is front — so the gate the
  architecture calls the boundary's proof stops reporting clean on a directory it never looks at,
  and so `architecture.md` stops describing a rule nothing checks.
decisions: [D-017]
---

## Sources

- `docs/traces/2026-09-01_T-008_reviewer.md` — the mutation probe that found this, and its result
- `docs/decisions/D-009-boundaries-front-back-split.md` § Decision — names `.astro` routes and
  components as the front. Plain `.ts` under `src/` is not in it
- `docs/project/architecture.md` § Layout — the tree and the import table; neither lists `src/lib/`
- `scripts/check-core-isolation.mjs:39` — `isFront`, whose regex mirrors `D-009`'s wording exactly
- `docs/tasks/T-004-harness-loose-ends.md` § Scope — the precedent for a `scripts/` change

## Scope

- **The decision is settled.** `D-017` supersedes `D-009`: `src/lib/` is front, so plain `.ts`
  under `src/` outside `pages/api/` may import `contracts/` and each other and nothing else. Owner
  settled it 2026-09-01. Nothing left to decide here — this task makes the check say it.
- `scripts/check-core-isolation.mjs` — `isFront` matches `src/lib/` too, so the rule and its
  enforcement keep coming from one place rather than two that can drift.
- `docs/project/architecture.md` — `src/lib/` joins the § Layout tree and the front row of the
  import table, and the `D-009` citation above that table becomes `D-017`. **Land this with the
  script, not before it:** the table's "Enforced" column would otherwise claim what nothing checks,
  which is the exact over-claim that produced this task.
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

- **No repair is needed, only enforcement.** Simulated before handing the task over: the three
  imports under `src/lib/` go to `contracts/` and to one component, so widening `isFront` leaves the
  baseline green. `src/lib/` is also the only uncovered directory — `src/styles/` holds no file with
  an extension the checker scans. Recorded as an assumption because it was measured on 2026-09-01
  and a new file could invalidate it before the change lands.
- **No `VERSION.md` entry.** Rests on `T-004` § Scope: an entry is owed only when behaviour changes
  for anyone but this repo, and `check-core-isolation.mjs` is this project's own.

## Risks

- **Widening `isFront` may light up files nobody has read.** Measured as not happening today (see
  Assumptions), but if a new file lands first and it does, the task is `blocked` and the findings
  are reported — narrowing the regex to reach green is the defect `quality-gates.md` names.
- **The gap is older than the gate's reputation.** `architecture.md` has told readers that
  `check:core` proves the boundary since before `src/lib/` existed, and `T-008` checked an
  acceptance criterion on that basis. Whatever else changes, that sentence should stop over-claiming.
- **`D-009` is cited across the specification and is now superseded.** `TEMPLATES.md` makes an
  accepted decision immutable, so there was no cheaper shape. Citations that matter should be
  re-pointed as they are touched, not swept in a pass nobody asked for.

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
