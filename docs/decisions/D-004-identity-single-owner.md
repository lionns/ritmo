# D-004 — One owner, session cookie, no third party

- Status: accepted
- Date: 2026-08-29
- Supersedes: none
- Tasks: none
- Foundation: identity

## Context

Ritmo serves exactly one person and builds no sharing (NFR-2), but the brief requires that adding a
second party later be additive rather than a migration (NFR-3). The data is private enough that
handing authentication to a third party is itself a cost.

## Decision

A single owner authenticates with a passkey, or a password if passkeys are unavailable on a device,
and holds a **stateless signed cookie** — no session table and no session store, which suits a
runtime with no long-lived process. The passkeys themselves do persist, in a `credentials` table:
one row per device, so a lost phone is revoked by deleting its row. No OAuth, no external identity provider, no account creation
flow. The `owners` row exists from the first migration and every owned row carries its id.

## Consequences

- No third-party identity provider ever sees who the owner is.
- Revoking a session before it expires needs a deliberate mechanism, since there is nothing to
  delete server-side. Short lifetimes plus a rotatable signing secret cover it.
- Because ownership is a real column rather than an implied singleton, a second party is an insert.
- The owner is responsible for their own recovery; a lost credential means direct database access.
- Rules out "log in with Google" without superseding this.

## References

- `docs/project/requirements.json` NFR-2, NFR-3
- `docs/project/data-model.md` § Owner
