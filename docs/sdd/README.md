# SDD Harness — Routing Index

Load only what the task needs. Do not read every harness document by default.

## Start Here, Always

1. `STATUS.md` (repo root) — current state of every task, decision, and journal entry.
2. `harness.json` (repo root) — active harness version and profile.
3. The assigned task file in `docs/tasks/`.

If those three answer the question, stop reading.

## Profiles

`harness.json` declares the active profile: `solo` or `team`. It decides roles, required records,
and gates. The comparison and the normative definitions are in `HARNESS.md` § Profiles.

## The Five Documents

| Document | Read it when |
|---|---|
| `HARNESS.md` | Executing any task: principles, inception, flow, profiles, DoR, DoD, gates |
| `ROLES.md` | You need role boundaries, universal agent rules, or escalation |
| `PROTOCOLS.md` | Selecting context, writing a trace, or reviewing a change |
| `TEMPLATES.md` | Creating a task, a decision, a journal line, or a trace block |
| `VERSION.md` | Recording or changing the harness version |

## Project Sources

Read only what the task touches, from `docs/project/`: `brief.md`, `requirements.json`,
`user-stories.json`, `acceptance-criteria.json`, `architecture.md`, `design-handoff.md`,
`data-model.md`, `quality-gates.md`, `agent-config.md`.

## Decisions

`docs/decisions/README.md` is the index. Open individual `D-###-*.md` files only when a task
references them.

## Governance Changes

Changes to `docs/sdd/`, `harness.json`, or the scripts require explicit human approval in both
profiles, a decision file, and a `VERSION.md` entry. See `ROLES.md` § Controlled Self-Improvement.
