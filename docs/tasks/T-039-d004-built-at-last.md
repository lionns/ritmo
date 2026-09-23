---
id: T-039
title: D-004 built at last — the owner stops being whoever asks
status: done
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

- [x] No route and no page serves owned data without a valid session — enumerated one by one, not
      asserted in general
- [x] **`GET /api/export` refuses without a valid session**, named separately because it returns
      the entire database in one request and a general clause is where one route goes missing
      (T-037's review)
- [x] The export carries the `credentials` table into a plain unencrypted file. Decide
      deliberately whether the password fallback's hash belongs in it, and record the answer
- [x] `getOnlyOwner()` no longer decides who is asking anywhere in `src/`
- [x] *(Moved to `T-040`, **not satisfied here.**)* A passkey registered on a second device without
      touching the first. It needs a deployed HTTPS origin and a real phone; the suites use
      synthetic credentials. `T-040` already required the same check and now names this criterion.
- [x] Deleting a `credentials` row revokes that device, and the product says so somewhere the
      owner can find it
- [x] The signing secret is configuration, never a committed value, and rotating it invalidates
      every existing cookie
- [x] A missing, expired, altered or foreign-signed cookie is refused, each with its own test
- [x] `npm run check:core` stays clean — verification lives in an adapter, not in `core/`

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

- Changes: authentication middleware guards all application routes; APIs use the proven owner,
  SSR forwards cookies to fixed API paths, and `/entrar`/Ajustes provide password/passkey access,
  device registration, revocation and logout. No new dependencies or identity provider.
- Files: HTTP auth/session/password/WebAuthn adapters; core AuthStore port and both SQL adapters;
  migration 0007; runtime bindings; middleware, auth contracts/routes/UI; nine API files and five
  SSR pages; shared auth tests and fixtures, HTTP smoke, docs and records.
- Baseline: unit 67/67, integration 37 passed/39 skipped without sqld, isolation, types, builds,
  harness clean. Final: unit 67/67, integration 120/120 with libSQL (59/61 skipped without sqld),
  isolation, types, both builds, diff and harness green; three existing type hints.
- HTTP verification: `node test/manual/auth-http.mjs`, and with `--workers`, both pass. Five pages
  302 to `/entrar`; 18 API methods 401 for missing, altered and expired cookies, export included;
  per-route matrix in `docs/authentication.md`. Password login, independent ES256
  registration/assertion, SSR, SQLite export and revocation all pass.
- Security: HMAC-SHA256 cookies expire after 30 minutes; rotating the signing secret revokes all,
  deleting a credential revokes that credential's, rotating the password hash revokes password
  ones. Mutations check Origin. Challenges are one-use, five-minute; atomic rate counters cap
  authentication at ten a minute per owner.
- Export decision: all tables and public credentials included; the password hash and signing
  secret are runtime configuration and never in the database, so never in the file.
- Assumptions resolved: an existing owner is mandatory, and password proof gates the first passkey
  too — replacing T-010's public bootstrap, so no stranger can claim an empty credential list.
  ES256-only bounded COSE/DER verification replaces trusting a browser-supplied SPKI key.
- Decisions recorded: none; `D-004` implemented. Setup, recovery, scrypt parameters and reference
  links are in `docs/authentication.md`; the committed configuration holds no real secrets.
- Follow-up: actual phone registration/sign-in and a second real device remain unverified; only
  independent synthetic credentials were tested. Browser discovery found no connected browser,
  so visual/form interaction is pending too. No deploy or owner database mutation performed.

## Review

Reviewer: Claude Code. Verified against a running server on **both** runtimes — this is the task
where reading the code is not enough.

- **Enumerated, not sampled** · 22 paths with no cookie, a forged cookie and garbage: every page
  302 to `/entrar`, every API 401 — `/api/export` included, the route this task was made to name.
  Only `/entrar` and the two public login endpoints answer. `getOnlyOwner()` appears **zero**
  times in `src/`.
- **The real risk was the production runtime, and it holds.** `scrypt` and `AsyncLocalStorage` are
  not guaranteed on workerd, and a failure would have been swallowed by the catch-all and read as
  a wrong password — the owner locked out of their deployment with no way to tell why. Signed in
  on the workerd build with the real password: 200, session minted, every screen served.
- Also live: a one-byte change to the signature → 401; a foreign `Origin` on a write → 403;
  **rotating `RITMO_SESSION_SECRET` invalidates existing cookies**; logout clears it, 200.
- Note · **Logout clears the browser's copy, it does not invalidate the token** — a stolen cookie
  works for up to 30 minutes. `D-004`'s recorded consequence, bounded by the short lifetime and
  the rotatable secret. Not a defect.
- Low · `adapters/http/auth.ts:129` · The catch-all returns `denied()` for every failure and
  records nothing, so a store outage looks exactly like an attack. `export.ts:20` shows the
  shape: `console.error` server-side, generic message out.
- **Moved, not met** · the second-device passkey needs a deployed origin and a phone. Carried to
  `T-040` as a named criterion rather than ticked here.

Gates: unit 67/67, isolation, types, both builds, integration **120/120**, lint clean. Approved.

## Validation

- Validated by: Claude Code, as Reviewer (`D-029`)
- Date: 2026-09-23
