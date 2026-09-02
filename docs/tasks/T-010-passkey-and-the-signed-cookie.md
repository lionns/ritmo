---
id: T-010
title: The passkey and the signed cookie — the owner stops being a constant
status: superseded
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Build `D-004` as specified — a passkey registered per device, verified with Web Crypto and no
  new dependency, carrying a stateless signed cookie — so that `LOCAL_OWNER_ID` disappears from the
  endpoints and Ritmo can be deployed without publishing an open write endpoint.
decisions: [D-004, D-012]
implements: [NFR-3, AC-X9]
---

## Sources

- `docs/decisions/D-004-identity-single-owner.md` § Decision — passkey, the password fallback,
  the stateless signed cookie, the `credentials` table, no external identity provider
- `docs/decisions/D-012-tests-dependency-count.md` — five dev dependencies, each named. Owner chose
  passkey by hand on 2026-09-01 rather than spend a sixth
- `migrations/0001_initial_schema.sql:9` — `credentials` as built · `docs/project/data-model.md`
  § Credential — `signCount` is checked to detect a cloned authenticator
- `docs/project/architecture.md` § Layout — `adapters/http/` is "session verification, form parsing
  and error mapping. Not a router"; the directory does not exist yet
- `docs/project/design-handoff.md` § Navigation Map — `/entrar` is "Passkey sign-in, only without a
  session". One row; no section draws it
- `src/pages/api/entries.ts:22` and `portfolio.ts` — the two `LOCAL_OWNER_ID` call sites

## Scope

- `adapters/http/session.ts` — mint and verify the stateless cookie: HMAC over owner id and expiry
  with `crypto.subtle`, `HttpOnly`, `Secure`, `SameSite=Lax`. The signing secret is a binding, never
  a literal. Rotating the secret invalidates every session, which is `D-004`'s stated revocation.
- `adapters/http/webauthn.ts` — registration and assertion verification. Origin and RP ID checked,
  challenge checked, `signCount` compared and stored.
- `core/ports/store.ts` and `adapters/d1/store.ts` — the credential methods the port lacks: create,
  find by `credentialId`, list for an owner, update `signCount` and `lastUsedAt`.
- `contracts/auth.ts` — the request and response types for both endpoints.
- `src/pages/api/auth/` — begin and finish, for register and for sign-in.
- `src/pages/entrar.astro` — the screen, and `design-handoff.md` § The Sign-In Screen, which does
  not exist and must, as `T-008` had to write § The Log Form.
- The guard: `/` and `/registrar` and both API routes read the owner from the cookie. Unauthenticated
  page requests redirect to `/entrar`; unauthenticated API requests return 401.
- **Bootstrap:** registration is allowed only while the owner has zero credentials. After the first
  passkey exists, registering another is `/ajustes`, and that is a later task.
- Coverage in `test/core/` for what is pure, and in `test/integration/` for the round trip against
  a real D1: register, sign in, reject a tampered cookie, reject a replayed `signCount`.

## Out of Scope

- **`/ajustes`.** Adding a second device, labelling it, revoking a lost one, the export. `D-004`
  needs all of it eventually; none of it is what unblocks a deploy.
- **The password fallback.** `D-004` allows it where passkeys are unavailable. Owner chose passkey
  on 2026-09-01; a fallback is a later task, not a silent omission.
- **Deploying.** `T-012`. This task must run locally on `npm run dev`, which WebAuthn permits on
  `localhost` without TLS — that exemption is what makes this task testable before the deploy.
- **Capture and setup.** `T-011`. Nothing here creates an area, a project or a next action.
- **Account creation.** There is one owner and its row exists from the first migration (`D-004`).
  Registration attaches a credential to it; it never inserts an owner.

## Acceptance Criteria

- [ ] WHEN the owner has no credential and completes registration at `/entrar`, THE SYSTEM SHALL
      store one `credentials` row and return a signed session cookie.
