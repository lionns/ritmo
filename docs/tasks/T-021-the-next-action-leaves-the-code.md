---
id: T-021
title: The next action leaves the code, and the manual catches up
status: doing
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Delete every line that still reads or writes a next action — contract, route, rules, model,
  port, adapter and tests — and rewrite the manual against the product that now runs, so nothing
  in the repository describes a trigger except the records of why it left.
decisions: [D-024]
implements: [FR-6, FR-22]
---

## Sources

- `docs/decisions/D-024-steps-and-the-day-list.md` — what replaced what
- `T-018` § Scope and `T-020` § Out of Scope — both deferred this removal here, deliberately
- `migrations/0001_initial_schema.sql:75` — `next_actions` and its partial unique index at `:89`
- `core/{model/entities,ports/store,rules/next-action,rules/portfolio}.ts`,
  `adapters/sqlite/store.ts`, `contracts/next-actions.ts`, `src/pages/api/next-actions.ts`
- `README.md` — written for the product that asked for a trigger, screenshots included
- `docs/project/data-model.md` § Step — where the table's survival is recorded

## Scope

- **The code goes.** `contracts/next-actions.ts`, `src/pages/api/next-actions.ts`,
  `core/rules/next-action.ts`, the `NextAction` interface, every `Store` method that names one,
  their SQLite implementations, `nextAction` on `PortfolioProject` in both the core type and the
  contract, `createProjectWithNextAction`, and `test/core/next-action.test.ts`. The integration
  cases that exercise the route go with it.
- **The table stays.** `next_actions` keeps its rows and its index. Owner's call, 2026-09-21: the
  five triggers in it are the record of why the product changed, and four of five hang off
  finishing work, which is the evidence `D-024` rests on. `data-model.md` records the table as
  retained-without-readers and says why, so the next reader does not take it for an oversight.
- **A guard.** One test asserts no source file outside `migrations/`, `docs/` and the retention
  note reads `next_actions` — so a later task cannot quietly grow a reader again.
- **`README.md` rewritten** against the running product: steps, the day list, choosing what is
  for today, and what expires with the day. The blockquote warning that the code had not caught up
  goes. The "Todavía no existe" table drops its steps row and gains finishing a project (`D-025`).
- **Four new screenshots** in `docs/images/`, captured from a build served on a throwaway seeded
  database, replacing the four that show "Disparador" and "Acción".

## Out of Scope

- **Dropping `next_actions`.** Not in this task and not by accident: it is a migration that
  destroys the owner's own words, and it needs its own decision if it is ever wanted.
- `D-025` and finishing a project — proposed, unaccepted, and its own task when it is.
- `/archivo`, `/semana`, `/p/:id`, objectives, commitments, calibration.
- Any change to how steps behave. If this task wants one, it has gone out of scope.

## Acceptance Criteria

- [ ] WHEN `grep -rn "NextAction\|next_actions\|nextAction" core/ src/ contracts/ adapters/ test/`
      runs THE SYSTEM SHALL return only the retention note's own reference, if any.
- [ ] `contracts/next-actions.ts`, `src/pages/api/next-actions.ts`, `core/rules/next-action.ts`
      and `test/core/next-action.test.ts` do not exist.
- [ ] WHEN a source file outside `migrations/` and `docs/` reads `next_actions` THE SYSTEM SHALL
      fail the new guard test naming that file.
- [ ] WHEN the portfolio endpoint responds THE SYSTEM SHALL return no `nextAction` field, and the
      screens SHALL render exactly as they did at the end of `T-020` — the check that exercises
      this removal against what already works.
- [ ] `data-model.md` states that `next_actions` is retained without readers, and why.
- [ ] `grep -rn "Disparador\|próxima acción" README.md` returns nothing, and the four images in
      `docs/images/` show steps rather than a trigger and an act.
- [ ] `README.md` § Todavía no existe lists finishing a project, citing `D-025`.
- [ ] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: open the owner's real database read-only and confirm `next_actions` still holds
  its five rows after the build runs. The removal must not touch data.

## Assumptions

- Assumption: the closed next action's text is not carried across to a done step. `T-018` decided
  closed actions stay put, and reopening that to rescue one row would be a migration written for
  sentiment. The row stays readable in the table instead.
- Assumption: screenshots are captured from a seeded throwaway database, never from
  `data/ritmo.sqlite`, as the four they replace were.

## Risks

- **A deletion task has no visible success.** Everything must look identical afterwards, which
  makes a mistake easy to miss: the gates pass just as well with a screen quietly broken. The
  acceptance criterion that the screens render as they did at the end of `T-020` is the guard.
- The retained table is an invitation to confusion. The note in `data-model.md` and the guard test
  are what keep "why is this here" answerable in six months.
- Screenshots go stale the moment the interface moves again. They were already stale once, which
  is what this task is fixing.

## Outcome

Filled in as the task progresses; overwritten, not appended.

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

## Trace

Team profile — `docs/traces/<date>_T-021_backend-implementer.md`.
