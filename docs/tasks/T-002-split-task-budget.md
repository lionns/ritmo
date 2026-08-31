---
id: T-002
title: Enforce the task plan and record budgets separately
status: review
profile: team
harness: 0.8.0
role: Backend Implementer
goal: Replace the single task-file budget with a plan budget and a record budget, enforced by
  harness-lint, so review findings and task scope stop competing for one number.
decisions: [D-015]
---

## Sources

- `docs/decisions/D-015-task-budget-plan-and-record.md` — the proposal this implements
- `docs/sdd/VERSION.md` § Change Rules, § Versioning Rules
- `docs/sdd/PROTOCOLS.md` § Budgets · `docs/sdd/TEMPLATES.md` § Task File

## Scope

- `harness.json` — replace `taskFileLines` with `taskPlanLines: 120` and `taskRecordLines: 60`.
- `scripts/harness-lint.mjs` — split each task at the first `## Outcome` heading and check both
  halves, naming which budget failed.
- `docs/sdd/PROTOCOLS.md` and `TEMPLATES.md` — state the two budgets where the one used to be.
- `docs/sdd/VERSION.md` — bump to `0.8.0` with a changelog entry citing `D-015`.

## Out of Scope

- Every other budget. Traces, decisions, the journal and the `docs/sdd/` total stay as they are.
- Migrating other repositories on this harness.

## Acceptance Criteria

- [x] WHEN a task file's front-matter through `## Risks` exceeds `taskPlanLines`, THE SYSTEM SHALL
      exit non-zero from `harness-lint` naming the task and the plan budget.
- [x] WHEN the text from `## Outcome` to end of file exceeds `taskRecordLines`, THE SYSTEM SHALL
      exit non-zero naming the task and the record budget.
- [x] A task file with no `## Outcome` heading is measured entirely against `taskPlanLines`.
- [x] `harness-lint` stays clean over this repository's existing tasks, including `T-001`.
- [x] `docs/sdd/` stays inside its 650-line total after the prose edits.

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build`, then
  `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: temporarily pad a task past each budget and confirm the right message, then revert.

## Assumptions

- **`## Outcome` is present in every task written from the template**, so using it as the split
  point does not need a new field.

## Risks

- The `docs/sdd/` total started at 633 of 650. Prose for two budgets has to fit in 17 lines or
  something else gets cut.

## Outcome

- Changes: replaced the whole-task limit with independently enforced 120-line plan and 60-line record budgets; added the structural split helper, regression tests, docs, and `0.8.0` changelog.
- Files: 10 across harness config/code/test, harness docs/version, generated status, task, and implementer trace.
- Baseline result: unit 3/3, isolation, typecheck, build, and `harness-lint` green before implementation.
- Final result: unit 5/5, isolation, 17-file typecheck, build, harness lint at 643/650, and integration 1/1 green; negative 121/120 plan and 61/60 record probes named the right budgets and were reverted.
- Decisions recorded: implemented accepted `D-015`; no new decision.
- Follow-up: independent Reviewer / Tester review, then named owner validation and closure.

## Review

- Verified sound, not taken on report: both budgets fire at exactly 121 and 61 and each names which one · `plan + record` equals the file total on all three tasks, so the split loses no line and double-counts none · a task with no `## Outcome` is entirely plan · no `taskFileLines` reference survives in code, only in the two prose passages that deliberately name the old key.
- Medium · `scripts/harness-lint.mjs:64` · a budget key missing from `harness.json` silently disables its check, because `n > undefined` is false · verified: with `taskPlanLines` deleted, a 280-line plan passes as `harness-lint: clean` · this task performs the rename that makes a stale `harness.json` possible, and the `0.8.0` entry describes the new semantics without naming the migration · fail naming the missing key, and add the rename to the changelog as a migration step.
- Low · `scripts/lib/harness.mjs:40` · the `## Outcome` regex matches inside fenced code · verified: a task quoting the template splits at the fenced heading — plan 15, record 89 — and a harness task quoting `TEMPLATES.md` is a real case, not a hypothetical · it fails loudly on the record budget rather than silently, so this is noise rather than a hole · skip fenced regions when locating the heading.
- Low · `test/core/task-budget.test.ts:4` · harness tooling is tested from `test/core/`, the directory that mirrors the product core and that `npm test` globs · nothing breaks; the directory now means two things.
- Assessment: all five acceptance criteria pass and the five gates are green from a clean `npm ci`. The Medium is an enforcement gap inside enforcement code and is worth closing before this task does. `docs/sdd` now sits at 643 of 650, so the next prose change has 7 lines.
## Validation

- Validated by:
- Date:
