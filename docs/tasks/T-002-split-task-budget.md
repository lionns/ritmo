---
id: T-002
title: Enforce the task plan and record budgets separately
status: review
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Replace the single task-file budget with a plan budget and a record budget, enforced by
  harness-lint, so review findings and task scope stop competing for one number.
decisions: [D-015, D-016]
---

## Sources

- `docs/decisions/D-015-task-budget-plan-and-record.md` — the proposal this implements
- `docs/decisions/D-016-budget-contract-both-ways.md` — the accepted review fix
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

- Changes: split the task budget into plan/record limits, then made missing or unenforced budget keys fail the contract; added regression tests, docs, and the `0.8.0`/`0.8.1` changelog.
- Files: 13 across harness config/code/test, docs/version/decisions, generated indexes, task, and traces.
- Baseline result: unit 3/3, isolation, typecheck, build, and `harness-lint` green before implementation.
- Final result: unit 6/6, isolation, 17-file typecheck, build, lint at 648/650, and integration 1/1 green; plan/record thresholds and missing/extra contract probes named the right budgets or keys, then were reverted.
- Decisions recorded: implemented accepted `D-015` and review fix `D-016`.
- Follow-up: independent Reviewer / Tester re-review, then named owner validation and closure.

## Review

- Round two verified sound: both directions of the contract fire and name the key — `budget contract missing \`taskPlanLines\`` and `budget contract declares \`inventadoLines\`` · `journalEntryLines` is gone and the one-line rule still holds by construction · the `0.8.1` entry carries the migration from 0.7.1 that `0.8.0` omitted · unit 6/6 and all five gates green from a clean `npm ci`.
- Medium · `scripts/lib/harness.mjs:45` · `ENFORCED_BUDGETS` is a hand-written list, so the contract covers only the five names that exist today · verified: I added a check reading `budgets.exampleLines`, left the key undeclared, and `harness-lint` reported clean while the new check silently no-opped — the same defect `D-016` exists to remove, one layer up · `D-016` says a budget the linter reads and the config omits is an error; the code says one of these five names is · derive the set from the source with `/\bbudgets\.([A-Za-z][A-Za-z0-9]*)/g` over the lint script, and test that the derived set matches.
- Low · `docs/tasks/T-002-split-task-budget.md:26` · Scope still says the version bump is `0.8.0`, though the task shipped `0.8.0` and `0.8.1` once `D-016` extended it · the plan now understates what was agreed.
- Fixed in review: both `T-001` and `T-002` had lost the blank line before `## Validation`. My own review edit script dropped it; `T-003`, which it never touched, was intact. Restored in both.
- Assessment: the five acceptance criteria pass and every gate is green. One Medium remains and is worth a round, because it is the same class of defect this task exists to remove — narrower now, since it only reaches budgets added from here on. `docs/sdd` is at 648 of 650: the next governance prose change has two lines.

## Validation

- Validated by:
- Date:
