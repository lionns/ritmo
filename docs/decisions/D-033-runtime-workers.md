# D-033 — The runtime is the Workers runtime

- Status: accepted
- Date: 2026-09-22
- Supersedes: D-018
- Tasks: T-038, T-040
- Foundation: runtime

## Context

`D-018` settled the runtime as Node, running locally, when `D-020` took Ritmo off hosting. `D-031`
puts it back on Cloudflare Workers, which is a different runtime with different globals.

## Decision

**Ritmo runs on the Workers runtime in production**, and on Node locally for `npm run dev`, the
five gates and the local store. Both are served by the same `core/`, which is why
`scripts/check-core-isolation.mjs` exists and why this is a swap rather than a rewrite.

## Consequences

- **`check:core` earns its keep or fails here.** It has kept platform globals out of `core/` since
  the first task against a single runtime. A second runtime is the first real test of that claim,
  and anything it let through surfaces in `T-038`.
- Node built-ins available today are not available on Workers. `node:sqlite` is the known one
  (`D-032`); `node:fs`, `node:os` and `node:crypto` are used by the export and the id generator and
  each needs checking rather than assuming.
- The gates keep running on Node, so green gates stop being proof that production works. `T-040`
  verifies against the deployed URL, not only locally.

## References

- `D-018` · `D-031` · `D-032` · `docs/project/quality-gates.md`
