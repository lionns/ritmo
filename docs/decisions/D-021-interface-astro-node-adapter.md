# D-021 — The same Astro, on the Node adapter

- Status: accepted
- Date: 2026-09-02
- Supersedes: D-008
- Tasks: T-011
- Foundation: interface

## Context

`D-008` chose Astro with SSR "on Workers via the official `@astrojs/cloudflare` adapter, which
supports D1 bindings". `D-018` and `D-019` moved both of those. Everything else `D-008` decided is
independent of the host and is carried forward here verbatim rather than re-argued.

## Decision

**Astro with SSR via the official `@astrojs/node` adapter.** Unchanged from `D-008`: Tailwind for
styles, components organised by atomic design, **zero client JavaScript by default**, and React
permitted only as an island in a component that demonstrably needs it, never as the rendering base.

## Consequences

- One line of `astro.config.mjs` and one dependency swap; no template, component or style changes.
  `src/` holds no adapter reference, which is why this is a configuration change and not a port.
- The database arrives as a constructed store rather than a platform binding, so the wiring that
  `runtimeStore()` hides moves with it and stays behind the same port.
- This supersedes rather than amends because `D-008`'s decision sentence names the Cloudflare
  adapter, and an accepted decision that names the wrong adapter is a false record (`TEMPLATES.md`).
- The image handling `@astrojs/cloudflare` provided is not present in `@astrojs/node`. Nothing in
  the product uses it today; a task that needs it must say so rather than assume it.

## References

- `D-008` · `D-018` · `D-019` · `docs/project/architecture.md` § Layout
