# D-023 — The boundary check stops naming a vendor the project left

- Status: accepted
- Date: 2026-09-02
- Supersedes: none
- Tasks: T-011

## Context

`T-011` edited `scripts/check-core-isolation.mjs` without the file appearing in its Scope, which
`AGENTS.md` governs: changes there need explicit human approval and a decision file. The review
raised it as a Medium; the owner **approved it on 2026-09-02** and asked for the record. This file
is that record, written after the fact — which is the irregularity being closed.

## Decision

Keep the change. The rule matching the `@cloudflare/` and `cloudflare:` module specifiers is
removed, and `Cloudflare` joins the platform-global word list. `D-018` through `D-021` moved the
project off that vendor, so a rule naming it was describing a platform the code no longer has.

## Consequences

- Real coupling stays caught, verified by mutation in the `T-011` review rather than argued: a
  `cloudflare:workers` import and a `@cloudflare/workers-types` type import from `core/` are both
  still reported, by the rule that any core import must resolve inside `core/` — which is
  platform-agnostic, and is why it also catches `node:sqlite` today.
- What is no longer caught is an inert lowercase textual reference — a string or a comment. The
  removed rule did catch those, and nothing replaces it. Accepted: it coupled nothing.
- The platform-global list keeps its Cloudflare type names on purpose: they now guard reintroduction.
- No `VERSION.md` entry. `VERSION.md` § Change Rules bumps for *harness* behaviour, and this script
  enforces `D-017`, an architecture decision of this project — the same reading the owner settled in
  `T-009` when a harness bump made there was reverted. Recorded explicitly so the omission is a
  decision rather than a missed step.
- Approval after the edit is the second such case this session; the countermeasure is scope wording,
  not this file — a task that may touch `scripts/` says so before it starts.

## References

- `AGENTS.md` § Governance · `docs/sdd/VERSION.md` § Change Rules
- `docs/tasks/T-011-off-cloudflare-onto-node-and-sqlite.md` § Review · `T-009` · `D-017`
