# D-016 — The linter and `harness.json` must agree on which budgets exist

- Status: accepted
- Date: 2026-08-31
- Supersedes: none
- Tasks: T-002

## Context

Reviewing `T-002` found that a budget absent from `harness.json` disables its own check: with
`taskPlanLines` deleted, a 280-line plan reported `harness-lint: clean`, since `n > undefined` is
false. Writing the fix surfaced the mirror image — `journalEntryLines: 1` is declared and read by
nothing. The file can under-declare, turning a gate off in silence, and over-declare, naming a rule
that does not exist — either way it stops being a truthful statement of what is enforced, which is
the only reason to keep the numbers there instead of in code.

## Decision

`harness-lint` validates its budget contract in both directions before checking anything, and fails
naming the offending key:

- A budget the linter reads that `harness.json` does not declare is an error, not a skipped check.
- A budget `harness.json` declares that no check reads is an error too.

`journalEntryLines` is removed rather than given a check: the one-line rule already holds by
construction, since the journal is parsed per line and each must carry seven pipe-separated fields.
Shipped as `0.8.1` — `PATCH`, restoring what `PROTOCOLS.md` § Budgets already calls "enforced, not
suggested". Its entry also carries the migration `0.8.0` omitted: `taskFileLines` becomes
`taskPlanLines` and `taskRecordLines`.

## Consequences

- A repository upgrading `scripts/` without its `harness.json` now fails loudly on the first run.
- `harness.json` becomes readable as the list of what is enforced, in both directions.
- Adding a budget now means touching two places, and the linter says so. That is its price.
- `docs/sdd/` is at 643 of 650. The changelog entry has to fit in the remaining seven lines.

## References

- `docs/tasks/T-002-split-task-budget.md` § Review · `docs/sdd/VERSION.md` § Change Rules · `D-015`
