---
id: T-001
title: The skeleton, the enforced boundary, and one next action stored end to end
status: review
profile: team
harness: 0.7.1
role: Backend Implementer
goal: Stand up the three-layer tree with every quality-gate command real and green, and prove it by
  storing and reading a project's single open next action through the D1 adapter.
decisions: [D-001, D-002, D-008, D-009, D-011, D-013, D-014]
implements: [FR-6, NFR-3]
---

## Sources

- `docs/project/architecture.md` § Layout — the tree and the three inward arrows
- `docs/project/data-model.md` § Entities, § Validation rules — the ten tables and the one-open rule
- `docs/project/quality-gates.md` § Baseline Checks, § Known Exceptions

## Scope

- `package.json` with the pinned versions under Assumptions, and a script for every gate command.
- `tsconfig.json`, `astro.config.mjs` (`@astrojs/cloudflare` + `@tailwindcss/vite`), `wrangler.jsonc`
  with the D1 binding, and `.nvmrc` pinning the Node line.
- `core/model/` — the ten entities of `data-model.md` as types. Types only; rules come per task.
- `core/ports/` — `Store`, `Clock`, `IdGen`.
- `core/rules/` — one rule: an active project carries exactly one `NextAction` with `closedAt` null.
- `adapters/d1/` — `Store` for `Project` and `NextAction` only, plus `migrations/0001_*.sql`
  creating all ten tables with the ownership foreign keys.
- `adapters/` — the ULID generator over `crypto.getRandomValues` (`D-011`).
- `scripts/check-core-isolation.mjs` — zero dependencies, wired to `npm run check:core`.
- `src/pages/index.astro` — the minimum that makes `npm run build` real; a build proof, not the
  landing surface, which is the front's own task.
- Tests: `node --test` over the core rule and the id generator, plus one integration test.

## Out of Scope

- **Every other rule.** Reserves, dormancy, stale rate, consistency, calibration, proposal drift.
- **The API.** No endpoint under `src/pages/api/` and no `contracts/` types yet.
- **The interface.** The portfolio surface, navigation and the hero chart are the front's own task.
- **Identity.** Passkey registration and the session cookie of `D-004`.
- **The `Store` beyond two tables.** The migration creates ten; the adapter implements two.

## Acceptance Criteria

- [x] `npm test`, `npm run check:core`, `npm run typecheck`, `npm run build` and
      `npm run test:integration` exist in `package.json` and each exits zero after a clean `npm ci`.
- [x] WHEN a file under `core/` imports `@cloudflare/*` or `cloudflare:*`, names the `Env` type or
      touches a platform global, THE SYSTEM SHALL fail `npm run check:core` naming file and line.
- [x] `npm test` runs on `node --test` with nothing installed beyond the pinned dev dependencies,
      and no import inside `core/` resolves outside `core/`.
- [x] WHEN a next action is created for a project that already carries one with `closedAt` null,
      THE SYSTEM SHALL reject it and name the open action's id (FR-6).
- [x] WHEN the open next action is closed and a replacement created, THE SYSTEM SHALL accept the
      replacement, and the closed row SHALL remain readable.
- [x] Two ids generated in sequence sort ascending as plain strings and are 26 Crockford base32
      characters (`D-011`).
- [x] `wrangler d1 migrations apply --local` succeeds against an empty database and creates all ten
      tables of `data-model.md`, every one carrying its ownership foreign key (NFR-3).
- [x] The integration test creates a project and its next action through the D1 adapter against a
      local D1, reads both back, and asserts the rejection above — core rule and adapter together.
- [x] `package.json` pins exact versions with no range operators and declares `engines.node`,
      `.nvmrc` names that same version, `package-lock.json` is committed, and every script installs
      with `npm ci` (`D-013`).

## Verification

- Baseline: `node scripts/harness-lint.mjs` — the only required baseline check until this task
  closes (`quality-gates.md` § Known Exceptions).
- Final: `npm test && npm run check:core && npm run typecheck && npm run build`, then
  `node scripts/harness-status.mjs && node scripts/harness-lint.mjs`.
