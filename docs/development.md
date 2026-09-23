# Local and remote storage

T-038 adds a second Store implementation without changing the core or its contracts. The local
SQLite adapter remains the default for Node development. No deployment or live data import is part
of this task; T-039 supplies authentication before T-040 deploys.

## Run and build

- `npm ci` installs the exact dependency lockfile.
- `npm run dev` uses Node and local SQLite (`RITMO_DB_PATH`, default `data/ritmo.sqlite`).
- `npm run build` builds **both** Node (`dist/node`) and Workers (`dist/workers`).
- `npm start` serves the Node build.
- `RITMO_TARGET=workers npm exec astro preview` serves the built Worker locally with workerd.
- `npm run typecheck` checks the front/Node, isolated core, and Workers configurations separately.
  Generated Workers globals are excluded from the front's DOM types.

To use the remote store on Node, set `RITMO_STORE=remote`, `RITMO_DATABASE_URL`, and
`RITMO_DATABASE_TOKEN`. Workers requires the remote store; it has no native SQLite fallback.
Workers configuration declares the credential names, never their values. Set local values in an
ignored `.dev.vars` file using `.dev.vars.example`; production secret provisioning belongs to T-040.
`nodejs_compat` is enabled for the adapter/runtime dependencies. The application's ULID generation
already uses Web Crypto. SQLite migrations are bundled as SQL for Workers and read from disk on Node.

Pending migrations run in name order, one write transaction per migration, with the same
`_ritmo_migrations` ledger. The ledger is rechecked under the write lock to tolerate simultaneous
initial requests. An unavailable/misconfigured remote store fails explicitly; it never selects a
local file. The Workers build rejects imports from `adapters/sqlite/`.

## Integration tests

Without `sqld` on PATH, `npm run test:integration` passes the 37 local tests and explicitly
reports 39 skipped remote tests. It prints which coverage is missing: the remote Store/API,
migrations, constraints and export. This is not full remote validation. A configured but missing,
broken or non-executable `RITMO_SQLD_BINARY` fails the gate rather than skipping; server startup
and test failures also remain failures. Full T-038 verification requires all 76 tests to pass.

Install the official [libSQL server release](https://github.com/tursodatabase/libsql/releases/tag/libsql-server-v0.24.32)
for your OS, verifying its supplied SHA-256. Tests use `sqld` from PATH, or an explicit path:

```sh
RITMO_SQLD_BINARY=/absolute/path/to/sqld npm run test:integration
```

The suite starts disposable servers bound to loopback with temporary data, and stops them after
testing. No remote account, production credential, Docker daemon, or owner database is used.
The exact same Store/API/migration suite runs against both adapters. The remote suite makes any
`node:sqlite` import throw. Export tests separately open the downloaded artifact with native SQLite
as an independent verifier, not as an application fallback.

## Export and compatibility

The remote export uses the database's `/dump` endpoint, then reconstructs a SQLite file with
`sql.js` WASM. No platform/account token is needed beyond the database credential. The dump contains
the schema, every table (including credentials and ledger), indexes and rows; SQL literals preserve
64-bit integers without converting through JavaScript numbers. Incomplete/failed snapshots return
an error, never a partial download. Tests cover committed and uncommitted writes, BLOBs, multiline
text, and opening the result with SQLite.

Reconstruction holds a SQLite image in memory. The SQL input is capped at 16 MiB to avoid unbounded
Worker memory use; larger exports fail explicitly. This is a current export limitation to revisit
before data reaches that size. Native local export remains streaming through SQLite's backup API.

`@libsql/client` is pinned to 0.18.0 and imported only through `/web`. The
[maintainer's guidance](https://github.com/tursodatabase/libsql-client-ts) calls it the battle-tested
choice; the [serverless announcement](https://turso.tech/blog/introducing-turso-serverless-javascript-driver)
still labels that alternative experimental (checked 2026-09-22). The web client supplies transactions
without supporting local file URLs.

`@astrojs/cloudflare` 14.2.6 works with the existing Astro 7.2.9. Version 14.3.3 was tested and rejected:
it imports `renderForPrerender`, absent from that Astro release, despite a compatible declared peer
range. `sql.js` 1.14.2 has a narrow build shim for browser-worker `self.location`, absent in workerd;
the WASM module is statically imported and instantiated directly. Recheck the shim on package upgrades.

## Dependency decision handoff (pending Planner)

The dependency set is final: seven runtime packages and six development packages in `package.json`.
D-022 must be superseded by the Planner as requested in the T-038 review. Keep the four original
runtime packages and add `@astrojs/cloudflare` for D-034, `@libsql/client` for D-032, and `sql.js`
for FR-21. Keep the four original development packages and add `wrangler` for Workers builds/types
and `@types/sql.js` to type-check the export implementation. No new test framework is introduced.

`sql.js` converts the database SQL dump into the downloadable SQLite file FR-21 promises inside
Workers. Serving SQL text would change that format; `node:sqlite` backup needs a local database and
cannot implement the remote Worker path; a separate export service would add another deployed
component and credentials. WASM keeps this operation in the existing application, at the cost of
in-memory reconstruction, the documented 16 MiB input limit, and a narrow workerd compatibility shim.
The Node adapter remains installed for local development. This is implementation rationale for the
Planner, not an accepted replacement decision.
