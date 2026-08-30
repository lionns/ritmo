# D-007 — Server-rendered HTML, and NFR-6 narrowed

- Status: accepted
- Date: 2026-08-29
- Supersedes: none
- Tasks: none
- Foundation: interface

## Context

Two written requirements pulled against each other. NFR-1 demands a saved entry in under twenty
seconds from opening the app, which argues for the smallest possible thing to download on a phone.
NFR-6 demanded the portfolio open without a network round trip, which argues for a cached client
application — more code, and more of it in the critical path.

## Decision

Server-rendered HTML with progressive enhancement, mobile-first, no client framework. **NFR-6 is
narrowed**: the portfolio must render fast, not render offline. The owner accepted losing offline
reads rather than carry a client cache and its synchronisation.

## Consequences

- The smallest surface to build and the fastest to open on a phone, which serves NFR-1 directly.
- Ritmo does not work without a connection. On a train or with no signal, logging waits.
- If that turns out to bite, the fix is one adapter (D-003) and a superseding decision, not a
  rewrite — but it is a real loss taken deliberately, not an oversight.

## References

- `docs/project/requirements.json` NFR-1, NFR-6
- `D-003`