- Task-specific: `npm run test:integration` is the composition check; delete the Known Exceptions
  entry in `quality-gates.md` when closing, since every row of that table must then run for real.

## Assumptions

- **Versions came from the npm registry, re-checked 2026-08-31, never from memory.** Pins:
  `astro@7.2.9`, `@astrojs/cloudflare@14.2.5`, `wrangler@4.127.1`, `tailwindcss@4.3.3`,
  `@tailwindcss/vite@4.3.3`, `typescript@6.0.3`, `@astrojs/check@0.9.10`, `vitest@4.1.11`,
  `@cloudflare/vitest-pool-workers@0.22.0`.
- **Node is pinned at 24.20.0 — the active LTS line (Krypton), not the newer 26.8.1, which is not
  LTS.** `astro@7` needs >= 22.12, so the constraint is met with margin. *Chosen by the assistant.*
  The owner runs 24.16.0, so this asks for a patch bump rather than a line change.
- **TypeScript is pinned at 6.0.3 and not at the current `latest`, 7.0.2.** `@astrojs/check@0.9.10`
  declares `peerDependencies: typescript ^5.0.0 || ^6.0.0`, so `astro check` — half of the
  `typecheck` gate — cannot be green on 7. Revisit when `@astrojs/check` admits 7.
- **The six dev dependencies are named in `D-014`**, which supersedes `D-012` over the count.
  `package.json` must match that list exactly; a seventh needs a decision, not a commit.
- **No Cloudflare account is needed here.** Migrations and the vitest pool run against a local D1,
  so `database_id` stays a placeholder; a real one needs `wrangler login`, which only the owner runs.
- **The ten-table migration ships before nine of those tables have rules.** The schema is settled
  in `data-model.md`, and one migration is cheaper to read later than ten.

## Risks

- `@astrojs/cloudflare@14.2.5` peers `wrangler ^4.125.0`, so a wrangler major breaks the build.
- The ULID generator is hand-written; the monotonic-within-a-millisecond clause is absent (`D-011`).
- `npm ci` on a fresh clone is the first thing that has ever exercised these pins together.

## Outcome

- Changes: skeleton plus review fixes for test typing, D1 types/close results, and owner integrity.
- Files: 24 new implementation/config files; task, lockfile, schema, core, adapter, and tests updated.
- Baseline result: `node scripts/harness-lint.mjs` clean before implementation.
- Final result: clean install; unit 3/3, isolation, 16-file typecheck, build, integration 1/1, migration green.
- Decisions recorded: D-014.
- Follow-up: independent re-review of resolved findings, then owner validation and closure.

## Review

- Resolved 2026-08-31, each re-verified rather than taken on report: a type error in `test/core` now fails `tsc` at file:line · the platform types come from `wrangler types` and the typecheck covers 16 files instead of 14 · `closeNextAction` returns whether a row changed and the rule throws on a lost update, asserted in both suites · a cross-owner objective is now rejected by the composite foreign key.
- Medium · `migrations/0001_initial_schema.sql:1` · an already-applied migration was edited in place instead of adding `0002` · verified: a local D1 carrying 0001 answers `No migrations to apply!` and still holds the old schema with no composite keys — the integration test hides this because vitest rebuilds the database from the file every run · add `0002_owner_composite_keys.sql`, or record in the task that 0001 may change until first deploy and name the reset step.
- Medium · `package.json:9` · `worker-configuration.d.ts` is 15278 generated lines that `tsconfig.compilerOptions.types` requires, with no script to regenerate it · verified: removing it fails typecheck with `TS2688`, so it must be committed and it drifts silently whenever `wrangler.jsonc` changes · add a `types` script running `wrangler types` and run it before the typecheck gate.
- Assessment: all nine acceptance criteria still pass and the five gates are green from a clean `npm ci`. The two findings above are new, neither breaks a criterion, and two low-severity notes are in the reviewer trace.
## Validation

- Validated by:
- Date:
