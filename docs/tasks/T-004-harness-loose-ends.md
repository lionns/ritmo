---
id: T-004
title: The three harness findings T-002 left, kept out of the product's way
status: ready
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Close the three low-severity findings the T-002 review left in the harness tooling, keeping
  them separate from T-003 so product cleanup and governance changes stay in different tasks.
decisions: [D-015, D-016]
---

## Sources

- `docs/traces/2026-08-31_T-002_reviewer.md` — the three findings, each with the probe that found it
- `docs/sdd/VERSION.md` § Change Rules · `docs/sdd/PROTOCOLS.md` § Budgets

## Scope

- `scripts/lib/harness.mjs` — the `## Outcome` split must ignore headings inside fenced code, so a
  task quoting `TEMPLATES.md` is measured as one plan rather than split at the quote.
- `scripts/lib/harness.mjs` — one comment beside the budget scanner saying the match is textual and
  `budgets.<name>` must not appear in prose there. The scan itself stays as it is; see Assumptions.
- Harness tooling tests move out of `test/core/`, which mirrors the product core, into their own
  directory with its own `npm` script. `npm test` keeps running the product core alone.
- `docs/sdd/VERSION.md` — a changelog entry only if behaviour changes for anyone but this repo.

## Out of Scope

- **`T-003`.** Product cleanup. Nothing here touches `core/`, `adapters/`, `migrations/` or `src/`.
- **Replacing the textual scan with a parser.** Disproportionate for a lint script, and it fails
  toward more enforcement rather than less.
- **Extracting the harness to its own repository**, and upstreaming `0.8.1` to wherever
  `harness-init.mjs` lives. Both are real, neither is this task.
- **Any new budget, rule or gate.** This closes findings; it does not add governance.

## Acceptance Criteria

- [ ] WHEN a task file contains `## Outcome` inside a fenced code block and no real one, THE SYSTEM
      SHALL measure the whole file as plan.
- [ ] WHEN a task file contains a fenced `## Outcome` before its real one, THE SYSTEM SHALL split at
      the real heading.
- [ ] `plan + record` still equals the file total for every task in `docs/tasks/`.
- [ ] Harness tooling tests live outside `test/core/` and run from their own script; `npm test`
      covers the product core only, and both are green.
- [ ] `harness-lint` stays clean, and `docs/sdd/` stays inside its 650-line total.

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build`, then
  `node scripts/harness-lint.mjs`.
- Final: the same, plus the new harness test script and `node scripts/harness-status.mjs`.
- Task-specific: add a task file quoting the template inside a fence, confirm the split lands on the
  real heading, then remove it.

## Assumptions

- **The textual scan stays.** `T-002`'s review recorded a recommendation not to fix it: a
  `budgets.<name>` in a comment becomes a required key, which errs toward more enforcement. The
  comment asked for here is the whole mitigation.
- **`docs/sdd/` has two lines of headroom**, so any prose must be a replacement, not an addition.

## Risks

- Ignoring fenced regions means tracking fence state while scanning, and a task using indented code
  blocks rather than fences would still mis-split. Acceptable: it fails loudly on the record budget.
- Moving the tests changes what `npm test` covers. If the new script is not wired into the gates,
  the harness tooling silently stops being tested — the same failure class `D-016` just closed.

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
