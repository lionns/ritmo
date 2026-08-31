---
id: T-002
title: Enforce the task plan and record budgets separately
status: blocked
profile: team
harness: 0.7.1
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

- [ ] WHEN a task file's front-matter through `## Risks` exceeds `taskPlanLines`, THE SYSTEM SHALL
      exit non-zero from `harness-lint` naming the task and the plan budget.
- [ ] WHEN the text from `## Outcome` to end of file exceeds `taskRecordLines`, THE SYSTEM SHALL
      exit non-zero naming the task and the record budget.
- [ ] A task file with no `## Outcome` heading is measured entirely against `taskPlanLines`.
- [ ] `harness-lint` stays clean over this repository's existing tasks, including `T-001`.
- [ ] `docs/sdd/` stays inside its 650-line total after the prose edits.

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build`, then
  `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: temporarily pad a task past each budget and confirm the right message, then revert.

## Assumptions

- **`## Outcome` is present in every task written from the template**, so using it as the split
  point does not need a new field.

## Risks

- The `docs/sdd/` total sits at 633 of 650. Prose for two budgets has to fit in 17 lines or
  something else gets cut.

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
