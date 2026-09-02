---
id: T-011
title: Off Cloudflare — the same product on Node and a SQLite file the owner holds
status: doing
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Move the runtime, the store, the adapter and the gates from Cloudflare to Node and
  `node:sqlite`, so Ritmo runs on the owner's machine with one command and no vendor, with the
  domain, the contracts and every screen untouched.
decisions: [D-018, D-019, D-020, D-021]
---

## Sources

- `D-018` runtime · `D-019` data · `D-020` deploy · `D-021` interface — the four foundation
  decisions this task implements, all settled with the owner on 2026-09-02
- `docs/project/architecture.md` § Layout — the tree, the import table, and the Express/Hono
  paragraph that this task makes stale
- `docs/project/quality-gates.md` — the command table; two of its commands stop existing
- `adapters/d1/store.ts` — the 365 lines the new adapter mirrors, and the only store written so far
- `docs/traces/2026-09-02_T-010_planner.md` — the coupling measurement this task acts on

## Scope

- `adapters/sqlite/store.ts` — the `Store` port against `node:sqlite`, same methods, same semantics.
  Where D1 used `batch()` for atomicity, use a transaction; `replaceNextAction`'s all-or-nothing
  close-and-open is the case that must not regress (`T-007`).
- A migration applier to replace `wrangler d1 migrations apply`. Plain SQL files in order, recorded
  so they run once. `migrations/0001_initial_schema.sql` is not edited.
- `astro.config.mjs` and `package.json` — `@astrojs/node` for `@astrojs/cloudflare`; `dev`, `build`,
  `start`, `db:reset` and `seed` all run without `wrangler`.
- `scripts/seed-local.mjs` — it shells out to `wrangler` today; it must not.
- The integration gate. `quality-gates.md` requires a check that exercises the change in
  composition, and `@cloudflare/vitest-pool-workers` cannot provide it any more. **If the runtime
  dependency count changes, that supersedes `D-014` and needs its own decision file** — record it,
  do not absorb it.
- `docs/project/architecture.md` and `quality-gates.md` — the tree, the command table, and the
  paragraph claiming Express "needs `node:http` and cannot run here", which stopped being true when
  Cloudflare shipped `nodejs_compat_v2` and is now moot anyway. Land these with the code.
- The fate of `adapters/d1/`, `wrangler.jsonc` and `worker-configuration.d.ts`: remove them or keep
  them, but **decide and say why in the Outcome**. `D-018` leaves it to this task.

## Out of Scope

- **The domain.** Nothing in `core/`, `contracts/`, `migrations/`, `src/components/`, `src/lib/` or
  any `.astro` file changes. If something there needs to change, the boundary failed and that is a
  finding, not an edit.
- **Auth.** `D-020` took it off the critical path; `T-010` holds the plan for when hosting returns.
- **Docker**, deferred by the owner on 2026-09-02 (`D-020`).
- **Setup and capture.** Creating an area, a project or a next action from inside the product is the
  next task, and it is what the owner actually wants; this one clears the ground for it.
- **`quality-gates.md`'s phone validation.** See Risks — it needs an owner decision, not an edit.

## Acceptance Criteria

- [x] WHEN `npm ci && npm run db:reset && npm run seed && npm run dev` is run on a machine with no
      Cloudflare account and no `wrangler` login, THE SYSTEM SHALL serve `/` with the seeded
      portfolio, and `npm run build && npm start` SHALL serve the same.
- [x] `grep -rn "cloudflare" --include=*.ts --include=*.astro --include=*.mjs --include=*.json .`
      outside `node_modules`, `docs/` and `.git` returns nothing that runs, and no `wrangler`
      invocation remains in any `package.json` script.
- [ ] Writing an entry through `/registrar` persists it, and reloading `/` shows the day's mark
      grown — the first loop of `T-006` and `T-008`, unchanged on the new stack.
