---
id: T-043
title: Identity moves out of the environment and into the database
status: ready
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Make the session resolve *who is asking* from their own credential rather than from
  `RITMO_OWNER_ID`, so that a second account is an insert and not a redeploy — leaving the existing
  owner signed in throughout as the first account.
decisions: [D-037]
implements: [NFR-2, NFR-3]
---

## Sources

- `D-037` — several people, each their own, no sharing
- `adapters/http/session.ts:70` — `readAuthConfig`, which requires `RITMO_OWNER_ID` and
  `RITMO_PASSWORD_HASH`. Both leave; `RITMO_SESSION_SECRET` and `RITMO_AUTH_ORIGIN` stay.
- `adapters/http/session.ts:56` — `authenticate`, which today compares the cookie's `ownerId`
  against the configured one, and `:62` where a password session is a hash of the configured hash
- `adapters/http/auth.ts:83` — `store.getOwner(config.ownerId)`, and `:84`
  `allowAuthAttempt(config.ownerId, …)`, which **cannot work before the person is known**
- `core/ports/store.ts:23` — `getOnlyOwner()`, which `D-037` retires
- `migrations/0001_initial_schema.sql` — `owners`, which gains what identity needs

## Scope

- A migration giving `owners` its own password hash, and whatever an account needs to be found at
  sign-in without being enumerable
- `readAuthConfig` reduced to secret and origin
- `authenticate` resolving the account from the credential presented, not from configuration
- Password sign-in that finds the account, with a **constant-time path whether or not it exists**
- Rate limiting that works before the account is known — by origin or connection, not by `ownerId`
- `getOnlyOwner()` removed from the port and both adapters, and from every caller
- The existing owner migrated to the new shape **without being signed out or having to re-register
  a passkey**

## Out of Scope

- Creating accounts — `T-044`. This task makes a second account *possible*, not reachable.
- Any screen — `T-045`.
- Sharing anything between accounts, ever (`D-037`, `NFR-2`).

## Acceptance Criteria

- [ ] Two accounts can exist, and each sees only its own areas, projects, steps and entries —
      tested by seeding two and asserting every read is empty across the boundary
- [ ] `/api/export` returns only the requesting account's rows (`FR-25`)
- [ ] Sign-in takes the same time for an account that does not exist as for a wrong password, and
      the response does not say which it was
- [ ] Rate limiting still bites before anyone is identified, and one account being limited does not
      lock out another
- [ ] `grep -rn getOnlyOwner` returns nothing outside history
- [ ] The owner's existing session and passkeys keep working across the migration
- [ ] `npm run check:core` stays clean

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, green, with the remote half run — `docs/development.md` explains `sqld`
- Task-specific: **the cross-account test is the task.** Seed two accounts with data and request
  every read route as each of them. A leak here is not a bug, it is one person reading another's
  private record, and no gate in this repository would notice.
- Task-specific: rehearse the migration on a copy of the owner's database, then confirm their
  session and passkey still work. Stop the application first — migrations apply on `openDatabase()`
  (`T-031`'s review).

## Assumptions

- The owner keeps their `ownerId`. Anything else invalidates their passkeys, which are bound to
  the credential rows, not to the id — but there is no reason to find out.

## Risks

- This is the task where a mistake means one person reading another's data. Everything else in
  `D-037` is convenience; this is the boundary.
- `allowAuthAttempt` currently needs an `ownerId` it will no longer have. Reusing it unchanged is
  the most likely wrong turn, and `D-037` says so.

## Outcome

Filled in as the task progresses; overwritten, not appended.

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- Severity · `file:line` · issue · impact · recommendation

## Validation

- Validated by:
- Date:
