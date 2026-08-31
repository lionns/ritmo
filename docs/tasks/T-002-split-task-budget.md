---
id: T-002
title: Enforce the task plan and record budgets separately
status: done
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
- `docs/sdd/VERSION.md` — `0.8.0` for the split, then `0.8.1` once `D-016` extended the task.

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

- Changes: the task budget is now a plan limit and a record limit enforced separately, and the set of budgets the linter enforces is derived from the source rather than declared, so a stale `harness.json` fails instead of silently switching a gate off.
- Files: 15 across harness config, scripts, tests, `docs/sdd/`, two decisions, the task and its two traces, plus the generated indexes.
- Baseline result: unit 3/3, isolation, typecheck, build and `harness-lint` green before implementation.
- Final result: green from a clean `npm ci` — unit 7/7, isolation, typecheck 0 errors over 17 files, build, integration 1/1, `harness-lint` clean at 648/650.
- Decisions recorded: `D-015` and `D-016`, both accepted before implementation.
- Follow-up: three Low items go to `T-004` as harness work, deliberately not to `T-003`, which is product. `docs/sdd/` has two lines left.
## Review

- Resolved: the enforced set is derived by scanning `scripts/` instead of listed. Verified with the exact probe that reported clean last round — a check reading `budgets.exampleLines` with the key undeclared now fails naming it — and with both traps: a reader added to `harness-status.mjs` is caught, and `enforcedBudgetKeys()` returns exactly the five real keys, so the scanner does not match the regex literal in its own source.
- Low · `scripts/lib/harness.mjs:52` · the scan is textual, so any `budgets.<name>` in a comment or string under `scripts/` becomes a required key · verified: a comment reading `budgets.fantasmaLines` made the linter demand that key be declared · recommend leaving it. It fails toward more enforcement, never less, and parsing instead of matching is disproportionate for a lint script — a comment near the scanner saying not to write the pattern in prose costs one line and is enough.
- Low, open from round one · `scripts/lib/harness.mjs:40` · the `## Outcome` regex matches inside fenced code, so a task quoting `TEMPLATES.md` mis-splits · loudly, on the record budget, so noise rather than a hole.
- Low, open from round one · `test/core/task-budget.test.ts` · harness tooling is tested from the directory that mirrors the product core and that `npm test` globs.
- Assessment: no finding remains above Low, the five acceptance criteria pass, and every gate is green from a clean `npm ci` with unit 7/7. Recommended for owner validation and closure; the three Low items belong with `T-003`, not in another round here.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-08-31
