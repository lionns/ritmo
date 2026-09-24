---
id: T-042
title: Ritmo gets its own address — ritmo.cosmiqstudio.com
status: ready
profile: team
harness: 0.9.0
role: Release Engineer
goal: Move the deployment to `ritmo.cosmiqstudio.com`, a subdomain of a zone the owner already
  runs another Worker on, without disturbing that Worker and without leaving the old address
  half-alive behind it.
decisions: []
---

## Sources

- `D-031` — hosting on Cloudflare Workers, and `D-034` for the adapter
- `adapters/http/session.ts:78` — `readAuthConfig` requires HTTPS and one exact origin, no
  trailing slash. There is one `RITMO_AUTH_ORIGIN`, not a list.
- `adapters/http/auth.ts:101` and `:105` — the passkey's relying party is
  `new URL(config.origin).hostname`. **Change the hostname and every registered passkey stops
  being offered by the browser.**
- `docs/deployment.md` — the current runbook and the live origin
- Cloudflare routing, checked 2026-09-24: "the most specific route pattern wins", so a subdomain
  is a separate hostname and cannot collide with the Worker on the apex

## Scope

- `ritmo.cosmiqstudio.com` added as a Custom Domain on the Ritmo Worker
- `RITMO_AUTH_ORIGIN` changed to `https://ritmo.cosmiqstudio.com`, and a redeploy
- **Turning the `workers.dev` address off.** With one `RITMO_AUTH_ORIGIN`, the old address does not
  simply keep working: pages may still render while every write is refused 403 on the origin check
  and no passkey is offered. A half-open door is worse than a closed one.
- `docs/deployment.md` updated, and the hostname taken out of `test/manual/https-only.mjs`, where
  it is a hard-coded default rather than documentation — it already reads `RITMO_ORIGIN`, so make
  that required

## Out of Scope

- Any application code. If a path, a cookie or a redirect needs changing, something is wrong with
  this plan, not with the app: a subdomain is chosen precisely so nothing moves.
- The Worker already serving `cosmiqstudio.com`. It is not touched, not redeployed, not inspected
  beyond confirming it still answers.
- A redirect from the old address to the new one. One owner, one bookmark.

## Acceptance Criteria

- [ ] `https://ritmo.cosmiqstudio.com` serves Ritmo: `/` redirects to `/entrar`, `/entrar` answers
      200, and every API refuses without a session
- [ ] `http://ritmo.cosmiqstudio.com` answers 308 to `https://`, and HSTS is sent
- [ ] **`cosmiqstudio.com` and its existing Worker answer exactly as they did before**, checked
      before the change and after it, with the responses compared rather than eyeballed
- [ ] The `workers.dev` address no longer serves the application
- [ ] The owner signs in with the password and registers a passkey on the new domain, then signs
      in with it
- [ ] `/api/export` downloads a file that opens, from the new address
- [ ] No hostname is hard-coded in `test/`; `RITMO_ORIGIN` is required there

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, all green — nothing here should move any of them
- Task-specific: **record what `cosmiqstudio.com` returns before you start** — status, a hash of the
  body, and the headers — and compare after. "It still works" from memory is not the check.
- Task-specific: after the switch, request the old `workers.dev` address and record what it does.
- Task-specific: **take an export from the new address and open it**, before telling the owner it
  is done. The data does not move in this task, so a difference here means something is wrong.

## Assumptions

- The owner has their password to hand. It is the only way in until a passkey is registered on the
  new domain, and `D-004` is explicit that recovery is theirs alone: a lost credential means direct
  database access.

## Risks

- **Every passkey registered on the old address stops working the moment the origin changes.** That
  is expected and recoverable through the password, but it is not obvious, and it is the step where
  the owner can lock themselves out if the password is not at hand. Confirm with them before
  switching, not after.
- The zone carries a Worker the owner depends on. The whole point of a subdomain is that it cannot
  collide — but "cannot" is a claim, and the before-and-after comparison is what turns it into a
  fact.
- `HSTS` was served on the old hostname with a one-year max-age. That is per-host, so it does not
  follow to the new one, and nothing needs undoing — but do not be surprised by it.

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
