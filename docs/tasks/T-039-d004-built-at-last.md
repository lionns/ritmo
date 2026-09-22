---
id: T-039
title: D-004 built at last — the owner stops being whoever asks
status: ready
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Build `D-004` as specified — a passkey per device, a password fallback, a stateless signed
  cookie — so that `getOnlyOwner()` stops standing in for authentication and Ritmo can be reached
  from the network without publishing an open write endpoint.
decisions: [D-004]
implements: [NFR-2, NFR-3]
---

## Sources

- `docs/decisions/D-004-identity-single-owner.md` § Decision — passkey, password fallback,
  stateless signed cookie, the `credentials` table with one row per device so a lost phone is
  revoked by deleting a row, no external identity provider
- **`docs/tasks/T-010-passkey-and-the-signed-cookie.md`**, status `superseded`. It is this task,
  planned in full and shelved when `D-020` took auth off the critical path. Read it before
  planning anything new — most of the work is already thought through there, against harness
  `0.8.1` and the Cloudflare runtime, both of which have since changed.
- `D-012` — five dev dependencies, each named. The owner chose to implement passkeys by hand on
  2026-09-01 rather than spend a sixth. That choice stands unless they revisit it.
- `D-020` — "Auth leaves the critical path ... **It becomes mandatory again the moment anything is
  exposed**", and T-036's decision, which discharges that condition
- `src/pages/api/entries.ts:22` — `store.getOnlyOwner()`, the pattern to replace. Every route that
  touches owned data does the same thing: it asks the database who the single owner is and trusts
  the request.
- `migrations/0001_initial_schema.sql` — `credentials` as declared, and `data-model.md` § Credential,
  where `signCount` is checked to detect a cloned authenticator

## Scope

- Registering a passkey per device, verifying an assertion, and the password fallback
- A stateless signed cookie with a short lifetime and a rotatable signing secret
- `/entrar`, which `design-handoff.md` § Navigation Map already describes
- Replacing `getOnlyOwner()` at every call site with the owner the session proves
- Refusing every route and every page that touches owned data when there is no valid session

## Out of Scope

- Accounts, sign-up, sharing, or a second party (`NFR-2`). The `owners` row already exists; this
  authenticates the person who owns it, it does not create anyone.
- Any external identity provider (`D-004` rules it out without superseding).
- Password reset flows. `D-004` is explicit: the owner is responsible for their own recovery, and
  a lost credential means direct database access.

## Acceptance Criteria

- [ ] No route and no page serves owned data without a valid session — enumerated one by one, not
      asserted in general
- [ ] **`GET /api/export` refuses without a valid session**, named separately because it returns
      the entire database in one request and a general clause is where one route goes missing
      (T-037's review)
- [ ] The export carries the `credentials` table into a plain unencrypted file. Decide
      deliberately whether the password fallback's hash belongs in it, and record the answer
- [ ] `getOnlyOwner()` no longer decides who is asking anywhere in `src/`
- [ ] A passkey can be registered on a second device without touching the first
- [ ] Deleting a `credentials` row revokes that device, and the product says so somewhere the
      owner can find it
- [ ] The signing secret is configuration, never a committed value, and rotating it invalidates
      every existing cookie
- [ ] A missing, expired, altered or foreign-signed cookie is refused, each with its own test
- [ ] `npm run check:core` stays clean — verification lives in an adapter, not in `core/`

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, all green
- Task-specific: with the server running, request **every** route and page with no cookie, with a
  tampered cookie, and with an expired one, and record what each returns. One route left open is
  the whole product left open, and no gate in this repository can see it.
- Task-specific: register and sign in with a passkey on a real phone. This is the requirement's
  actual surface and it cannot be verified from a terminal.

## Assumptions

- T-010's plan is still broadly sound. It was written for the Workers runtime and harness `0.8.1`;
  what changed is the runtime T-036 picks, not the shape of `D-004`.

## Risks

- This is the only task in the repository where a defect is not a bug but an exposure, and where
  the owner's entire record is what is exposed. The enumeration in Verification is the task, not
  paperwork around it.
- `T-040` must not deploy before this is done. `D-020` allows no reading in which it does.

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

`team` only — required before `done`, and linted.

- Validated by:
- Date:
