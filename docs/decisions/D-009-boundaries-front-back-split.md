# D-009 — Three layers, and no data reaches a template

- Status: accepted
- Date: 2026-08-29
- Supersedes: D-003
- Tasks: none
- Foundation: boundaries

## Context

`D-003` put the domain rules in a pure core behind ports and enforced it with a check — that part
holds and is carried forward. Two of its clauses did not survive `D-008`: Astro owns routing, so the
"HTTP adapter written by hand against the `fetch` handler" no longer exists, and the owner requires
the front separated from the back, with no template reading data directly.

## Decision

Three layers, each allowed to depend only inward, all three enforced by `npm run check:core`:

- **`core/`** — rules, model, ports. Imports nothing at all.
- **`adapters/`** — `d1/` implements the store and is the **only** place that may import
  `cloudflare:*`; `http/` holds session, form parsing and error mapping, and is not a router.
- **`src/`** — Astro. `src/pages/api/**` is the back and may reach adapters and core.
  `.astro` routes and components are the front: they may import **`contracts/` only**, and reach
  data through `/api/*`. A template importing an adapter is a failed baseline, not a code review note.

`contracts/` holds the request and response types and nothing else — the one thing both sides share.

## Consequences

- Cloudflare lives in exactly one directory instead of leaking into every page.
- The front is replaceable without touching the back, and a native client later needs no new API.
- Each page render costs a subrequest to its own Worker. Numerically irrelevant on the free plan, and
  it buys something back: rendering and data work each get their own 10 ms CPU budget.
- A contract now exists to keep in sync; `contracts/` is what keeps that from spreading.

## References

- `docs/project/architecture.md` § Layout · `D-008`, `D-001`
