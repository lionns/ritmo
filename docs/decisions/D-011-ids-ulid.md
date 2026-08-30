# D-011 — ULID text ids, generated behind a port

- Status: accepted
- Date: 2026-08-30
- Supersedes: none
- Tasks: none

## Context

`data-model.md` left the `id` type open pending `runtime`, `data` and `identity`, all now settled
(`D-001`, `D-002`, `D-004`). D1 is SQLite, so `INTEGER PRIMARY KEY` autoincrement is available — but
the id would then exist only after the write, which a pure core cannot depend on.

## Decision

Every entity id is a **ULID stored as `TEXT`**, generated in `core/` through an `IdGen` port beside
`Clock` and implemented in `adapters/`. The generator is written by hand over
`crypto.getRandomValues` — Crockford base32 over a 48-bit timestamp and 80 random bits — so it adds
no dependency (`D-006`).

## Consequences

- The core builds a complete entity without a round trip, and tests inject a deterministic generator
  exactly as they already inject a clock (`D-009`).
- ULIDs sort lexicographically by creation time, so `Entry` rows land at the end of the primary key
  index instead of fragmenting it. The table that grows fastest is the one that benefits.
- Ids survive the SQLite export of `FR-21` and any re-import, and are not guessable — which starts
  mattering the day a second party exists (`NFR-3`).
- A 26-byte text key costs against an 8-byte integer one. Irrelevant against the 5 GB ceiling of
  `D-002` at personal scale, and it is the price of the first consequence.
- Writing the generator means owning it. The spec's monotonic-within-a-millisecond clause is
  deliberately not implemented: no write path here mints two ids in the same millisecond.

## References

- `docs/project/data-model.md` § Entities · `D-001`, `D-002`, `D-006`, `D-009`
