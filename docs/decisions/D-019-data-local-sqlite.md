# D-019 — SQLite in the process, and the durability that comes back with it

- Status: accepted
- Date: 2026-09-02
- Supersedes: D-002
- Tasks: T-011
- Foundation: data

## Context

`D-002` chose "D1, which is SQLite" so the drawn schema would survive. That reasoning holds and is
why this move is cheap: the store changes host, not shape. `D-018` moved the runtime to Node, whose
pinned line ships `node:sqlite` in core — verified on 2026-09-02 against the installed `v24.16.0`.

## Decision

SQLite through **`node:sqlite`**, against a file the owner holds. `migrations/0001_initial_schema.sql`
and every future migration are applied verbatim: they are plain SQL and neither D1 nor `wrangler`
was ever in them. Ids stay text, timestamps stay ISO-8601 strings, and the partial unique indexes
keep carrying the rules prose could not.

## Consequences

- No dependency: `node:sqlite` is a built-in, so the store costs nothing in `package.json`.
- **The live-copy hazard returns.** `D-002` recorded that D1 owned durability and removed it. It is
  the owner's again, and it is the exact error `agent-config.md` § Known Risks lists as already made
  once in this project: **copying a live SQLite file is not a backup**, and can produce a corrupt
  one. A correct backup uses `VACUUM INTO` or the backup API against a quiesced database. No task
  may describe backup as `cp` without superseding this.
- `FR-21`'s export changes character rather than disappearing — the owner already holds the file, so
  the requirement becomes "produce a *consistent* copy on demand", which is the bullet above.
- Concurrency is still not a design concern, and now the single-process runtime is why.
- The port is untouched (`D-017`), so Postgres or a return to D1 stays an adapter.

## References

- `D-002` · `D-018` · `docs/project/data-model.md` · `docs/project/agent-config.md` § Known Risks
