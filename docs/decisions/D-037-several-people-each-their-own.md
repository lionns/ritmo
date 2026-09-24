# D-037 — Several people, each their own Ritmo, by invitation

- Status: accepted
- Date: 2026-09-24
- Supersedes: D-004 (its single-owner and no-account clauses only; the rest of it stands)
- Tasks: T-043, T-044, T-045
- Foundation: identity

## Context

`NFR-2` fixed Ritmo at exactly one owner, while `NFR-3` required ownership to be modelled anyway
"so that adding a second party later is additive rather than a migration" — and it was honoured: 25
`owner_id` columns, 14 port methods carrying `ownerId`, `currentOwnerId()` resolving per request.
The data layer is multi-tenant already; identity is not, arriving as environment variables.

## Decision

**Ritmo serves several people, each seeing only their own portfolio.** Identity moves from
configuration into the database, and the existing owner becomes the first account.

**No sharing of any kind.** `NFR-2`'s ban on sharing, teams, permissions and comments stands
untouched; only "exactly one owner" and "no accounts" are withdrawn.

**Accounts are created by invitation** — a single-use link that expires, redeemed by choosing a
password and a passkey. No open registration: a personal Worker is no place for strangers to write.

## Consequences

- **The product's first asymmetry**: someone issues invitations, so a tool with no permissions now
  has exactly one. Keep it that narrow.
- **`NFR-7` must survive company.** Nothing may aggregate, rank or compare across people. The
  reason Ritmo works is that nobody is watching.
- Rate limiting is `allowAuthAttempt(ownerId, minute)`, and a shared sign-in page does not know
  who is asking. Rethink it, do not reuse it.
- `getOnlyOwner()` becomes meaningless and leaves the port and both adapters.
- `FR-21`'s export is per person and must never carry another account's rows.

## References

- `D-004` · `NFR-2`, `NFR-3`, `NFR-7` · `core/ports/store.ts` · `adapters/http/session.ts`
