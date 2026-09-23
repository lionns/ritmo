# D-036 — Seven runtime and six dev dependencies, and why `sql.js` is among them

- Status: accepted
- Date: 2026-09-23
- Supersedes: D-022
- Tasks: T-038
- Foundation: tests

## Context

`D-022` fixed the surface at four dev and four runtime packages when `D-018`–`D-021` took Ritmo off
Cloudflare. `D-031`–`D-034` put it back and `T-038` implemented them; most of what returns is what
`D-014` carried for the same reason before `D-022` removed it.

## Decision

**Seven runtime packages**: the original four, plus `@astrojs/cloudflare` (`D-034`),
`@libsql/client` (`D-032`, imported only through `/web`) and **`sql.js`**.
**Six dev packages**: the original four, plus `wrangler` for the Workers build and its generated
types, and `@types/sql.js`. No new test framework; the core still runs under `node --test`.

`sql.js` is the only choice rather than a consequence, and it is there for `FR-21`. The remote
export reads the database's `/dump` endpoint and must hand back **a SQLite file** — what the
requirement promises and what makes `NFR-4`'s no-lock-in claim real. Serving SQL text changes that
format; `node:sqlite`'s backup API needs a local file Workers does not have; a separate export
service adds a deployed component and another credential. WASM keeps it inside the application.

## Consequences

- **The export reconstructs in memory and caps its SQL input at 16 MiB.** Larger exports fail
  explicitly rather than truncating. The owner's database is 176 KB today; this must be revisited
  before it approaches that, and `FR-21` quietly stops working if it is not.
- `sql.js` carries a shim for `self.location`, which workerd lacks. It is a compatibility patch and
  must be rechecked on every upgrade of that package.
- The Workers bundle carries a 644 KB WASM module; measured at 1.8 MB uncompressed in total, well
  inside Cloudflare's limit.

## References

- `D-022` · `D-014` · `D-013` · `D-031`–`D-034` · `FR-21`, `NFR-4` · `docs/development.md`
