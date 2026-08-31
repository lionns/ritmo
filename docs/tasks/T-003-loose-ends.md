---
id: T-003
title: The six loose ends T-001 left, and a deploy config that stops lying
status: ready
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

- [ ] WHEN two `weeks` rows share an `owner_id` and a `starts_on`, THE SYSTEM SHALL reject the
      second, verified against a database rebuilt by `npm run db:reset`.
- [ ] After `npm run db:reset` with the `PRAGMA` line gone, `PRAGMA foreign_keys` still reports `1`
      and an orphan `owner_id` insert is still rejected — the line was describing D1, not setting it.
- [ ] WHEN `npm run build` runs, THE SYSTEM SHALL NOT log `Enabling sessions`, and the generated
      `dist/server/wrangler.json` SHALL declare no `SESSION` KV binding.
- [ ] The generated `dist/server/wrangler.json` still resolves `assets.directory` to the client
      build output, and the root `wrangler.jsonc` no longer names a directory containing
      `dist/server`.
- [ ] `env` reaches the integration suite from one module, named in a comment saying which and why,
      and `npm run test:integration` stays green.
- [ ] WHEN a file under `core/` references `Env` or `D1Database`, THE SYSTEM SHALL fail
      `npm run typecheck` as well as `npm run check:core`.
- [ ] All five gates stay green from a clean `npm ci`, and `harness-lint` stays clean.

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build`, then
  `npm run test:integration` and `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset`, then the two SQL probes above against the rebuilt database.
- Task-specific: append `export function leak(e: Env) { return String(e); }` to a core file and
  confirm both `typecheck` and `check:core` fail, then revert it.

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

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- Severity · `file:line` · issue · impact · recommendation

## Validation

- Validated by:
- Date:
