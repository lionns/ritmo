---
id: T-016
title: This repository stops carrying the harness it only installs
status: done
profile: team
harness: 0.9.0
role: Release Engineer
goal: Remove the harness governance this repository authored in place — one done task, one never
  started, two decisions, three traces and a test — and re-sync the vendored copies to the upstream
  release that now holds them, so Ritmo consumes the harness instead of forking it.
decisions: []
---

## Sources

- `sdd-harness` `T-018`, `T-019` — the port of `0.8.0` and `0.8.1`, and the two open findings
- `sdd-harness` `D-030`, `D-031`, `D-033` — the decisions re-authored upstream with their ids
- `docs/sdd/VERSION.md` § Change Rules — what a governance change requires, and of whom
- `JOURNAL.md:7` — the closure line for `T-002`, which stays

## Scope

- Delete `docs/tasks/T-002-split-task-budget.md` and `docs/tasks/T-004-harness-loose-ends.md`.
- Delete `docs/decisions/D-015-task-budget-plan-and-record.md` and
  `docs/decisions/D-016-budget-contract-both-ways.md`.
- Delete the three `docs/traces/2026-08-31_T-002_*.md` files.
- Delete `test/core/task-budget.test.ts`, which tests the harness from the directory that mirrors
  the product core.
- Re-sync the vendored surface from the release: `docs/sdd/`, `scripts/harness-lint.mjs`,
  `scripts/harness-status.mjs`, `scripts/lib/harness.mjs`, `.claude/`, `.githooks/pre-push`, plus
  `CHANGELOG.md` and `harness.lock` if `0.9.0` ships them.
- `harness.json` — the `harness` field, to the released version.
- Regenerate `STATUS.md` and `docs/decisions/README.md`.

## Out of Scope

- **`JOURNAL.md`.** It is append-only, and line 7 is a true fact about this repository: the work did
  happen here. The id `T-002` is retired, not reused.
- **`T-001:107` and `T-003:34`**, which mention `T-002` in closed records. Editing a done task to
  remove a reference to work that existed is doctoring the record, not cleaning it.
- **Renumbering to close the `D-015`/`D-016` gap.** Ids are immutable and gaps cost nothing; the
  linter requires no contiguity.
- **A local decision recording that this repository authors no harness change.** That rule belongs
  upstream, where `D-033` makes it a check. Writing it here as prose would recreate exactly what
  this task removes.
- **The product.** Nothing under `core/`, `adapters/`, `migrations/` or `src/` is touched.

## Acceptance Criteria

- [x] WHEN `grep -rl "taskPlanLines\|taskRecordLines\|budgetContract" docs/tasks docs/decisions
      docs/traces` runs THE SYSTEM SHALL return nothing — no authored record about the harness.
- [x] WHEN `harness-lint` runs after the removal THE SYSTEM SHALL report clean over 13 tasks and 21
      decisions, with no task referencing a decision file that no longer exists.
- [x] WHEN the vendored surface is compared file by file against the release THE SYSTEM SHALL report
      no difference outside `harness.json`, whose project, profile and foundation are this repo's.
- [x] WHEN `harness.lock` is verified here THE SYSTEM SHALL report no drift — the composition check:
      this repository's copy, the released manifest, and the linter that reads both.
- [x] `npm test` is green at 45 tests, four fewer, and `check:core`, typecheck, build and the
      integration suite are unchanged.

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build`, then
  `node scripts/harness-lint.mjs`.
- Final: the same, plus `npm run test:integration` and `node scripts/harness-status.mjs`.
- Task-specific: `git log --follow` resolves each deleted file to its full history, and
  `node scripts/harness-lint.mjs` is clean with the two decision ids gone from `docs/decisions/`.

## Assumptions

- **This does not start until `0.9.0` is released upstream.** Until then these files are the only
  working copy of the port's tests and of the two findings `T-019` inherits, and the upstream tasks
  cite them by path.
- **The re-sync overwrites only harness files.** `scripts/check-core-isolation.mjs`,
  `seed-local.mjs` and `reset-local.mjs` are this project's and are not part of the vendored set.

## Risks

- Running this early costs the port its sources: `T-018` and `T-019` cite these files by path, and
  a deleted file resolves only through `git log --follow`.
- The unit count drops from 49 to 45. That is the harness tests leaving, not a regression, and the
  journal line for this task must say so or the next reader reads it as one.
- `docs/sdd/` arrives from the release rather than from here. If `0.9.0` moved the changelog, the
  local `VERSION.md` shrinks by about 110 lines in the same commit — expected, and worth naming in
  the outcome so it does not read as a deletion.

## Outcome

- Changes: the harness records this repository authored are gone — `T-002`, `T-004`, `D-015`,
  `D-016`, three `T-002` traces and `test/core/task-budget.test.ts`; the vendored surface now comes
  from the `0.9.0` release, with `CHANGELOG.md` and `harness.lock` new here.
- Files: 21 — 8 deleted, `docs/sdd/` (6), `scripts/` (3), `.claude/` and `.githooks/pre-push`,
  `harness.json`, `CHANGELOG.md`, `harness.lock`, this task, its trace, `STATUS.md` and
  `docs/decisions/README.md`
- Baseline result: unit 49/49, isolation, typecheck, build, integration 7/7, lint clean 648/650
- Final result: unit 45/45, isolation, typecheck, build, integration 7/7, lint clean 528/650
- Decisions recorded: none — the rule that an adopter authors no harness change is `D-033` upstream,
  where the lock enforces it
- Follow-up: none. `JOURNAL.md:7` keeps the `T-002` line, and `T-001` and `T-003` keep their
  references to it, as scoped.

## Review

- Low · `docs/sdd/VERSION.md` · this repository now carries a rules document whose changelog lives
  in `CHANGELOG.md`, a file it never writes to · that is what an adopter should hold: the rules that
  bind it, and the history that explains its version · accepted.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-03

