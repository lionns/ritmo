---
id: T-036
title: Where the deploy returns to — the host, the store, and the clause that fires with them
status: ready
profile: team
harness: 0.9.0
role: Planner
goal: Settle where Ritmo runs now that the owner needs it from anywhere, what holds the data once
  `node:sqlite` is no longer available, and record — as `D-020` requires in writing — that
  authentication stops being optional the moment anything is exposed.
decisions: []
implements: [NFR-2, NFR-4]
---

## Sources

- `D-020` — the decision this one supersedes. Read it in full before proposing anything. It says
  the local stage is "explicitly a stage, not an end state — hosting returns as its own decision",
  and it binds the successor twice:
  - **`NFR-1` cannot be met while `D-020` holds.** Under twenty seconds to a saved entry *on a
    phone* is the reason the owner is asking. Hosting is what makes it reachable at all.
  - **Auth "becomes mandatory again the moment anything is exposed, and no hosting decision may
    supersede this without saying so."** This decision must say so, in those terms.
- `D-005` — the original Cloudflare decision, superseded by `D-020`
- `docs/project/requirements.json` — `NFR-4`, which still describes Cloudflare and still cites
  `D-005` as if it stood. It has been wrong since 2026-09-02 either way and this task fixes it.
- `astro.config.mjs` and `package.json` — `@astrojs/node` in standalone mode, `node:sqlite`
  through `adapters/sqlite/store.ts`. Neither runs on Workers.
- `core/ports/store.ts` — the port that makes a second store possible at all

## Scope

1. **The host.** The owner has said Cloudflare. Record it, and record what it costs.
2. **The store — the owner chose Turso/libSQL on 2026-09-22**, over D1, for the reason they left
   Cloudflare in the first place: the vendor that serves the application is not the vendor that
   holds the data. **This choice rests on an unverified premise** — that libSQL runs on Workers is
   recalled, not checked. Verify it against live documentation before the decision is written; if
   it does not hold, the choice goes back to the owner rather than quietly becoming D1.
   `node:sqlite` is not available on Workers. This is the open technical question
   and the one with consequences: D1 is SQLite and Cloudflare's, Turso/libSQL is SQLite and is
   not. **The owner's stated reason for leaving Cloudflare on 2026-09-02 was not wanting to depend
   entirely on one vendor**; D1 returns them to exactly that position. Put both options to the
   owner with that trade named, and do not decide it alone.
3. **The auth clause.** State plainly that `D-004` moves from accepted-and-unbuilt to required
   before anything is reachable from the network, per `D-020`'s own words.
4. **`NFR-4`.** Rewrite it to describe where the data actually lives, citing this decision rather
   than the superseded `D-005`, and keep its two standing promises: no lock-in, guaranteed by
   `FR-21`, and no third-party analytics or telemetry.

## Out of Scope

- Any code, config, adapter or deployment. This task changes `docs/` only.
- Choosing between a container and a direct deploy. `D-020` deferred Docker deliberately at the
  owner's word; if the host makes it relevant again, that is its own question for T-040.

## Acceptance Criteria

- [ ] The decision names the host, the store, and the reason for each, and supersedes `D-020`
      rather than editing it
- [ ] It carries `- Foundation: deploy`, since the linter refuses any task past `ready` while a
      foundation topic is unsettled
- [ ] It states in its own words that authentication is now mandatory before exposure, discharging
      `D-020`'s condition explicitly rather than by implication
- [ ] The vendor-independence trade is written down as a trade the owner made, not as a detail
- [ ] `NFR-4` describes reality and cites a decision that is not superseded
- [ ] The owner accepts it before it is written as `accepted`

## Verification

- Baseline: `node scripts/harness-lint.mjs`
- Final: `node scripts/harness-lint.mjs && node scripts/harness-status.mjs`
- Task-specific: confirm exactly one accepted decision carries `- Foundation: deploy` afterwards.
  The linter fails when a foundation topic is settled twice.

## Assumptions

- None stated. The store is the open question and is put to the owner rather than assumed.

## Risks

- The quiet failure here is deciding the store on technical convenience and never surfacing that
  it reverses a choice the owner made for a non-technical reason three weeks ago.
- Cloudflare holds the encryption keys and can technically read the data — `NFR-4` already says
  so. It was true under `D-005` and becomes true again. It belongs in the decision, not in a
  footnote.

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
