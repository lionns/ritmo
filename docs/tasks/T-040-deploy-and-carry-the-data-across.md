---
id: T-040
title: Deploy, and carry the data across
status: ready
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

- [ ] Every table's row count on the new store equals the source, checked table by table and
      written into the Outcome
- [ ] The deployed application refuses every request without a valid session (T-039, re-verified
      **against the deployed URL**, not only locally)
- [ ] The owner saves a progress entry from their own phone, over the network, in under twenty
      seconds from opening the application — timed, not estimated (`NFR-1`)
- [ ] `FR-21`'s export works against the deployed store and returns a file that opens
- [ ] The rollback is written down and has been rehearsed, not just described
- [ ] The local SQLite path still runs `npm run dev` and the whole suite unchanged

## Verification

- Baseline: the five gates green on the commit being deployed
- Final: the five gates green, plus the deployed application exercised by hand
- Task-specific: **before moving anything, take an export and keep it off the machine.** The
  source database is the owner's only complete record of months of use.
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
- Deploying before T-039 is validated would publish an open write endpoint carrying months of
  private records. `D-020` forbids it in writing; this task inherits that prohibition.
- `NFR-1` may still fail after deploying, for reasons that are the design's and not the host's. If
  it does, record it as unmet rather than redefining twenty seconds.

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
