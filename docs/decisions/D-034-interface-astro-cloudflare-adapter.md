# D-034 — Astro keeps the interface, on the Cloudflare adapter

- Status: accepted
- Date: 2026-09-22
- Supersedes: D-021
- Tasks: T-038, T-040
- Foundation: interface

## Context

`D-021` settled Astro with `@astrojs/node` in standalone mode, for the local runtime `D-018` chose.
`D-033` moves production to Workers, which that adapter cannot target.

## Decision

**Astro stays; the adapter changes to Cloudflare's.** Nothing about server-rendered pages, the
component structure or the design system changes — `D-007`, `D-008` and `D-017` stand untouched.
The adapter and its version are pinned exactly, per `D-013`.

## Consequences

- `astro.config.mjs` grows a second configuration, or a conditional one. Local development keeps
  the Node adapter so the gates and `npm run dev` are unchanged.
- **Two build targets means one can break unnoticed.** `npm run build` is a gate; it must build
  what actually deploys, not only the local variant.
- Adapter versions move. `T-038` checks the current Cloudflare adapter against live documentation
  rather than recalling it, as `agent-config.md` requires.

## References

- `D-021` · `D-013` · `D-031` · `D-033` · `docs/project/agent-config.md`