- [ ] WHEN the owner already has a credential, THE SYSTEM SHALL refuse registration with 409 and
      SHALL NOT write a row, so the bootstrap cannot be replayed by a stranger.
- [ ] WHEN a valid assertion is presented, THE SYSTEM SHALL verify the signature against the stored
      public key, update `signCount` and `lastUsedAt`, and return a session cookie.
- [ ] WHEN an assertion presents a `signCount` at or below the stored one, THE SYSTEM SHALL refuse
      it, because `data-model.md` § Credential says that counter detects a cloned authenticator.
- [ ] WHEN the cookie is absent, expired, or its HMAC does not verify, THE SYSTEM SHALL return 401
      from `/api/*` and redirect a page request to `/entrar`.
- [ ] `grep -rn "LOCAL_OWNER_ID" src/` returns nothing outside the seed path, and every write
      carries the owner id read from the verified cookie (`AC-X9`).
- [ ] `npm ls --omit=dev` lists the same four runtime dependencies as today (`D-012`).
- [ ] `npm run check:core` stays green: nothing in `adapters/http/` is imported by a front file.
- [ ] All five gates green from a clean `npm ci`, integration included.

## Verification

- Baseline: the five gates of `quality-gates.md`, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset && npm run seed && npm run dev`, then register a passkey on this
  machine, close the browser, reopen `/` and land signed in; delete the cookie and be sent to
  `/entrar`; edit one byte of the cookie and be sent to `/entrar` rather than served.
- Task-specific: with the dev server running, `curl -s -o /dev/null -w '%{http_code}' localhost:4321/api/portfolio`
  returns `401`, and the same call with a valid cookie returns `200`.

## Assumptions

- **`getPublicKey()` avoids parsing CBOR.** The browser's attestation response is expected to expose
  the credential public key as SPKI DER, which `crypto.subtle.importKey("spki", …)` accepts —
  removing COSE and CBOR from this task entirely. **Verify against current WebAuthn documentation
  before building**, per `agent-config.md` § Known Risks: platform APIs are retrieved, not recalled.
  If it is unavailable, parsing COSE is back in scope and this task is bigger than planned.
- **ES256 signatures need converting.** WebAuthn returns DER-encoded ECDSA; `crypto.subtle.verify`
  expects raw `r||s`. Assumed to be a conversion this task writes. Same instruction: verify first.
- **`localhost` is a secure context for WebAuthn**, so this is testable before `T-012`. Verify.

## Risks

- **This is the least specified thing built so far.** Every other task had an artboard or a written
  section; `/entrar` has one table row. § The Sign-In Screen has to be written before the screen is,
  or it will be invented twice.
- **Hand-written crypto verification is where security bugs live.** The mitigation is that no secret
  is stored — the private key never leaves the device — and that the failing cases are acceptance
  criteria rather than notes: tampered cookie, replayed counter, wrong origin.
- **Locking yourself out is a real outcome.** One owner, one credential, no `/ajustes` yet. Losing
  the device before `T-011` means `npm run db:reset`. Acceptable while local; it must not still be
  true when `T-012` deploys.

## Outcome

- Superseded on 2026-09-02, planned but never started. `D-020` moved Ritmo to the owner's machine,
  started on demand, so nothing is exposed to a network and auth left the critical path. `D-004`
  stands as written and unbuilt.
- The plan below is not wrong, only premature, and it is kept rather than deleted because the work
  returns intact the moment anything is hosted — `D-020` says so in those words. What it settled and
  should not be re-derived: registration must be refused once a credential exists, or the bootstrap
  is a stranger's; `/entrar` has one row in § Navigation Map and no section drawing it; and the
  three platform facts in § Assumptions are to be verified against documentation, never recalled.
- Replaced in the sequence by `T-011`.

## Review

- Severity · `file:line` · issue · impact · recommendation

## Validation

- Validated by:
- Date:
