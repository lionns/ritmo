---
id: T-040
title: Deploy, and carry the data across
status: doing
profile: team
harness: 0.9.0
role: Release Engineer
goal: Put Ritmo where the owner can reach it from a phone, move weeks of real use onto the new
  store without losing a row, and meet `NFR-1` — under twenty seconds to a saved entry, on a
  phone — for the first time since the product began.
decisions: []
implements: [NFR-1, NFR-4]
---

## Sources

- **T-036's accepted decision** — the host and the store
- **T-039** — authentication. `D-020`: auth "becomes mandatory again the moment anything is
  exposed". This task is the exposure. It does not start until T-039 is `done` and validated.
- **T-037** — the export. The owner's data moves in this task; the export is what makes that
  reversible.
- `adapters/sqlite/store.ts` and T-038's adapter — source and destination
- `docs/project/requirements.json` — `NFR-1`, unmet since 2026-09-02 and recorded as unmet in
  `D-020`'s consequences

## Scope

- Deploying the built application to the chosen host
- Moving the owner's existing database onto the new store, with row counts proven equal per table
- Configuration and secrets: the signing secret from T-039, the store's credentials, and however
  the host is told about them — none of it committed
- Running the migration ledger on the new store, in the same name order
- A rollback that is written down before it is needed

## Out of Scope

- A custom domain, unless the host makes one unavoidable
- Any product change. If a screen is wrong on a phone, that is its own task; this one moves what
  exists.
- Continuous deployment. One deploy the owner can repeat by hand is the requirement.

## Acceptance Criteria

- [x] Every table's row count on the new store equals the source, checked table by table and
      written into the Outcome
- [x] The deployed application refuses every request without a valid session (T-039, re-verified
      **against the deployed URL**, not only locally)
- [x] The owner saves a progress entry from their own phone, over the network, in under twenty
      seconds from opening the application — timed, not estimated (`NFR-1`)
- [ ] **A passkey registered on the owner's phone, and a second one on another device without
      touching the first** — moved here from `T-039`, which could not meet it: registration needs
      a deployed HTTPS origin and a real authenticator, and the suites use synthetic credentials
- [x] `FR-21`'s export works against the deployed store and returns a file that opens
- [x] The rollback is written down and has been rehearsed, not just described
- [ ] The local SQLite path still runs `npm run dev` and the whole suite unchanged

## Verification

- Baseline: the five gates green on the commit being deployed
- Final: the five gates green, plus the deployed application exercised by hand
- Task-specific: **before moving anything, take an export and keep it off the machine.** The
  source database is the owner's only complete record of months of use.
- Task-specific: **stop every running instance before the move, and keep it stopped until the
  counts are compared.** Migrations apply on `openDatabase()`, so any process that serves a
  request migrates the live database underneath the move. T-031's review found this control
  failing in practice: the running app applied a migration to `data/ritmo.sqlite` before the
  rehearsal on a copy could happen. Nothing in the code prevents it — the procedure is the only
  thing that does.
- Task-specific: after the move, compare per-table row counts and spot-check the oldest and newest
  entry, step and project by id. Equal counts with corrupted contents is the failure mode a count
  alone cannot see.
- Task-specific: with the deployed URL open on a phone, walk the whole loop — sign in, mark a step
  for today, log an entry, see it in the history, finish a project — and time the entry.

## Assumptions

- The owner is present for the phone verification. `NFR-1` is a claim about a person and cannot be
  checked any other way.

## Risks

- This is the first time the owner's real data leaves the machine it was written on. Every
  safeguard in Verification exists for that one sentence.
