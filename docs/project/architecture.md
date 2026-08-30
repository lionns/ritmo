# Architecture

The foundation lives in `docs/decisions/` as accepted decisions carrying `- Foundation: <topic>`.
This file summarizes what was decided there; it is not where architecture gets chosen. Every
statement below traces to `D-001` … `D-007`.

## Stack

TypeScript end to end (`D-001`). The server runs on the Cloudflare Workers runtime — V8 isolates
with Web APIs, **not Node** — so Node built-ins exist only through the opt-in compatibility layer,
and only partially. Storage is Cloudflare D1, which is SQLite (`D-002`). Tooling is `wrangler` for
deploys and migrations, `tsc` for types, and Node's built-in test runner for the core (`D-006`).

No routing library and no test framework; Astro and Tailwind are the accepted build-time
dependencies (`D-008`), plus Cloudflare's local test tooling for the adapter tests (`D-006`).

## Frontend

Astro with SSR on Workers via `@astrojs/cloudflare`, Tailwind for styles, components organised by
atomic design (`D-008`, superseding `D-007`). Static assets are served by Workers, where they are
free and unlimited.

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
`contracts/` for the types. Neither Express nor Hono appears: Express needs `node:http` and cannot
run here, and a router would duplicate what Astro already does.

**The boundary is checked, not trusted.** No file in the core may import from `@cloudflare/*` or
`cloudflare:*`, name the `Env` binding type, or touch any platform API; a zero-dependency script
enforces it in the baseline gate. Platform coupling arrives one well-excused import at a time and is
invisible until someone tries to move, so it is caught the day it happens rather than the day it
hurts.

**10 ms of CPU per invocation shapes the domain** (`D-001`). Waiting on the database is free;
computing is not. Every derived value therefore runs over a bounded window — four weeks for
dormancy, roughly eight for the attribution pattern, the last twenty closed actions for calibration.

## Data

D1, one database, schema and migrations as in `data-model.md`: ten tables, `TEXT` and `INTEGER`
types, ISO-8601 strings for timestamps. Partial unique indexes carry the validation rules that prose
could not enforce — one open `NextAction` per project is an index, not a convention. Derived values
are computed, never stored, so they cannot drift from the log.

D1 has no interactive transactions; atomic multi-statement work uses its batch API. Nothing in the
model currently needs more than that.

Durability is Cloudflare's, which means the owner holds no copy unless one is made: `FR-21` — a full
export to a downloadable SQLite file — is a requirement, and the condition the privacy reversal in
`D-005` rests on.

## Layout

The top level is the architecture. Three directories hold the code, and which one a file is in tells
you what it may depend on.

```
ritmo/
├── core/          the rules. Pure TypeScript, no I/O, no Cloudflare. Imports nothing.
│   ├── model/     the ten entities as types
│   ├── rules/     reserves, derived state, stale rate, consistency, calibration
│   └── ports/     the interfaces the core needs — Store, Clock
├── adapters/      the outside world. The only place `cloudflare:*` may be imported.
│   ├── d1/        Store against D1, plus the migrations
│   └── http/      session, form parsing, error mapping. Not a router — Astro routes.
├── contracts/     the API request and response types. The only thing both sides share.
├── src/           Astro.
│   ├── pages/api/   THE BACK — endpoints. May reach adapters and core.
│   ├── pages/       THE FRONT — routes. May import contracts only.
│   ├── components/  atoms/ · molecules/ · organisms/   (atomic design)
│   └── layouts/     templates, in atomic-design terms
├── test/
│   ├── core/        node --test, nothing installed
│   └── integration/ the Worker against a local D1
├── migrations/    SQL, applied by wrangler
├── scripts/       check-core-isolation.mjs + the harness scripts
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

**The arrows only point inward, and there are three of them** (`D-009`, superseding `D-003`):

| Layer | May import | Enforced |
| --- | --- | --- |
| `core/` | nothing | no `cloudflare:*`, no adapters |
| `adapters/` | `core/`, `cloudflare:*` | the only directory allowed the platform |
| `src/pages/api/` | `contracts/`, `adapters/`, `core/` | this is the back |
| `src/pages/`, `src/components/` | `contracts/` only | **a template importing an adapter fails the baseline** |

`npm run check:core` enforces all four rows. This is what let the store move from a VPS file to D1 in
an afternoon without the rules noticing, and it is what keeps Cloudflare in one directory rather than
in every page.

### Where to start reading

1. `core/rules/` — this is the product. Everything else is plumbing to get data in and out of it.
2. `core/ports/` — the complete list of what the rules need from the world. Short by design.
3. `contracts/` — the whole API surface in one place, types only.
4. `adapters/d1/` — how the needs are met today. Replaceable.
5. `src/pages/api/` then `src/pages/` — the back, then the front that consumes it.

A change that adds a rule touches `core/` and its test. A change that only alters how something is
stored or displayed must not touch `core/` at all; if it does, that is the signal to stop and ask
whether the rule was in the wrong place.

## Security

One owner, authenticated with a passkey or a password fallback, holding a stateless signed cookie —
no session table and no session store, which suits a runtime with no long-lived process (`D-004`).
Passkey credentials do persist, one row per device in `credentials`, so a lost phone is revoked by
deleting its row. No OAuth and no external identity provider: nothing about who the owner is reaches
a third party.

Ownership is an explicit column on every owned row rather than an implied singleton (`NFR-3`), so a
second party would be an insert rather than a migration.

**What is knowingly given up:** the data lives on Cloudflare, which holds the encryption keys and
can technically read it (`D-005`). Self-hosting was never the safer option, only the more controlled
one — a VPS patched in uneven time is more exposed, not less. What was ceded is control over access,
and `FR-21` is what keeps the owner from being locked in.
