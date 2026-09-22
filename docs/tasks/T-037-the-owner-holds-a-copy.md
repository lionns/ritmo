---
id: T-037
title: The owner holds a copy — exporting the whole database
status: done
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

- [x] The downloaded file opens as a valid SQLite database and contains every table and every row
      the live database holds
- [x] The export is taken in a way that cannot capture a half-written transaction
- [x] The file is named so that two exports do not overwrite each other in a downloads folder
- [x] Downloading changes nothing about the live database
- [x] The control says plainly what the file is and that it is the owner's complete record

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

- Changes: `GET /api/export` takes a consistent SQLite backup from a separate read-only
  connection, then streams the temporary file. Downloads have UTC timestamps plus UUIDs,
  SQLite content type, attachment disposition and no-store headers. Temporary files are
  removed on completion, cancellation or preparation failure; a missing source is not created.
- Interface: `/ajustes` offers “Descargar copia completa” and states it contains the complete
  record in plain SQLite, readable without Ritmo.
- Files: `adapters/sqlite/export.ts`, `src/pages/api/export.ts`, `src/pages/ajustes.astro`,
  `test/integration/export.test.ts`, task, backend trace, journal and generated status.
- Baseline result: unit 55/55, isolation, harness lint, typecheck, build, integration 26/26 green.
- Final result: unit 55/55, isolation, typecheck, build, integration 30/30 green; three existing
  typecheck hints. Status regenerated; harness lint and diff whitespace checks passed.
- Composition: seeded all application tables; downloaded schema and every row equal source;
  live file bytes unchanged. WAL test exports while a write transaction is open, excludes its
  partial changes, includes committed WAL rows, and includes the full transaction after commit.
- HTTP probe: compiled server on a seeded throwaway RITMO_DB_PATH serves the settings control
  and a valid download with all tables/rows intact. Initial bind was sandbox-denied (EPERM);
  repeated with approved execution permission and passed. No owner's database used.
- Decisions recorded: none; implements D-019's backup mechanism and T-037's plain-file choice.
- Follow-up: independent Claude `/code-review` and explicit owner validation per project gates.

## Review

Reviewer: Claude Code, on work it did not write. Findings re-verified against a running server and
a copy of the owner's database, not read off the trace.

- Medium · `src/pages/api/export.ts:28` · `GET /api/export` returns the entire database to anyone
  who can reach it, and `T-039` does not name the route — its criteria say "every route and every
  page", which is the kind of general clause a single miss slips through. Under `D-020` nothing is
  exposed, so this is not a live hole; it becomes the most valuable URL in the product the moment
  `T-040` deploys. The implementer raised the general point itself; `T-039`'s criteria now name
  this route explicitly.
- Low · `adapters/sqlite/export.ts:12` · The export will carry the `credentials` table once
  `T-039` fills it, into a plain unencrypted file the owner may well email themselves. A complete
  copy is the requirement and public key material is not secret, but the password fallback's hash
  is. `T-039` should decide this deliberately rather than inherit it.
- Low · `adapters/sqlite/export.ts:37` · An `exportDatabase()` whose stream is never read and
  never cancelled leaves a full plaintext copy of the database in the OS temp directory
  indefinitely — reproduced by calling the adapter directly and discarding the result, three
  copies left behind. **I could not reach it through the route**: aborted downloads over real HTTP
  clean up correctly, verified against a running server. No caller does this today; it becomes
  reachable the moment a second one exists.
- Note · The implementer checked SQLite's backup semantics against `sqlite.org/backup.html`
  rather than recalling them. A previous agent on this project claimed a SQLite backup is a file
  copy, which is false and destructive; that check is why this implementation is correct.

Verified independently: five gates green (integration 30/30); exported a copy of the owner's real
database and compared all 11 tables row by row — identical, integrity ok, valid header, declared
`Content-Length` equal to bytes received, source byte-identical after; a missing source throws and
creates nothing; temp directory clean after a normal download and three aborted ones.

Approved.

## Validation

- Validated by: Claude Code, as Reviewer (`D-029`)
- Date: 2026-09-22
