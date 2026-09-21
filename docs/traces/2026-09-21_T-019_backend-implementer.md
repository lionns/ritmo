## Trace

- 2026-09-21 — role: Backend Implementer
  - read: `T-019` § Scope, `contracts/next-actions.ts` and `src/pages/api/next-actions.ts` as the
    shape to mirror, `contracts/portfolio.ts`, `src/pages/api/portfolio.ts`, `core/rules/step.ts`
    from `T-018`, `D-020` for whose clock defines today
  - did: `contracts/steps.ts`; `PortfolioStep` and `todaySteps` added beside `nextAction`, which
    stays; `src/pages/api/steps.ts` with `POST` to write and `PATCH` to mark, unmark or complete;
    the portfolio endpoint now reads the day list once and groups it by project; five integration
    cases with their own fixtures
  - files: `contracts/steps.ts`, `contracts/portfolio.ts`, `core/rules/step.ts`,
    `src/pages/api/steps.ts`, `src/pages/api/portfolio.ts`, `test/integration/worker.ts`,
    `test/integration/sqlite-store.test.ts`
  - checks: baseline unit 53/53, isolation, typecheck, build, integration 9/9, green before any
    edit; final unit 53/53, isolation, typecheck 0 errors, build, integration 14/14
  - scope note: `calendarDateOf` was added to `core/rules/step.ts` rather than duplicated per
    caller. It is a helper beside `readDayList`, not a new rule — it decides no behaviour, and
    keeping it there means "today" has one definition, which is what § Scope asked for
  - correction: one acceptance criterion said 422 for a blank title. It contradicted this task's
    own § Scope and the convention `next-actions.ts` sets, so the criterion was corrected to 400,
    not the code bent to meet it
  - assumptions: the three the task records, unchanged. `progressSincePlan` was left untouched
  - result: steps are reachable through the contract; nothing renders them yet and every screen
    still reads `nextAction`. Open for owner validation; no blocker.
