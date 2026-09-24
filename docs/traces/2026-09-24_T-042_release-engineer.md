## Trace

- 2026-09-24 — role: Release Engineer, then Reviewer (both Claude Code's in `agent-config.md`)
  - baseline: gates green; `cosmiqstudio.com` and `www` recorded — 200, 7,510 bytes, the same body
    hash three times, so a byte comparison afterwards is meaningful
  - read the deploy procedure first and found the trap: every deploy passes
    `.env.production.secrets.json`, which also carries `RITMO_AUTH_ORIGIN`. Changing it only with
    `secret put` would have been silently reverted by the next deploy. Edited the file's one key,
    printing key names only.
  - step 1, non-breaking: Custom Domain added with `workers.dev` kept alive (`94a28bab`). Apex
    identical, old address still serving.
  - stopped and confirmed the owner had the password before switching — the passkeys' relying party
    is the hostname, so both registered passkeys were about to stop being offered
  - step 2: origin switched and `workers_dev` off (`9cf0fa02`). Proven without spending sign-in
    attempts: a session-less write with the new `Origin` gets 401, with the old one 403.
    `workers.dev` 404, apex identical again.
  - two false alarms, both mine: a `000` on one request (eight retries across both IPs, all 302),
    and a missing HSTS header that was there on the second look
  - `test/manual/https-only.mjs` no longer hard-codes a host; it fails without `RITMO_ORIGIN`.
    Its run against the new domain hit this machine's negative DNS cache (1,800 s) and was checked
    by hand against the IP instead.
  - gates: unit 67/67, isolation, types, both builds, integration 120/120
  - owner confirmed password and passkey sign-in on the new domain. Closed.
