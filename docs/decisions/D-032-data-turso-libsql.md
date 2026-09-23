# D-032 — The data moves to Turso, which is still SQLite

- Status: accepted
- Date: 2026-09-22
- Supersedes: D-019
- Tasks: T-038, T-040
- Foundation: data

## Context

`D-031` puts Ritmo on Workers, where `node:sqlite` does not exist. The owner chose Turso over
Cloudflare D1 on 2026-09-22, for the reason they left Cloudflare in September: the vendor serving
the application should not also be the vendor holding the data.

## Decision

**Turso (libSQL) holds the data**, behind the existing `Store` port. The local SQLite adapter stays
for `npm run dev`, the test suites and the owner's own copy.

Verified against live documentation on 2026-09-22, not recalled: Turso's TypeScript reference lists
Cloudflare Workers among compatible runtimes, and interactive transactions and batch are both
documented. **Two packages claim the edge**: `@tursodatabase/serverless`, which the docs recommend
for edge runtimes and whose announcement calls it "currently experimental and subject to change",
and `@libsql/client/web`, older and fetch-only, which "does not support local file URLs". `T-038`
picks between them **with the experimental label in hand** and records which and why.

## Consequences

- **`FR-21` breaks on arrival.** `T-037`'s export reads a local file through `node:sqlite`'s backup
  API. Turso has no local file. `T-038` re-implements the export or `NFR-4`'s no-lock-in promise
  becomes a sentence again — and the owner has months of real records by then.
- A production dependency is added, which the project has had four of since the beginning.
- SQLite's `CHECK` constraints and partial indexes must be confirmed to survive, not assumed.
  `T-038` checks; a constraint that silently does not exist passes every test we have.

## References

- `D-019` · `D-031` · `docs.turso.tech/sdk/ts/reference` · `FR-21`, `NFR-4`
