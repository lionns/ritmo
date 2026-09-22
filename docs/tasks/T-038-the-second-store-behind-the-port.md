---
id: T-038
title: The second store behind the port
status: ready
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Build the store T-036 chose as a second adapter behind the existing port, so the core and
  every rule above it are untouched, and so the local SQLite adapter keeps working for development
  and for the owner's own copy of the data.
decisions: []
implements: [NFR-3, NFR-4]
---

## Sources

- **T-036's accepted decision**, which names the store. This task cannot start before it.
- `core/ports/store.ts` — the port, and the reason this task is possible without touching `core/`
- `adapters/sqlite/store.ts` — the adapter to mirror, including how migrations are applied by name
  order through the `_ritmo_migrations` ledger
- `scripts/check-core-isolation.mjs` — the gate that keeps platform globals out of `core/`
- `test/integration/sqlite-store.test.ts` — the suite that proves an adapter honours the port

## Scope

- A second adapter under `adapters/`, implementing every method on the port
- Whatever `astro.config.mjs` and the build need in order to target the chosen host
- Migrations applied on the new store, by the same ledger and the same name order
- The integration suite run against **both** adapters, so the port is proven twice and not
  assumed

## Out of Scope

- Deleting `adapters/sqlite/`. It stays: it runs the tests, it runs `npm run dev`, and it is what
  `FR-21`'s export reads.
- Any change to `core/`. If a rule needs to change to fit the new store, the port was wrong and
  that is a finding, not a patch.
- Deployment and moving the owner's data — T-040.

## Acceptance Criteria

- [ ] Every port method is implemented, and the integration suite passes against both adapters
- [ ] `npm run check:core` stays clean — no vendor SDK, no platform global, no SQL in `core/`
- [ ] Migrations run on a fresh store in the same order and record the same ledger
- [ ] Nothing in `core/`, `contracts/` or `src/` names the vendor
- [ ] Switching between the two stores is configuration, not a code change

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, plus the integration suite green against the new adapter
- Task-specific: run the integration suite against the new store with no local SQLite available
  at all, to prove nothing silently falls back.
- Task-specific: check what the new store does with the things SQLite gave for free — the `CHECK`
  constraints, the partial indexes, `node:sqlite`'s transaction semantics. A constraint that
  silently does not exist on the new store is a data-integrity defect that every test will pass.

## Assumptions

- The port as written is complete enough for a second store. It was designed for exactly this and
  has never been tested against it.

## Risks

- The port has only ever had one implementation, so anything SQLite-specific that leaked into it
  will surface here. That is the useful outcome of this task, not a setback.

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

`team` only — required before `done`, and linted.

- Validated by:
- Date:
