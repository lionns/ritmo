# D-012 — node --test for the core, and the five dependencies the platform really costs

- Status: accepted
- Date: 2026-08-31
- Supersedes: D-006
- Tasks: T-001
- Foundation: tests

## Context

`D-006` settled the test strategy and then miscounted its price, recording "one dev dependency".
The npm registry, read while planning `T-001`, shows five: `@cloudflare/vitest-pool-workers` declares
`vitest` as a peer and `@astrojs/cloudflare` declares `wrangler` as one, so neither is ours to pick.

## Decision

The strategy of `D-006` carries forward unchanged: Node's built-in runner over the pure core with
nothing installed for it, and Cloudflare's tooling for the adapter against a local D1. What changes
is the recorded cost — five dev dependencies, each named with the reason it is not optional:

- `typescript` and `@astrojs/check` — the `typecheck` gate (`D-008`).
- `wrangler` — peer of `@astrojs/cloudflare`, and what applies the migrations.
- `vitest` and `@cloudflare/vitest-pool-workers` — the integration test that satisfies the harness's
  demand for a check exercising a change in composition. The pool declares the runner as a peer.

## Consequences

- The line worth protecting still holds: `core/` is testable with nothing installed, and `npm test`
  keeps working across Node upgrades without a toolchain to maintain.
- Dependency rot now has five surfaces instead of one. All five sit in the adapter and build path;
  the core is untouched by them, which was the point of drawing the line there.
- The count is checkable against `package.json` instead of asserted in prose. That is the repair:
  `D-006` was not wrong about what to do, only about a fact it stated.
- Superseding rather than editing keeps the miscount visible: a record that quietly corrects itself
  teaches nothing.

## References

- `docs/project/quality-gates.md` · `docs/tasks/T-001-skeleton-and-next-action.md` · `D-008`
