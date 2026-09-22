---
id: T-037
title: The owner holds a copy — exporting the whole database
status: ready
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Let the owner download their entire database as a SQLite file on demand, so that the only
  copy of weeks of real use stops being a single file on one machine, and so `NFR-4`'s promise
  that the owner is never locked in is backed by something that exists.
decisions: []
implements: [FR-21, NFR-4]
---

## Sources

- `docs/project/requirements.json` — `FR-21`, and `NFR-4`, which states the no-lock-in promise and
  names `FR-21` as the thing that guarantees it. The guarantee has never been built.
- `D-019` — the backup consequence, and `D-020`, which notes the owner holds the only copy
- `adapters/sqlite/store.ts` — where the database file lives and how it is opened
- `src/pages/ajustes.astro` — the structure screen, the natural home for this

## Scope

- A route that streams the owner's database as a downloadable SQLite file
- A control on `/ajustes` that triggers it and says what it gives you
- Whatever is needed to produce a *consistent* file — a database copied mid-write is not a backup

## Out of Scope

- Importing, restoring, or scheduling. One direction, on demand, is the whole requirement.
- Encrypting the export. **Asked and answered on 2026-09-22: the file is plain SQLite.** It opens
  with any tool, today and in ten years, without Ritmo and without a key, which is what makes
  `NFR-4`'s no-lock-in promise real. Whoever holds the file holds the whole record.

## Acceptance Criteria

- [ ] The downloaded file opens as a valid SQLite database and contains every table and every row
      the live database holds
- [ ] The export is taken in a way that cannot capture a half-written transaction
- [ ] The file is named so that two exports do not overwrite each other in a downloads folder
- [ ] Downloading changes nothing about the live database
- [ ] The control says plainly what the file is and that it is the owner's complete record

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, all green
- Task-specific: export from a seeded throwaway database, open the downloaded file, and compare
  row counts per table against the source. An export that returns a file which is not a database,
  or is a database missing half the rows, passes every gate this repository has.
- Task-specific: export while a write is in flight and confirm the file still opens.

## Assumptions

- The export runs before T-038 changes the store. If the store changes first, "stream the file"
  stops being available and this task needs rethinking — which is the argument for doing it now.

## Risks

- This is the task that makes every later migration safe. T-031 drops a table and T-040 moves the
  data to another vendor; both are currently one mistake away from unrecoverable. Sequencing this
  early is the point of it.

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
