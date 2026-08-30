# Agent Model Configuration

Which agent and model fills each SDD role. Role definitions live in `docs/sdd/ROLES.md`.

The profile is `team` (`D-010`), which the harness defines as "multiple people **or multiple agent
families**" — two agent families meet it without a second person. All seven roles exist. There is one
table rather than a current and a target: a second table would only be documentation that ages on
its own.

---

## Configuration

| Role | Agent | Model | Notes |
|---|---|---|---|
| Planner | Claude Code | `claude-opus-5` | Writes the task file. Holds the specification context, so the task must carry it |
| Frontend Implementer | Codex | `gpt-5.6-sol` | `src/` — Astro, Tailwind, atomic design |
| Backend Implementer | Codex | `gpt-5.6-sol` | `core/`, `adapters/`, `src/pages/api/`, migrations |
| Tester | Claude Code | `claude-opus-5` | Writes tests from `acceptance-criteria.json`, **before or without reading the implementation** |
| Reviewer | Claude Code | `claude-opus-5` | Via `/code-review`, on work it did not write |
| Release Engineer | Claude Code | `claude-opus-5` | `wrangler` deploys and migrations |
| UX/Motion Designer | Claude Code | `claude-opus-5` | Once `design-handoff.md` exists |

**Validator: the owner, on every task, without exception.** In `team` this is an explicit gate with
a named validator, not an implicit one.

---

## Rationale for Assignments

The split follows one principle: **whoever writes the code does not judge it.** Codex implements
both halves; Claude plans, tests and reviews. That gives genuine independence at the two seams where
it pays — review, and tests written from the criteria rather than fitted to the code.

Frontend and Backend both go to Codex rather than being split across families, because two agents
editing one codebase multiplies the context to pass and invites drift between them. The split that
matters is author versus judge, not front versus back.

`/code-review ultra` — a multi-agent review in the cloud, run by the owner — stays available for a
change large or risky enough to justify it.

**Sol on every task, deliberately.** OpenAI positions Terra as the pragmatic all-rounder and Luna for
"clear, repeatable tasks", and harness tasks are unusually well specified — which would have argued
for Terra. The owner chose the most capable model throughout instead, accepting the tighter budget:
on Plus, Sol allows roughly 15–90 local messages per five-hour window against Terra's 20–110, and
that budget is **shared across the CLI, the web app and the IDE extension**. Verified against
`learn.chatgpt.com/docs/models` on 2026-08-29, not recalled.

---

## Known Risks

- **The implementer starts cold on every task.** Claude carries nine decisions of context from the
  specification session; Codex will have none of it. Any gap in a task file is filled by invention.
  This is the risk the whole split creates — and equally the test of whether the specification is
  any good: if `brief.md`, `architecture.md` and the task file are not enough for another agent to
  implement without inventing, the documents are wrong, and failing at task one is cheap.

- **Self-review was the previous arrangement's flaw, and this is what it cost.** During the
  specification phase three real defects surfaced only because the owner asked a question, never
  because the agent re-read its own output: citation metadata completed from memory; a claim that
  backing up SQLite is a file copy, which is false and destructive; and a contradiction between
  `D-004` and the data model over passkey credentials. Splitting author from judge is the response.

- **The owner is least able to check exactly where the agent is least checkable.** Backend and
  deployment are self-declared weak spots, and in `solo` accepting the change *is* the validation.
  `quality-gates.md` compensates where it can — the isolation check, the integration test against a
  real D1 — but a wrong deployment decision has no automated gate to catch it.

- **The model's training has a cutoff; the platform moves.** Cloudflare limits, Astro adapters and
  library APIs must be retrieved rather than recalled. This is not hypothetical: the free-tier
  numbers in `D-002` and `D-005`, the Astro Cloudflare adapter in `D-008`, and the SQLite backup
  correction were all verified against live documentation, and the last one contradicted what the
  agent had already written.

- **Model names move, and a stale one fails silently.** `gpt-5.4` and `gpt-5.4-mini` retire from
  Codex on 2026-08-31; OpenAI's replacement guidance is `gpt-5.6-terra` and `gpt-5.6-luna`. Anything
  pinned in a `config.toml`, a custom agent or a scheduled task has to be checked. This file records
  a model name, so it is a thing that expires.

- **Fluent output reads as correct output.** A confident paragraph and a verified one look the same.
  The countermeasure is structural rather than stylistic: every claim about behaviour cites a file,
  a command or an observation, as `AGENTS.md` requires.

---

## References

- `docs/sdd/ROLES.md` — role definitions
- `docs/project/quality-gates.md` — commands used by Tester and Release Engineer
- `docs/project/design-handoff.md` — primary source for UX/Motion Designer
- `docs/decisions/` — record model assignment decisions as their own file
