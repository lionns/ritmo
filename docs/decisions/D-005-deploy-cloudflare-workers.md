# D-005 — Cloudflare Workers, and the privacy constraint reversed

- Status: accepted
- Date: 2026-08-29
- Supersedes: none
- Tasks: none
- Foundation: deploy

## Context

The design assumes logging happens away from a desk, so Ritmo must be reachable from a phone. The
first plan was a VPS the owner rents. The owner then required the deployment to be free, which means
managed — reversing `brief.md`'s constraint that the data stays on infrastructure the owner
controls. That constraint always allowed the reversal "with an explicit decision"; this is it.

## Decision

Cloudflare Workers, on the free plan, serving HTML directly. No VPS, no container, no reverse proxy,
no certificates and no backup schedule to run — which also makes the earlier choice of Docker moot,
since there is nothing to containerise. Verified free limits: 100,000 requests/day, 10 ms CPU per
invocation, static assets free and unlimited.

## Consequences

- Zero cost and zero recurring maintenance. That matters more than it looks: a VPS is a standing
  obligation competing for the same hours as the projects Ritmo exists to advance.
- **Cloudflare can technically read the data.** It is encrypted in transit and at rest, but the keys
  are theirs. A full record of one person's life now sits with a US company under US law.
- The realistic risk is not surveillance but losing account access. `FR-21` — a full export to a
  downloadable SQLite file — is the mitigation and is required, not optional.
- Self-hosting was never the safer option, only the more controlled one: a VPS patched in uneven
  time is more exposed than Cloudflare's operations. What is ceded is control over access, not
  security.
- Returning to a VPS later is an adapter change (`D-003`) plus a superseding decision.

## References

- `docs/project/brief.md` § Constraints · `requirements.json` FR-21, NFR-4
- `D-002`, `D-003`
