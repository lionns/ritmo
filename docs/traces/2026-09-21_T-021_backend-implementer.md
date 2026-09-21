## Trace

- 2026-09-21 — role: Backend Implementer
  - read: `T-021` § Scope, `D-024`, `migrations/0001_initial_schema.sql:75`, every file naming a
    next action, the owner's own `next_actions` rows read-only
  - did: deleted the contract, the route, the rules and their unit test; removed `NextAction` from
    the model, five methods from the port and the adapter, `nextAction` from the portfolio rule,
    contract and endpoint, and the route from the test worker; rewrote the carry-across fixture in
    raw SQL, no code able to write a next action existing any more; added the readerless guard;
    recorded the retained table in `data-model.md`; rewrote the manual
  - files: `core/**`, `contracts/**`, `adapters/sqlite/store.ts`, `src/pages/api/portfolio.ts`,
    `test/**`, `scripts/seed-local.mjs`, `docs/project/data-model.md`, `README.md`
  - checks: baseline unit 53/53, isolation, typecheck, build, integration 14/14, green before any
    edit; now unit 48/48, isolation, typecheck 0 errors, build, integration 12/12 — the counts
    fall because deleted behaviour took its tests with it
  - probe: the guard caught one reader the sweep missed — `scripts/seed-local.mjs` still counted
    open next actions in its verification query. Moved onto steps
  - data: the owner's `next_actions` keeps all five rows. Nothing in this task touches data
  - shots: re-captured with the owner's permission. Chrome's extension was abandoned after three
    attempts — it saved at 1193x840 with the panel clipped while showing 1312x924 — so headless
    Chrome took them at the 1456x816 the four they replace used
  - correction: one criterion barred `test/` from naming the table, which it cannot — the
    migration fixture is SQL and the guard names what it searches. Criterion corrected, not tests
  - result: no source file outside the migrations and the two tests of the removal reads a next
    action. Open for owner validation; no blocker.
