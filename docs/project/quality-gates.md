# Quality Gates

Commands run from the repo root. Name the real commands — the harness gates invoke these verbatim.

Every command below follows from an accepted foundation decision: `node --test` and the absence of a
test framework from `D-006`, the core isolation check from `D-003`, `tsc` and the Workers runtime
from `D-001`, and the local D1 integration from `D-002`.

## Baseline Checks

Run these before starting new implementation. Any required failure blocks the task.

| Check | Command or Procedure | Required | Notes |
| --- | --- | --- | --- |
| Tests | `npm test` | yes | `node --test`, no framework (D-006) |
| Core isolation | `npm run check:core` | yes | No `@cloudflare/*`, `cloudflare:*` or `Env` reaches the core (D-003) |
| Harness records | `node scripts/harness-lint.mjs` | yes | Budgets and record shape |
| Type check | `npm run typecheck` | yes | `astro check && tsc --noEmit` (D-008) |
| Lint | — | | Formatting is not gated; no dependency earns it here |
| Build | `npm run build` | yes | `astro build` (D-008); a template that does not compile is not a green baseline |

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
| Integration | `npm run test:integration` | yes | Runs the Worker against a local D1 with the real schema and real migrations — the one place the adapters, the schema and the rules meet (D-002, D-006) |
| End-to-end | — | | No browser automation; the surface is server-rendered HTML (D-008) |

## Manual Validation

Profile is `solo`: accepting the change is the validation. Two things are checked by hand because no
command can, and both come from requirements rather than taste — that a progress entry can be saved
in under 20 seconds on a phone (`NFR-1`), and that no copy added by the change puts the owner in
debt, red, or arrears after a missed period (`NFR-7`, research §15).

## Known Exceptions

- **The commands above do not exist yet.** There is no `package.json` and no source tree; the first
  task creates the skeleton and the scripts together. Until it closes, the only required baseline
  check is `node scripts/harness-lint.mjs`. Approved by the owner on 2026-08-29. Expires when the
  first task reaches `done` — at which point every row above must run for real.
