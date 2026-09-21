## Trace

- 2026-09-21 — role: Backend Implementer · **in progress**
  - read: `T-021` § Scope, `D-024`, `migrations/0001_initial_schema.sql:75`, every file naming a
    next action, the owner's own `next_actions` rows read-only
  - did: deleted `contracts/next-actions.ts`, `src/pages/api/next-actions.ts`,
    `core/rules/next-action.ts` and its unit test; removed `NextAction` from the model, five
    methods from the port and the adapter, `nextAction` from the portfolio rule, contract and
    endpoint, and the route from the test worker; rewrote the carry-across fixture in raw SQL,
    because no code able to write a next action exists any more; added the readerless guard;
    recorded the retained table in `data-model.md`; rewrote the manual's text
  - files: `core/**`, `contracts/**`, `adapters/sqlite/store.ts`, `src/pages/api/portfolio.ts`,
    `test/**`, `scripts/seed-local.mjs`, `docs/project/data-model.md`, `README.md`
  - checks: baseline unit 53/53, isolation, typecheck, build, integration 14/14, green before any
    edit; now unit 48/48, isolation, typecheck 0 errors, build, integration 12/12 — the counts
    fall because deleted behaviour took its tests with it
  - probe: the guard caught one reader the sweep missed — `scripts/seed-local.mjs` still counted
    open next actions in its verification query. Moved onto steps
  - data: the owner's `next_actions` keeps all five rows. Nothing in this task touches data
  - open: the four screenshots in `docs/images/` still show a trigger and an act. Awaiting the
    owner's word on how they are captured; every other acceptance criterion is met
  - result: no source file outside the migrations reads a next action. Not closable yet.
