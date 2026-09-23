---
id: T-038
title: The second store behind the port
status: review
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Build the store T-036 chose as a second adapter behind the existing port, so the core and
  every rule above it are untouched, and so the local SQLite adapter keeps working for development
  and for the owner's own copy of the data.
decisions: [D-036]
implements: [NFR-3, NFR-4]
---

## Sources

- **`D-032`** — Turso (libSQL) holds the data, the local SQLite adapter stays. `D-033` (the Workers
  runtime) and `D-034` (the Cloudflare adapter) come with it.
- `core/ports/store.ts` — the port, and the reason this task is possible without touching `core/`
- `adapters/sqlite/store.ts` — the adapter to mirror, including how migrations are applied by name
  order through the `_ritmo_migrations` ledger
- `scripts/check-core-isolation.mjs` — the gate that keeps platform globals out of `core/`
- `test/integration/sqlite-store.test.ts` — the suite that proves an adapter honours the port

## Scope

- A second adapter under `adapters/`, implementing every method on the port
- **Choosing between `@tursodatabase/serverless` and `@libsql/client/web`, and recording which and
  why.** `D-032` verified on 2026-09-22 that the docs recommend the first for edge runtimes while
  its own announcement calls it "currently experimental and subject to change", and that the second
  is fetch-only and "does not support local file URLs". Check both against live documentation
  again — this moves.
- **Re-implementing `FR-21`'s export against the new store.** `T-037` built it on `node:sqlite`'s
  backup API reading a local file, which Turso does not have. Until this is done, `NFR-4`'s promise
  that the owner is never locked in has nothing behind it, and by then they have months of records.
- Swapping the Astro adapter per `D-034`, keeping the Node adapter for local development
- Whatever `astro.config.mjs` and the build need in order to target the chosen host
- Migrations applied on the new store, by the same ledger and the same name order
- The integration suite run against **both** adapters, so the port is proven twice and not
  assumed

## Out of Scope

- Deleting `adapters/sqlite/`. It stays: it runs the tests, it runs `npm run dev`, and it is what
  `FR-21`'s export reads.
- Any change to `core/`. If a rule needs to change to fit the new store, the port was wrong and
  that is a finding, not a patch.
- Deployment and moving the owner's data — T-040.

## Acceptance Criteria

- [x] Every port method is implemented, and the integration suite passes against both adapters
- [x] **The export works against the new store** and returns a file that opens, with every table
      and row — `FR-21` survives the move rather than lapsing with it
- [x] The chosen client package is named in the task's Outcome with the reason, including what its
      documentation said about maturity on the day it was checked
- [x] `npm run check:core` stays clean — no vendor SDK, no platform global, no SQL in `core/`
- [x] Migrations run on a fresh store in the same order and record the same ledger
- [x] Nothing in `core/`, `contracts/` or `src/` names the vendor
- [x] Switching between the two stores is configuration, not a code change

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, plus the integration suite green against the new adapter
- Task-specific: run the integration suite against the new store with no local SQLite available
  at all, to prove nothing silently falls back.
- Task-specific: check what the new store does with the things SQLite gave for free — the `CHECK`
  constraints, the partial indexes, `node:sqlite`'s transaction semantics. A constraint that
  silently does not exist on the new store is a data-integrity defect that every test will pass.

## Assumptions

- The port as written is complete enough for a second store. It was designed for exactly this and
  has never been tested against it.

## Risks

- The port has only ever had one implementation, so anything SQLite-specific that leaked into it
  will surface here. That is the useful outcome of this task, not a setback.

## Outcome

- Changes: complete remote Store, ordered transactional migrations, configuration-based selection,
  remote SQLite download, Node/Workers builds and one shared Store/API suite for both adapters.
- Client: `@libsql/client` 0.18.0 through `/web`; live documentation checked 2026-09-22.
  The [maintainer](https://github.com/tursodatabase/libsql-client-ts) describes it as battle-tested;
  the [serverless announcement](https://turso.tech/blog/introducing-turso-serverless-javascript-driver)
  still calls the alternative experimental. The web entry supports interactive transactions and
  rejects local file URLs, making it suitable for Workers and preventing native fallback.
- Files: adapter/runtime, ten API imports, shared integration suites, build/type configuration,
  dependencies, development guide and harness records. Core, contracts and migration SQL unchanged.
- Baseline result: unit 67/67, integration 36/36, isolation, typecheck, Node build and harness clean.
- Final result: unit 67/67, integration 76/76 (33 shared cases per adapter plus 10 export cases),
  isolation, typecheck, both builds and diff checks pass. Node 26.9.0 used; engine pin unchanged.
  Harness regenerated and linted. Three existing type hints; build warns of unprovisioned secrets.
- Composition: real libSQL v0.24.32; remote suite forbids node:sqlite; constraints and rollback pass.
  Prior workerd smoke: downloaded SQLite matches all 11 source tables; integrity/FKs clean.
- Export: database `/dump` reconstructed with sql.js WASM; preserves all tables, BLOBs and 64-bit
  integers, excludes uncommitted writes. In-memory reconstruction rejects SQL dumps over 16 MiB;
  this limitation must be revisited before that size. Local native export remains unchanged.
- Decisions: D-022 replacement pending Planner; final dependency set and export alternatives are
  documented in `docs/development.md` under Dependency decision handoff. No decision self-approved.
- Review fix: missing sqld now reports 37 passed / 39 skipped and names untested remote coverage.
  Explicit invalid RITMO_SQLD_BINARY still fails; with the binary, all 76 pass. No assertions removed.
- Follow-up: Planner formalizes dependency decision, then independent Reviewer validates (D-029).
  Hosted validation/deployment/data migration remain T-040; no owner database mutation.

## Review

Reviewer: Claude Code, on work it did not write. Returned once under `D-029` §1; both findings
answered.

- **Returned · resolved** · The integration gate was red from a clean checkout — 39 failed of 76
  without `sqld`. It now exits 0 at 37 passed / 39 skipped, printing which coverage is missing,
  and a configured-but-missing `RITMO_SQLD_BINARY` still exits 1, so the skip is no escape hatch.
- **Returned · resolved** · `D-022` was breached with no decision recording it. The implementer
  wrote the rationale into `docs/development.md` and explicitly did not self-approve. `D-036`
  supersedes it: seven runtime, six dev.
- Medium · `docs/development.md` § Export · **`FR-21` has a 16 MiB ceiling now.** The remote export
  rebuilds a SQLite image in memory and fails explicitly above it — honest, but the one thing
  behind `NFR-4` now has a size at which it stops. 176 KB today; recorded in `D-036`, not a task.
- **Closed 2026-09-23 · the remote half is no longer attested by the implementer alone.** `sqld`
  0.24.32 installed from the official release, published SHA-256 matched, gate run in full:
  **76/76**. Beyond their suite, an end-to-end probe — the real app on the remote store, real data
  written through the real API, then `/api/export` downloaded and opened: 11 tables, integrity ok,
  foreign keys clean, all six migrations in the ledger. Repeated on **workerd**, the runtime that
  deploys.
- Note · `@libsql/client/web` over the still-experimental `@tursodatabase/serverless`, checked
  against live sources; `@astrojs/cloudflare` 14.3.3 tested and rejected against the Astro pin,
  with the reason recorded. Both are what `D-032` asked for.

Verified: unit 67/67, isolation, typecheck 0 errors, both builds, integration exit 0 with the skip
notice, lint clean. Workers bundle 1.8 MB uncompressed, 644 KB of it WASM.

Approved.

## Validation

- Validated by: pending independent Reviewer (D-029)
- Date: pending
