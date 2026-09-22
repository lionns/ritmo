## Trace

- 2026-09-22 — role: Backend Implementer
  - read: T-031, status/config, gates, harness flow/protocols/templates, data model,
    agent configuration, migrations 0001–0004, SQLite runner and integration tests.
  - baseline: unit 55/55, isolation, harness lint, typecheck, build, integration 26/26 green.
  - initial preflight: SQLite backup from read-only source; integrity ok; 5 actions,
    1 closed without matching step. Stopped and recorded blocker before implementation.
  - owner then confirmed all are disposable test data; D-028 records authorization to drop.
  - did: added 0005 DROP, updated existing schema/upgrade tests and data-model retention note.
  - preserved original backup: `data/ritmo-T-031-before-20260922T141909.sqlite`.
  - fresh throwaway RITMO_DB_PATH passed absence/ledger checks.
  - failed probe: newer backup already lacked next_actions; local ledger had applied 0005
    at 19:23:12.983Z UTC, before planned copy verification (likely the running app).
  - recovery: copied original pre-drop backup to `data/ritmo-T-031-verification.sqlite`;
    migrated successfully, compared every surviving row and repeated migration as a no-op.
  - local database also matches original surviving rows: steps 8, entries 6, projects 4,
    areas 4, objectives 0, tags 0, owners 1; other retained tables empty and unchanged.
  - checks: copy/local integrity and foreign keys clean; migration ledger records 0005 once.
  - final: unit 55/55, isolation, typecheck, build, integration 26/26 green; 3 existing hints;
    status/index regenerated, harness lint and git diff --check passed.
  - files: migration, integration tests, model, decision, task, trace, journal, status/index.
  - remaining: literal grep criterion includes historical executable SQL; kept it unchecked
    for review instead of rewriting old migrations. No application reader exists.
  - decisions: D-028; no product behavior changes. Independent review and owner validation pending.
