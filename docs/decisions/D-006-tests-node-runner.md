# D-006 — node --test, zero dependencies

- Status: superseded
- Date: 2026-08-29
- Supersedes: none
- Tasks: none
- Foundation: tests

## Context

The harness gates every change on a green baseline, so the test command has to work reliably after
weeks of neglect. Test tooling is where dependency rot bites hardest on a project touched in bursts.

## Decision

Node's built-in test runner for the pure core (D-003), with no dependencies. The Workers adapter
cannot run there, so it is covered by Cloudflare's local test tooling against a local D1 — **one dev
dependency, accepted deliberately** and confined to the adapter. That integration test is also what
satisfies the harness's demand that at least one check exercises a change together with what exists.

## Consequences

- The baseline command keeps working across Node upgrades without a toolchain to maintain.
- No snapshot testing, no rich matchers, no watch-mode niceties — assertions are written by hand.
- "Zero dependencies" is no longer absolute, and pretending otherwise would be the defect. The line
  is drawn so that the rules — the part worth protecting — stay testable with nothing installed.

## References

- `docs/sdd/HARNESS.md` § Final Acceptance Gate
- `docs/project/quality-gates.md`