- The rehearse-on-a-copy safeguard is defeated by the app's own migration-on-open behaviour
  (T-031's review). Consider making the runner refusable by environment variable as part of this
  task, so the control stops depending on remembering it.
- Deploying before T-039 is validated would publish an open write endpoint carrying months of
  private records. `D-020` forbids it in writing; this task inherits that prohibition.
- `NFR-1` may still fail after deploying, for reasons that are the design's and not the host's. If
  it does, record it as unmet rather than redefining twenty seconds.

## Outcome

- Changes: deployed authenticated Ritmo to https://ritmo.juan-account.workers.dev, Cloudflare Juan
  account, Turso `lionns/ritmo` in aws-us-east-1; original local database untouched.
- Version `87d87db6-6c59-451c-b451-785ca865e1df`, base commit `6375cb3`. Account ID, workers.dev
  and the same-origin fetch flag are recorded in Wrangler.
- Files: release config and generated types, an ignore rule, the deployment runbook, five manual
  verification programs and harness records. Secrets, access notes and every database copy are
  gitignored.
- Baseline and final: unit 67/67, integration 120/120, isolation, types and both builds pass,
  harness clean. `npm run dev` still served a temporary local SQLite copy, portfolio and export.
- Backup: `data/T-040-respaldo-2026-09-24/` via the SQLite backup API, integrity and FKs clean,
  export SHA-256 `c166ac89…b45064`. The owner asked to copy this folder to an external device
  themselves, so **off-machine retention is not verified**. No source writer was running.
- Migration: 0007 rehearsed on a copy with existing rows unchanged, and the destination verified
  empty first. **The CLI file upload reported success and created no tables** — caught before
  exposure; an atomic SQL import replaced it, every row compared before commit, ledger order kept.
- Counts before application writes, original / hosted, **every one equal**: areas 4, projects 4,
  steps 8, entries 6, owners 1; commitments, credentials, objectives, tags and weeks 0; the ledger
  6 → 7 for migration 0007, and `auth_attempts` and `auth_challenges` new and empty.
- Contents: all rows equal, oldest and newest entry, step and project by ID included, kept in a
  protected hosted-comparison.json; integrity and FKs clean. Only authentication counters changed
  afterwards, during login verification; no owner record was changed by the agent.
- Deployed checks: five pages 302 and 18 API methods 401 for missing, altered and expired cookies;
  real password login, authenticated SSR and the complete SQLite export pass, its rows equal to the
  hosted ones. Repeated after the HTTPS fix; HTTP redirects to HTTPS and raw HTTPS headers include
  HSTS. SSR first failed; the `global_fetch_strictly_public` flag fixed it, documented.
- Rollback: written before upload, rehearsed locally, then the actual hosted export reopened
  through the migration runner with all rows preserved. See `docs/deployment.md`.
- Decisions recorded: none.
- Phone: owner confirmed access and reports a saved entry in under five seconds, meeting `NFR-1`.
  Step marking, history, project finish and passkeys on two devices remain unconfirmed. Initial
  access sits in a private `.env.initial-access`.

## Review

Reviewer: Claude Code, on work it did not write. **Returned a second time** — the HTTPS fix is
correct in production and broke local development.

- **Resolved** · The plain-HTTP login page is gone. Live: `http://.../entrar` now answers **308**
  to `https://.../entrar`, and `strict-transport-security: max-age=31536000` is sent. The
  unauthenticated surface is unchanged — pages 302, `/api/export` and `/api/portfolio` 401.
- High · `src/middleware.ts:6` · **`npm run dev` is dead.** Every `http:` request is redirected,
  including `http://localhost`, so the dev server answers `308` to an `https://localhost:PORT` that
  has no TLS listener — the connection simply fails. This task's own criterion says the local path
  "still runs `npm run dev` and the whole suite unchanged", and it no longer does. The rule already
  exists one file away: `adapters/http/session.ts:78` permits `http:` when the hostname is
  `localhost`. Mirror that exact condition rather than writing a second definition of "is this
  local", and note it accepts `localhost` and not `127.0.0.1`, so the dev host must match.
- Not verified by me · the hosted row counts, the hosted export and the rollback rehearsal still
  need the owner's credentials, which a reviewer must not hold. The local source is untouched at
  1/4/4/8/6 rows, integrity ok, matching the counts above.
- Open · the second-device passkey. Do it once this round lands and is redeployed.
- Note · `NFR-1`, recorded as unmet since 2026-09-02, is met on the owner's report of under five
  seconds — the first time the product has been reachable from a phone at all.

## Validation

- Validated by: pending Reviewer and owner's phone verification
- Date: pending
