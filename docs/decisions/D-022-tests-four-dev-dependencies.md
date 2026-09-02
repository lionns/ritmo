# D-022 — Four dev dependencies after the platform test harness leaves

- Status: accepted
- Date: 2026-09-02
- Supersedes: D-014
- Tasks: T-011
- Foundation: tests

## Context

`D-014` records six dev dependencies because the D1 integration needs both Vitest and Cloudflare's
pool, and the Cloudflare adapter needs Wrangler. `D-018`, `D-019` and `D-021` remove both platform
tools. T-011 requires the integration gate to keep exercising the real store and migrations.

## Decision

Keep Vitest for the integration gate and remove `@cloudflare/vitest-pool-workers` and `wrangler`.
The four dev dependencies are `typescript`, `@astrojs/check`, `@types/node` and `vitest`. The four
runtime dependencies remain unchanged in number; `@astrojs/node` replaces `@astrojs/cloudflare`.

## Consequences

- Integration tests run directly against temporary SQLite files through `node:sqlite`, with no
  runtime emulator or vendor account.
- The core still runs under `node --test` with no installed test framework.
- The dev dependency surface falls from six packages to four without weakening either gate.

## References

- `D-014` · `D-018` · `D-019` · `D-021` · `docs/project/quality-gates.md`
