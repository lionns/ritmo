# D-014 — `@types/node`, the sixth dev dependency

- Status: proposed
- Date: 2026-08-31
- Supersedes: none
- Tasks: T-001

## Context

Review of `T-001` found that `tsconfig.json` excludes `test/core/**`, so `npm run typecheck` never
sees the core unit tests: a deliberate type error there leaves `tsc --noEmit` at exit 0. Widening
`include` to `test/**/*.ts` then fails on four `TS2591` errors — `node:test` and
`node:assert/strict` have no declarations without `@types/node`, which is not installed and arrives
through nothing else. `D-012` fixed the dependency count at five and said a sixth needs a decision.

## Decision

Add `@types/node` as the sixth dev dependency, for typechecking only. It ships declarations and no
runtime code, so `core/` stays testable with nothing installed and `npm test` still runs on
`node --test` alone — the line `D-012` drew is untouched.

## Consequences

- The typecheck gate covers the tests that guard the rules, instead of stopping at the rules.
- The count in `D-012` becomes six. That decision is superseded by this one on the number alone;
  its reasoning about which dependencies are not optional stands.
- `@types/node` must track the pinned Node line (`D-013`), so a Node bump now moves two pins.
- Rejecting this leaves the gate with a hole that no amount of care closes, since the failure is
  silence. Excluding the tests to keep the count at five would be narrowing a check to stay green.

## References

- `docs/tasks/T-001-skeleton-and-next-action.md` § Review · `D-012`, `D-013`