- [x] `replaceNextAction` still closes and opens atomically: a cross-project close returns `false`,
      the original stays open, and the replacement is absent (`T-007`'s integration case).
- [x] An integration check exists that runs the store against a real SQLite database with the real
      migrations, is named in `quality-gates.md`, and is green.
- [x] `npm run check:core` stays green, and `core/` and `contracts/` have no diff at all.
- [x] All five gates green from a clean `npm ci`, and `node scripts/harness-lint.mjs` clean.

## Verification

- Baseline: the five gates of `quality-gates.md` **as they stand today**, then `harness-lint`. This
  task edits the gates it must pass, so the baseline is the old table and the final is the new one.
- Final: the five gates as this task leaves them, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset && npm run seed && npm run dev`, then write one entry with a
  minutes chip and one without, and read `/` after each — the timed mark is taller, the untimed one
  is not. This is `T-008`'s own check, re-run to prove the move changed nothing the owner sees.
- Task-specific: delete `.wrangler/` and any Cloudflare credential from the environment, then run
  the full sequence again. If it needs an account, the task is not done.

## Assumptions

- **`node:sqlite` is stable enough to depend on.** Verified present and working on the installed
  `v24.16.0` on 2026-09-02. **Check its stability index in the docs for the pinned line before
  building** — if it is still experimental, that is a finding for the owner, not a flag added
  quietly. `agent-config.md` § Known Risks: platform facts are retrieved, not recalled.
- **The pinned Node and the installed Node differ.** `package.json` pins `24.20.0`; the machine runs
  `24.16.0`. Harmless while Node was not the runtime. It is now, so reconcile the pin or record why.

## Risks

- **`quality-gates.md`'s manual validation names a check that is now impossible.** It requires that
  a progress entry be saved in under twenty seconds on a phone (`NFR-1`), and `D-020` records that a
  laptop-local server has no phone. Every task from here inherits an unmeetable gate. This is the
  owner's call — change the gate, or accept that it is deferred with hosting — and it must not be
  quietly dropped from a task's Verification to reach green.
- **A backup is not `cp`.** `D-019` returns durability to the owner and names this as an error this
  project already made once. No script, doc or task may describe copying the live file as a backup.
- **The integration gate is the one that catches a bad port.** If it is weakened while being
  rewritten, this task's own risk is what goes unnoticed. Weakening a check to reach green is a
  defect, not a fix (`quality-gates.md`).

## Outcome

- Changes: Node standalone runtime; owner-held SQLite store; ordered one-time migrations; local
  reset/seed; real-file integration. Removed D1 adapter, Wrangler config/types and platform tests:
  dead vendor code would drift, while `git log` retains it.
- Files: `adapters/sqlite/`, runtime/API wiring, local scripts, Node/Astro config and lockfile,
  integration tests, architecture/gates, D-022.
- Baseline result: 29/29 unit, isolation, harness lint, typecheck and Cloudflare build green.
- Final result: clean install; 29/29 unit, isolation, typecheck, Node build, integration 5/5; reset,
  seed, dev and start served HTTP 200 without `.wrangler`; timed SSR mark 12→104, untimed stayed 104.
- Decisions recorded: D-022; D-018…D-021 implemented.
- Follow-up: **back to the Frontend/Backend Implementer, 2026-09-02, after Reviewer round 1.** Three
  Low: the two stale Cloudflare-framed doc lines, and integration coverage for `runtimeStore()` —
  `localDatabasePath()` already reads `RITMO_DB_PATH`, so one test can drive the real wiring against
  a temporary path. Two nits are optional. **Do not touch `scripts/` again**; the Medium there is
  the owner's call, not the implementer's. Then Reviewer round 2, then owner validation. The
  `/registrar` click path stayed unchecked here but was exercised over HTTP in review; `D-020`
  leaves the phone gate unmeetable, which is recorded in Risks and is not this task's to fix.

## Review

- 2026-09-02 · Reviewer, round 1 · five gates re-run here: unit 29/29, isolation, typecheck 0 errors
  across 32 files, build, integration 5/5, `harness-lint` clean. The move works, verified from
  scratch rather than from the diff: `data/` and `dist/` deleted, then build, `db:reset`, `seed`,
  `npm start` — `/`, `/registrar` and `/api/portfolio` all 200, two entries written over HTTP (201,
  201), and today's mark rendered `height="104" data-state="timed"`. No `wrangler` or
  `@cloudflare/*` installed, no account, no `.wrangler`. The hard criterion holds: `core/`,
  `contracts/`, `src/components/`, `src/lib/` and `migrations/` have zero diff. Probed that the
  boundary still binds the *new* platform — a `core/` file importing `node:sqlite` is rejected. The
  `node:sqlite` claim was verified independently against the Node 24 docs: "Stability: 1.2 —
  Release candidate", RC since v24.15.0.
- Medium · `scripts/check-core-isolation.mjs` · edited without being in this task's Scope or Out of
  Scope, and `AGENTS.md` requires explicit approval, a decision file and a `VERSION.md` entry for
  `scripts/` · mutation-probed rather than argued: an import of `cloudflare:workers` from `core/` is
  still caught by the escape rule, as is a `@cloudflare/workers-types` type import; what is no
  longer caught is an inert lowercase textual reference, which the removed rule did catch. So real
  coupling stays covered and the defect is the process, not the result. **Second occurrence this
  session** — `T-009` bumped `harness.json` and `VERSION.md` inside a task that scoped neither ·
  **the owner's call**: revert it, or approve it and give it the record `AGENTS.md` asks for. Either
  way it must be settled before `done`, and the implementer should not touch `scripts/` again here.
- Low · `docs/project/quality-gates.md:17` · the isolation row still reads "No `@cloudflare/*`,
  `cloudflare:*` or `Env` reaches the core (`D-003`)" · `D-003` is superseded twice over and the
  description matches neither the platform nor the check as it now stands; the other rows were
  updated · rewrite it against `D-017` and the rule the script actually enforces.
- Low · `docs/project/architecture.md:45-46` · "The boundary is checked, not trusted" still states
  the rule in Cloudflare terms while the section above it was rewritten · same class as above.
- Low · `src/pages/api/*.ts` · the handlers gained `injectedStore?: Store` and the integration test
  injects, so `runtimeStore()` — `openDatabase()`, the default path, and the module-level connection
  cache — is exercised by no gate. The old worker called `handleGetPortfolio()` with no argument and
  did reach `runtimeStore()`, so this is coverage moved rather than added: broader on the store and
  the real migrations, narrower on the wiring · `localDatabasePath()` already honours
  `RITMO_DB_PATH`, so one test driving the real wiring against a temporary path closes it.
- Nits · `package.json` pins Node `24.20.0` while the machine runs `24.16.0`, recorded as retained,
  but Node is the runtime now. · `runtimeDatabase` is a module singleton, so `db:reset` while `dev`
  runs leaves a stale handle — the owner's daily loop.

## Validation

- Validated by:
- Date:
