# D-031 — Hosting returns, to Cloudflare Workers

- Status: accepted
- Date: 2026-09-22
- Supersedes: D-020
- Tasks: T-036, T-038, T-039, T-040
- Foundation: deploy

## Context

`D-020` put Ritmo on the owner's machine and said so as a stage: "hosting returns as its own
decision". On 2026-09-22 the owner asked for it back — they need the product from anywhere, which
is `NFR-1`'s phone requirement, recorded as unmet for as long as `D-020` held.

## Decision

**Ritmo is served by Cloudflare Workers.** The owner chose the host; the store it needs is
`D-032`, the runtime `D-033`, the adapter `D-034`.

**Authentication is now mandatory.** `D-020` said auth "becomes mandatory again the moment anything
is exposed, and no hosting decision may supersede this without saying so." This says so. `D-004` is
built in `T-039`, and `T-040` does not deploy until `T-039` is done.

## Consequences

- **`NFR-1` becomes reachable and therefore testable.** Under twenty seconds to a saved entry, on a
  phone, verified by the owner on their own phone in `T-040` — timed, not estimated.
- **The data stops being only the owner's.** With `D-032` it rests at Turso, who can technically
  read it; Cloudflare handles it in transit through the Worker. `NFR-4`'s old wording named
  Cloudflare as the holder and is now wrong twice over; it is rewritten. `FR-21`'s export is what
  keeps the owner from being locked in, and `T-037` built it against a local file that `D-032`
  removes — `T-038` carries it across or the promise lapses.
- The single-vendor dependence the owner left Cloudflare to avoid is answered by `D-032` putting
  the data somewhere else, not by this decision.
- `D-020`'s Docker deferral stands until something needs it.

## References

- `D-020` · `D-004` · `D-032` · `D-033` · `D-034` · `NFR-1`, `NFR-4`, `FR-21`
