# D-003 — A pure core behind ports, enforced by a check

- Status: superseded
- Date: 2026-08-29
- Supersedes: none
- Tasks: none
- Foundation: boundaries

## Context

Two things here are likely to change and one is not. The store and the host may move; the rules —
reserves, derived objective state, stale rate, calibration — are the product and should outlive
both.

## Decision

A core module holding the domain rules with no I/O of any kind, reached through ports. Adapters
implement the ports: one for storage (D1), one for HTTP. Derived values are computed in the core and
never stored, so they cannot drift from the log.

**The boundary is checked, not trusted.** No file in the core may import from `@cloudflare/*` or
`cloudflare:*`, name the `Env` binding type, or touch any platform API. A zero-dependency script in
`scripts/` enforces it and runs in the baseline gate, in the same shape as the harness's own linter.
The HTTP adapter is written by hand against the Workers `fetch` handler — no routing library, since
for this surface routing is a few dozen lines and a dependency in the critical path is the thing
that ages worst here.

## Consequences

- The rules are testable with nothing installed, which is what makes `node --test` enough (D-006).
- Portability stops being an intention. Coupling leaks one small well-excused import at a time and
  is invisible until someone tries to move; the check catches it the day it happens. Leaving
  Cloudflare then means rewriting two adapters, not the product.
- Costs indirection a single-user app does not strictly need, and one more baseline check.
- Ownership stays an explicit core concept (NFR-3), not an assumption baked into queries.

## References

- `docs/project/requirements.json` NFR-3
- `D-002`, `D-007`
