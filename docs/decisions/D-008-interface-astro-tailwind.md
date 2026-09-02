# D-008 — Astro and Tailwind, islands only where earned

- Status: superseded
- Date: 2026-08-29
- Supersedes: D-007
- Tasks: none
- Foundation: interface

## Context

`D-007` chose hand-written server-rendered HTML with no framework, to keep the critical path small
for `NFR-1` — a saved entry in under 20 seconds on a phone. The owner wants a component model, for
Tailwind and for atomic design, which hand-written HTML does not give.

## Decision

Astro with SSR on Workers via the official `@astrojs/cloudflare` adapter, which supports D1
bindings. Tailwind for styles, components organised by atomic design. **Zero client JavaScript by
default**; React is permitted only as an island, in a component that demonstrably needs it, never as
the rendering base.

## Consequences

- `D-007`'s *intent* survives: Astro ships no client JS unless asked, so the critical path stays
  small. What changes is the tooling, not the shape of what reaches the phone.
- A build step and a real dependency tree enter the project. `D-006` claimed near-zero dependencies;
  that is now true only of the core and its tests. Dependencies age worst in a project touched every
  few weeks, and this is the cost accepted for a component model.
- Atomic design needs components to nest; Astro provides them, loose HTML did not.
- SSR renders on the Worker, so templates consume the 10 ms CPU budget (`D-001`). Bounded derived
  windows matter more, not less.
- Every island is a decision with a reason, not a default. An island that exists for convenience is
  a defect against `NFR-1`.

## References

- `docs/project/requirements.json` NFR-1, NFR-6
- `D-001`, `D-003`, `D-007`
