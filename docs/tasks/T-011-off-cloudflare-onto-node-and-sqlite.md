---
id: T-011
title: Off Cloudflare — the same product on Node and a SQLite file the owner holds
status: ready
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

- [ ] WHEN `npm ci && npm run db:reset && npm run seed && npm run dev` is run on a machine with no
      Cloudflare account and no `wrangler` login, THE SYSTEM SHALL serve `/` with the seeded
      portfolio, and `npm run build && npm start` SHALL serve the same.
- [ ] `grep -rn "cloudflare" --include=*.ts --include=*.astro --include=*.mjs --include=*.json .`
      outside `node_modules`, `docs/` and `.git` returns nothing that runs, and no `wrangler`
      invocation remains in any `package.json` script.
- [ ] Writing an entry through `/registrar` persists it, and reloading `/` shows the day's mark
      grown — the first loop of `T-006` and `T-008`, unchanged on the new stack.
- [ ] `replaceNextAction` still closes and opens atomically: a cross-project close returns `false`,
      the original stays open, and the replacement is absent (`T-007`'s integration case).
- [ ] An integration check exists that runs the store against a real SQLite database with the real
      migrations, is named in `quality-gates.md`, and is green.
- [ ] `npm run check:core` stays green, and `core/` and `contracts/` have no diff at all.
- [ ] All five gates green from a clean `npm ci`, and `node scripts/harness-lint.mjs` clean.

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
