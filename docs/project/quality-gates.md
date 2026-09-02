# Quality Gates

Commands run from the repo root. Name the real commands — the harness gates invoke these verbatim.
Dependencies install with `npm ci` against the committed lockfile, never `npm install` (`D-013`).

Every command below follows from an accepted foundation decision: `node --test` for the core from
`D-006`, the boundary check from `D-017`, `tsc` and the Node runtime from `D-018`, and the real
SQLite integration from `D-019`.

## Baseline Checks

Run these before starting new implementation. Any required failure blocks the task.

| Check | Command or Procedure | Required | Notes |
| --- | --- | --- | --- |
| Tests | `npm test` | yes | `node --test`, no framework (D-006) |
| Core isolation | `npm run check:core` | yes | Core imports stay inside `core/`; no platform global or `Env` reaches it (D-017) |
| Harness records | `node scripts/harness-lint.mjs` | yes | Budgets and record shape |
| Type check | `npm run typecheck` | yes | `astro check && tsc --noEmit` (D-021) |
| Lint | — | | Formatting is not gated; no dependency earns it here |
| Build | `npm run build` | yes | `astro build` with the Node adapter (D-021) |

## Final Acceptance Checks

Run these before requesting review or human validation. Both tables must be green. Weakening,
skipping, or narrowing any of them to reach green is a defect, not a fix (`ROLES.md`).

### Checks the agent iterates against

| Check | Command or Procedure | Required | Notes |
| --- | --- | --- | --- |
| Tests | `npm test` | yes | New behavior needs a test with it |
| Core isolation | `npm run check:core` | yes | Catches platform coupling the day it is introduced |
| Harness records | `node scripts/harness-status.mjs && node scripts/harness-lint.mjs` | yes | Regenerate before linting: `harness-lint` fails on a stale `STATUS.md` |
| Type check | `npm run typecheck` | yes | |
| Lint | — | | |
| Build | `npm run build` | yes | |

### Checks that exercise the change in composition

At least one. A change can be made to pass the table above by narrowing it; it cannot be made to
pass a check that runs it together with what already exists.

| Check | Command or Procedure | Required | Notes |
| --- | --- | --- | --- |
| Integration | `npm run test:integration` | yes | Runs the store and API handlers against a real SQLite file with the real migrations — the one place the adapter, schema and rules meet (D-019, D-022) |
| End-to-end | — | | No browser automation; the surface is server-rendered HTML (D-008) |

## Manual Validation

Profile is `team` (`D-010`): validation is an explicit gate with a named validator, and the validator
is **the owner, on every task**. Before it, the Reviewer runs `/code-review` on work it did not
write (`agent-config.md`). Two things are checked by hand because no
command can, and both come from requirements rather than taste — that a progress entry can be saved
in under 20 seconds on a phone (`NFR-1`), and that no copy added by the change puts the owner in
debt, red, or arrears after a missed period (`NFR-7`, research §15).
