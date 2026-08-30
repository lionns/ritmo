# D-002 — D1, which is SQLite

- Status: accepted
- Date: 2026-08-29
- Supersedes: none
- Tasks: none
- Foundation: data

## Context

One owner writing a few dozen rows a day. Portability matters more than concurrency or scale, and
after `D-005` the store has to exist on Cloudflare's free plan.

## Decision

Cloudflare D1, which is SQLite — so the schema already drawn survives essentially unchanged. The
provisional types in `data-model.md` resolve to `TEXT`, `INTEGER` and ISO-8601 strings for
timestamps. Partial unique indexes carry the validation rules
that prose alone could not enforce, including one open `NextAction` per project.

## Consequences

- Verified free limits: 5 GB storage, 100,000 rows written per day, 5 million read. A single owner
  writes perhaps twenty rows a day, so the headroom is roughly five thousandfold.
- No database service to patch, version or restart, and no backup schedule to run.
- D1 owns durability, which removes the live-copy hazard that self-managed SQLite carries.
- It also means the owner holds no copy at all unless `FR-21` exists — hence the export requirement.
- No `uuid` or `timestamptz` type: ids are text and timestamps are ISO strings, checked in code.
- Concurrent writers are not a design concern here and must not become one without superseding this.
- Storage stays behind a port (D-003) so a future move to Postgres is an adapter, not a rewrite.

## References

- `docs/project/data-model.md` § Open decisions
- `D-005`
