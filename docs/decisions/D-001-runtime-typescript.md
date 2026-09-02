# D-001 — TypeScript end to end, on the Workers runtime

- Status: superseded
- Date: 2026-08-29
- Supersedes: none
- Tasks: none
- Foundation: runtime

## Context

Ritmo is built and maintained by one person in uneven time, often after weeks away. What matters
most is not raw speed of writing but how cheaply the project can be picked back up, and how few
moving parts rot while it is untouched.

## Decision

TypeScript for both server and browser, with types checked against `data-model.md` and shared
across the boundary. The server runs on the Workers runtime — V8 isolates with Web APIs, **not
Node** — so Node built-ins are available only through the opt-in compatibility layer, and only
partially. No second language in the stack.

## Consequences

- One context to reload instead of two, and the data model is enforced by the compiler on both
  sides rather than restated by hand.
- Matches what the owner already works in daily, so the fixed job keeps the skill warm.
- Library choice narrows: anything assuming Node's filesystem, native modules or long-lived process
  state is out. For a server that renders HTML from a database this costs little.
- The runtime version is pinned by a compatibility date rather than by an installed Node release.
- **10 ms of CPU per invocation shapes the domain.** Waiting on the database is free, computing is
  not, so every derived value in `D-003` must run over a bounded window. Found while reviewing these
  seven together; the calibration factor was the one still unbounded.
- Rules out Python or Go on the server without superseding this decision.

## References

- `docs/project/brief.md` § Constraints
- `docs/project/data-model.md`
