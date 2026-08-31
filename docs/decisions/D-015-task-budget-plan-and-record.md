# D-015 — Split the task budget: the plan is bounded, the record is not the same thing

- Status: accepted
- Date: 2026-08-31
- Supersedes: none
- Tasks: T-002

## Context

`taskFileLines: 120` counts the whole task file, so `## Outcome`, `## Review` and `## Validation`
compete with `## Scope` and `## Acceptance Criteria` for one number. Reviewing `T-001` hit this:
four findings fit only after compressing the plan that was already written and agreed. The budget's
stated rationale — "exceeding it means the task is really several tasks" — is about scope, and
scope is decided before a line of the record exists. Findings are as many as the code earns, and
`ROLES.md` calls narrowing a check to reach green a defect. A budget that rewards fewer findings is
the same pressure wearing a different hat.

## Decision

Split the budget in `harness.json` and enforce both in `harness-lint.mjs`:

- `taskPlanLines: 120` — front-matter through `## Risks`. Unchanged number, unchanged meaning.
- `taskRecordLines: 60` — `## Outcome` to the end. The trace block keeps its own 25 inside that.

A file with no `## Outcome` heading counts entirely against the plan.

## Consequences

- Review findings stop competing with scope. Both stay bounded; neither pays for the other.
- One task file could newly fail: a short plan with a record over 60 lines passes today. None
  exists in this repo, and the split is otherwise a relaxation.
- `MINOR` — `0.8.0`, with a changelog entry. It adds a budget rather than changing a workflow.
- Two numbers to hold instead of one, and a heading (`## Outcome`) becomes structural.

## References

- `docs/sdd/PROTOCOLS.md` § Budgets, § Review · `docs/sdd/VERSION.md` § Change Rules · `T-001`
