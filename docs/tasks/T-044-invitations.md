---
id: T-044
title: Invitations — a single-use link, and no way in without one
status: ready
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Let an account issue a single-use invitation that expires, and let whoever holds it create
  their own account with it — so Ritmo grows by being handed to someone, never by being found.
decisions: [D-037]
implements: [FR-24]
---

## Sources

- `D-037` — invitation only, no open registration, and the warning that issuing invitations is
  "the product's first asymmetry. Keep it that narrow."
- `T-043` — accounts resolvable from their own credential. This task cannot start before it.
- `migrations/0007_auth_challenges.sql` — the existing pattern for short-lived, single-use rows
  with an expiry, and `adapters/http/auth.ts:115` for consuming one exactly once
- `adapters/http/password.ts` — the scrypt parameters and the 15-character minimum a new account
  will meet

## Scope

- An invitations table: a token nobody can guess, who issued it, when it expires, and whether it
  was used — consumed atomically, exactly once, like a challenge
- Issuing an invitation, and listing and revoking the ones still open
- Redeeming one: choose a password, register a passkey, and land signed in
- Whatever decides **who may issue** — the narrowest thing that works

## Out of Scope

- Email. Ritmo sends nothing (`NFR-9`); the link is copied and handed over by the owner.
- Roles, groups or any permission beyond "may issue an invitation" (`NFR-2`, `D-037`).
- Screens — `T-045`.

## Acceptance Criteria

- [ ] An invitation is single-use: redeeming it twice fails the second time, proven under two
      simultaneous redemptions rather than two sequential ones
- [ ] An expired, revoked, unknown or altered token is refused, each with its own test, and the
      refusal never says which of the four it was
- [ ] Redeeming creates exactly one account, with its own password and passkey, and that account
      can see nothing belonging to anyone else
- [ ] A token is long enough and random enough that guessing is not a strategy, and is compared in
      constant time
- [ ] Nobody without an invitation can create an account by any route
- [ ] Revoking an open invitation takes effect immediately

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, green, with the remote half run
- Task-specific: try to create an account without a token, by every route that exists — enumerate
  them, do not sample. This is the only door into the product and there must be exactly one.
- Task-specific: redeem the same invitation twice at once against a real store, on both adapters.
  Single-use that is only single-use sequentially is not single-use.

## Assumptions

- The owner hands the link over themselves, by whatever channel they choose. Ritmo neither knows
  nor stores who it was meant for.

## Risks

- An invitation token is a credential in a URL: it lands in browser history, and in whatever
  application it was pasted into. A short expiry is what limits that, and it belongs in the
  decision of how short rather than in a default nobody chose.

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
