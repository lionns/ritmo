# Architecture

The foundation lives in `docs/decisions/` as accepted decisions carrying `- Foundation: <topic>`.
This file summarizes what was decided there; it is not where architecture gets chosen.

## Stack

TypeScript end to end. The server runs on the pinned Node `24.20.0` line on the owner's machine
(`D-018`). Storage is a SQLite file through the built-in `node:sqlite` module (`D-019`). Local
scripts apply migrations and seed the file; `tsc` checks types and Node's built-in runner tests the
core (`D-006`).

No routing library. Astro and Tailwind remain the interface dependencies, with Vitest confined to
the integration gate (`D-021`, `D-022`).

## Frontend

Astro with SSR via the standalone `@astrojs/node` adapter, Tailwind for styles, components
organised by atomic design (`D-021`). The Node process serves both the rendered routes and static
assets while it is running.

**Zero client JavaScript by default.** React is permitted only as an island, in a component that
demonstrably needs it, never as the rendering base — an island that exists for convenience is a
defect against `NFR-1`, the 20-second entry on a phone. Astro ships no bundle unless asked, so the
critical path stays as small as hand-written HTML would have kept it; what changed is the tooling
and the arrival of a build step and a real dependency tree.

**Ritmo does not work offline.** `NFR-6` was narrowed from offline-tolerant reads to fast first
render when this was settled. It is the deliberate loss recorded in `D-007` and carried forward by `D-008`, and the most likely of
the seven to be revisited: if logging fails on a train often enough to matter, the fix is one
adapter plus a superseding decision, not a rewrite.

## Backend

A pure core holding the domain rules — reserves, derived objective state, stale rate, consistency
ratio, estimate calibration — with no I/O of any kind, reached through ports (`D-009`, superseding
`D-003`). Astro owns routing; the API lives in `src/pages/api/**` and is the only code that reaches
adapters and core. `adapters/http/` is not a router: it holds session verification, form parsing and
error mapping, so endpoints stay thin.

**No template ever reads data.** `.astro` routes and components consume `/api/*` and import
`contracts/` for the types. Neither Express nor Hono appears. Node now provides `node:http`, but a
second router would still duplicate what Astro already does.

**The boundary is checked, not trusted.** No file in the core may import from `@cloudflare/*` or
`cloudflare:*`, name the `Env` binding type, or touch any platform API; a zero-dependency script
enforces it in the baseline gate. Platform coupling arrives one well-excused import at a time and is
invisible until someone tries to move, so it is caught the day it happens rather than the day it
hurts.

Derived values still run over bounded windows — four weeks for dormancy, roughly eight for the
attribution pattern, the last twenty closed actions for calibration. Node has no Workers CPU
ceiling; the bounds now protect work as the owner's log grows (`D-018`).

## Data

One SQLite file, schema and migrations as in `data-model.md`: ten product tables, `TEXT` and
`INTEGER` types, ISO-8601 strings for timestamps. A local migration table records each ordered SQL
file once. Partial unique indexes carry the validation rules that prose could not enforce — one
open `NextAction` per project is an index, not a convention. Derived values are computed, never
stored, so they cannot drift from the log.

Multi-statement writes use SQLite transactions. `replaceNextAction` closes the old action and
inserts its replacement inside one transaction, so either both changes land or neither does.

The owner holds `data/ritmo.sqlite` and therefore owns its durability (`D-019`). A consistent backup
must use `VACUUM INTO` or a backup API against a quiesced database; copying the live file is not a
backup. `FR-21` remains the requirement to produce that consistent copy on demand.

## Layout

The top level is the architecture. Three directories hold the code, and which one a file is in tells
you what it may depend on.

```
ritmo/
├── core/          the rules. Pure TypeScript, no I/O or platform imports. Imports nothing.
│   ├── model/     the ten entities as types
│   ├── rules/     reserves, derived state, stale rate, consistency, calibration
│   └── ports/     the interfaces the core needs — Store, Clock
├── adapters/      the outside world. The only place storage/platform I/O may be imported.
│   ├── sqlite/    Store, connection and migration applier against node:sqlite
│   └── http/      session, form parsing, error mapping. Not a router — Astro routes.
├── contracts/     the API request and response types. The only thing both sides share.
├── src/           Astro.
│   ├── pages/api/   THE BACK — endpoints. May reach adapters and core.
│   ├── pages/       THE FRONT — routes. May import contracts only.
│   ├── components/  atoms/ · molecules/ · organisms/   (atomic design)
│   ├── layouts/     templates, in atomic-design terms
│   └── lib/         testable front helpers. May import contracts and other front files.
├── test/
│   ├── core/        node --test, nothing installed
│   └── integration/ the API handlers and store against a real SQLite file
├── migrations/    ordered SQL, applied once by the local migration applier
├── data/          the ignored owner-held SQLite file
├── scripts/       local reset/seed + boundary and harness scripts
└── docs/          the harness and the specification
```

### Routes

Six routes, three levels deep, plus the API. The map, the reachability rules and the reasoning are in
`design-handoff.md` § Navigation Map.

| Route | Renders |
|---|---|
| `/` | Portfolio — what moved before what is outstanding (US-3). The landing. |
| `/p/:id` | One project: history, next action, dormant state, inline log form. |
| `/semana` | One route, two states — the week's proposal (FR-10) and its close (US-7, US-8). |
| `/archivo` | Shelved, dormant and closed work. Never the landing. |
| `/ajustes` | Capacity cap (US-1), areas, tags, export (FR-21), passkey. |
| `/entrar` | Passkey sign-in (D-004). |
| `/api/*` | The back. Never navigated to. |

There is no persistent navigation chrome: the wordmark returns to `/` and every other route is
reached from the surface where it is relevant.

**The arrows only point inward, and there are three of them** (`D-017`, superseding `D-009`):

| Layer | May import | Enforced |
| --- | --- | --- |
| `core/` | nothing | no platform built-ins, no adapters |
| `adapters/` | `core/`, `node:*` | the only directory allowed storage/platform I/O |
| `src/pages/api/` | `contracts/`, `adapters/`, `core/` | this is the back |
| `src/pages/`, `src/components/`, `src/layouts/`, `src/lib/` | `contracts/`, other front files | **a front file importing an adapter or core fails the baseline** |

`npm run check:core` enforces all four rows. This is what let the store move from D1 to a local file
without the rules noticing, and it keeps platform I/O behind one adapter boundary.

### Where to start reading

1. `core/rules/` — this is the product. Everything else is plumbing to get data in and out of it.
2. `core/ports/` — the complete list of what the rules need from the world. Short by design.
3. `contracts/` — the whole API surface in one place, types only.
4. `adapters/sqlite/` — how the needs are met today. Replaceable.
5. `src/pages/api/` then `src/pages/` — the back, then the front that consumes it.

A change that adds a rule touches `core/` and its test. A change that only alters how something is
stored or displayed must not touch `core/` at all; if it does, that is the signal to stop and ask
whether the rule was in the wrong place.

## Security

The local-only stage binds use to the owner's machine and does not implement authentication
(`D-020`). `D-004` remains the accepted design for a stateless signed cookie and per-device passkey
credentials, and becomes mandatory before any future decision exposes the process to a network.

Ownership is an explicit column on every owned row rather than an implied singleton (`NFR-3`), so a
second party would be an insert rather than a migration.

**What is knowingly given up:** nothing runs while the owner's machine or process is off, and the
owner is responsible for database durability (`D-019`, `D-020`). The local server is not a hosting
configuration; exposing it would reopen authentication, certificates and operational security.
