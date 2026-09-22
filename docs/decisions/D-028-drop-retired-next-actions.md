# D-028 — Drop the retired next-action test data

- Status: accepted
- Date: 2026-09-22
- Supersedes: none — replaces the retention note in data-model.md § Retired: NextAction
- Tasks: T-031

## Context

T-031's backup preflight found five next actions, including one closed action without a
matching step. Migration 0002 deliberately copied only open actions. The task stopped as
required before adding a destructive migration.

## Decision

The owner clarified: “Por el momento no es necesario mantener nada, son datos de prueba”.
Drop the retired `next_actions` table, including the unmatched closed action. No recovery
or conversion of these test rows is required. This authorizes T-031's narrow deletion;
the other tables and their rows remain in scope for preservation.

## Consequences

- Migration 0005 removes the table, its indexes and its constraints.
- Keep historical migrations intact so existing databases can upgrade in order.
- Keep the preflight backup and verify a throwaway database and a copy before local apply.
- The earlier retention requirement and unmatched-row stop condition are resolved for T-031.

## References

- T-031 · D-024 · owner clarification in this session, 2026-09-22
