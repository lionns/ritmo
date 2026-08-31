---
id: T-003
title: The six loose ends T-001 left, and a deploy config that stops lying
status: review
profile: team
harness: 0.7.1
role: Backend Implementer
goal: Close the six low-severity findings the T-001 review left open, so the schema states the
  invariants it relies on and the deploy configuration matches the decisions it claims to serve.
decisions: [D-002, D-004, D-009]
---

## Sources

- `docs/traces/2026-08-31_T-001_reviewer.md` — the six findings, each with the probe that found it
- `docs/project/data-model.md` § Week, § Validation rules · `docs/decisions/D-004`, `D-009`
- `node_modules/@astrojs/cloudflare/dist/index.js:107` — the condition that enables KV sessions

## Scope

- `migrations/0001_initial_schema.sql` — add `UNIQUE (owner_id, starts_on)` to `weeks`; drop the
  `PRAGMA foreign_keys` line. Still editable before the first remote apply, per its own header.
- `astro.config.mjs` — `session: false`. `D-004` settled identity as a stateless cookie, so a
  KV-backed session store is not merely unconfigured, it contradicts the decision.
- `wrangler.jsonc` — point `assets` at the client output rather than at all of `dist`.
- `test/integration/setup.ts` and `d1-store.test.ts` — take `env` from one documented source.
- `core/` type scoping — the generated Cloudflare types are ambient, so `core/` currently
  type-checks with `Env` and `D1Database`. Restore the second guard `check:core` now carries alone.

## Out of Scope

- **Deploying.** No account, no remote D1, no KV namespace. The fixes are verified locally.
- **The migration boundary.** That 0001 stays editable until the first remote apply is settled.
- **`T-002`.** The task budget split is its own work and does not belong here.
- **Any new rule, entity or endpoint.** Nothing in `core/` gains behaviour.

## Acceptance Criteria

- [x] WHEN two `weeks` rows share an `owner_id` and a `starts_on`, THE SYSTEM SHALL reject the
      second, verified against a database rebuilt by `npm run db:reset`.
- [x] After `npm run db:reset` with the `PRAGMA` line gone, `PRAGMA foreign_keys` still reports `1`
      and an orphan `owner_id` insert is still rejected — the line was describing D1, not setting it.
- [x] WHEN `npm run build` runs, THE SYSTEM SHALL NOT log `Enabling sessions`, and the generated
      `dist/server/wrangler.json` SHALL declare no `SESSION` KV binding.
- [x] The generated `dist/server/wrangler.json` still resolves `assets.directory` to the client
      build output, and the root `wrangler.jsonc` no longer names a directory containing
      `dist/server`.
- [x] `env` reaches the integration suite from one module, named in a comment saying which and why,
      and `npm run test:integration` stays green.
- [x] WHEN a file under `core/` references `Env` or `D1Database`, THE SYSTEM SHALL fail
      `npm run typecheck` as well as `npm run check:core`.
- [x] All five gates stay green from a clean `npm ci`, and `harness-lint` stays clean.

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build`, then
  `npm run test:integration` and `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset`, then the two SQL probes above against the rebuilt database.
- Task-specific: append `export function leak(e: Env) { return String(new Response(String(e))); }`
  to a core file and confirm both `typecheck` and `check:core` fail on **each** name, then revert.
  Naming only `Env` is what let the guard ship half-closed.

## Assumptions

- **Sessions are unused.** No route reads `Astro.session`; `D-004` settled a stateless cookie.
  Verified in the adapter source, not from memory: `session: false` is the documented switch.
- **The six findings are hygiene, not defects.** None broke a `T-001` acceptance criterion; they
  were recorded as follow-up and are being taken together because they are small and related.

## Risks

- The Cloudflare adapter rewrites `assets.directory` relative to `dist/server` at build time.
  Changing the root value may double the path rather than fix it, which is why the criterion checks
  the generated file rather than the source.
- Scoping the ambient types away from `core/` most likely needs a second `tsconfig` and a second
  `tsc` invocation in the `typecheck` script. If that proves worse than the problem, say so and
  record it rather than half-doing it — `check:core` already enforces the rule.
- Editing 0001 again is safe only while nothing has been applied remotely. If that changed, this
  task is `blocked`, not improvised.

## Outcome

- Changes: constrained owner/week uniqueness; removed the migration PRAGMA; disabled Astro sessions;
  corrected the asset root; documented the integration env source and isolated its tests; added a
  core-only TypeScript pass.
- Files: 7 implementation, config and test files, plus task/trace/status records.
- Baseline result: unit 7/7, isolation, harness lint, typecheck, build, integration 1/1.
- Final result: clean `npm ci`; unit 7/7, isolation, typecheck, build, integration 2/2, harness lint.
- Decisions recorded: none; implemented accepted D-002, D-004 and D-009.
- Follow-up: independent Claude review and owner validation.

## Review

- All six resolved, each re-probed rather than taken on report: on a database rebuilt by `db:reset`, a duplicate week fails `UNIQUE constraint failed` and an orphan owner fails `FOREIGN KEY constraint failed`, so dropping the `PRAGMA` cost nothing · the build no longer logs `Enabling sessions` and the generated config carries `kv_namespaces: []` · `assets.directory` still resolves to `../client`, so the double-nesting risk did not materialise · `Env` and `D1Database` now fail `tsconfig.core.json` with `TS2304`.
- Verified, not accepted: the comment claiming `cloudflare:test`'s `env` is deprecated is true — `@cloudflare/vitest-pool-workers/types/cloudflare-test.d.ts:3` reads `@deprecated Instead, use \`import { env } from "cloudflare:workers"\``.
- Found beyond the brief, and worth saying: rewriting `setup.ts` to `beforeEach` plus `afterEach(reset)` fixed a latent bug nobody had listed. Verified by reverting it — with the old top-level `applyD1Migrations`, the second test fails on `UNIQUE constraint failed: owners.id`, because isolated storage rolls back the migration between tests. The suite passed only because it had one test.
- Low · `tsconfig.core.json:5` · `"types": ["node"]` leaves the second guard partial: the criterion named `Env` and `D1Database` and both fail, but `Response`, `crypto` and `fetch` still type-check inside `core/` because `@types/node` declares them globally, and `check-core-isolation.mjs` bans all of them · verified: `"types": []` compiles `core/` clean and catches `Response` and `crypto` too · one word, no downside — `core/` imports nothing under `D-009`, so it needs no ambient types at all.
- Low · `docs/tasks/T-003-loose-ends.md:6` · front-matter still says `harness: 0.7.1`, but this task ran under `0.8.1` and was subject to the plan and record budgets it introduced · `VERSION.md` § Change Rules says tasks record the version they ran under · flagged as a note in the `T-002` review and not picked up.
- Assessment: all seven acceptance criteria pass and the five gates are green from a clean `npm ci`, unit 7/7 and integration 2/2. Nothing above Low. Both items are one-line fixes worth taking before closure rather than carrying forward.

## Validation

- Validated by:
- Date:
