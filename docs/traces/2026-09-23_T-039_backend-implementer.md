## Trace
- 2026-09-23 — role: Backend Implementer
  - read: STATUS, harness, T-039/T-010, D-004/D-012/D-036, quality gates, data model, handoff,
    Store, both adapters, APIs and test harness; Cloudflare/Workers/Wrangler and Browser skills.
  - baseline: unit 67/67, integration 37 passed/39 explicitly skipped without sqld, isolation,
    types, both builds and harness clean. No implementation started on a failing gate.
  - sources: W3C WebAuthn Level 3 verification, MDN getPublicKey, Cloudflare node:crypto and
    Workers best practices, OWASP Password Storage; live retrieval 2026-09-23.
  - did: ES256 verification with bounded COSE/DER parsing, required UV/UP, one-use challenges;
    AuthStore port and migration 0007 for ceremonies/rate counters, implemented in both adapters.
  - did: HMAC cookies (30 minutes), credential/password-bound revocation, CSRF origin checks,
    deny-by-default middleware, proven owner in APIs, cookie forwarding in SSR, auth UI/contracts.
  - assumptions: password-proven first registration replaces unsafe public zero-credential claim;
    existing owner required; no account creation. W3C zero-counter handling replaces old T-010 rule.
  - export decision: public credentials remain; password hash/signing secret only in configuration.
    Configuration/rotation/recovery and enumerated route matrix documented in docs/authentication.md.
  - tests: independent node:crypto signatures, failure cases, replay, revocation, two credentials,
    password, throttling, cookie variants and every protected route; same auth suite on both stores.
  - composition: compiled Node and actual workerd + temporary sqld HTTP smoke pass; 5 pages redirect
    and 18 API methods refuse missing/altered/expired cookies; login, SSR, export and revocation pass.
  - fixes during checks: segregated AuthStore keeps business test doubles unchanged; binding input
    type corrected; migration ledger expectation extended. Wrangler log path denied, types generated.
  - final: unit 67/67, integration 120/120, isolation, types, dual builds and HTTP smoke green.
  - pending: Browser discovery returned no browser; visual check and actual phone registration/login
    remain unverified. Independent Reviewer under D-029 must validate; T-040 cannot deploy yet.
