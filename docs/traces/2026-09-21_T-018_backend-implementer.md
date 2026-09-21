## Trace

- 2026-09-21 — role: Backend Implementer
  - read: `T-018` § Scope, `data-model.md` § Step and § Data lifecycle, `D-024`,
    `migrations/0001_initial_schema.sql:75` and its partial unique index at `:89`,
    `adapters/sqlite/database.ts` (the ledger), `core/rules/next-action.ts` as the shape to mirror
  - did: `0002_steps.sql` — `steps` plus two partial indexes, and the carry-across of every open
    next action (`act` → `title`, id kept, `trigger` and `obstacle` dropped); `Step` in the model;
    six reads and writes on the port; `core/rules/step.ts` with write, mark, unmark, complete and
    the single day-list read; the SQLite implementation; eight unit cases and two integration ones
  - files: `migrations/0002_steps.sql`, `core/model/entities.ts`, `core/ports/store.ts`,
    `core/rules/step.ts`, `adapters/sqlite/store.ts`, `test/core/step.test.ts`,
    `test/integration/sqlite-store.test.ts`, and the three existing fakes, which needed the six
    new methods to keep implementing `Store`
  - checks: baseline unit 45/45, isolation, typecheck, build, integration 7/7, green before any
    edit; final unit 53/53, isolation, typecheck 0 errors, build, integration 9/9
  - probe: the carry-across is tested against a database built by `0001` alone and upgraded by
    `applyMigrations`, which is the owner's real path — not a fresh database where the test would
    pass with nothing to carry
  - decisions: none new. `marked_for` carries a `GLOB` check so an hour cannot reach the column,
    keeping `FR-22` in the schema rather than only in the rules, as `D-019` says the partial
    indexes already do for other rules
  - assumptions: none beyond the three the task records
  - result: steps exist beside next actions; nothing reads them yet and the product behaves exactly
    as before. Open for owner validation; no blocker.
