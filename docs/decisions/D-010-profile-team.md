# D-010 — Switch the profile to `team`

- Status: accepted
- Date: 2026-08-29
- Supersedes: none
- Tasks: none

## Context

The project ran as `solo`, where only Planner, Implementer and Reviewer exist and the rest are hats
the same agent wears. The owner has a second agent family available, and `HARNESS.md` defines the
`team` profile as "multiple people **or multiple agent families**" — the criterion is met without a
second person. The roles the owner wants split — Frontend Implementer, Backend Implementer, Tester —
do not exist under `solo` at all.

## Decision

`harness.json` moves from `solo` to `team`. Claude Code takes Planner, Reviewer and Tester; Codex
takes both Implementer roles. The owner is the named validator on every task, without exception.

Governance change, approved explicitly by the owner on 2026-08-29. No `VERSION.md` entry: that file
is the harness's own changelog and must not diverge from upstream. Nothing about the harness changed
— only this project's configuration, to a value the harness already offers.

## Consequences

- **The one who writes the code no longer reviews it.** This is the point. Three defects during the
  specification phase surfaced only from an outside question, never from the agent re-reading itself.
- **Tests are written without having seen the implementation**, from `acceptance-criteria.json`,
  which removes the test shaped to fit the code that just got written.
- **Task files must now carry everything.** The implementer starts cold on each task with no memory
  of why a decision was made, so any gap in a task file gets filled by invention. This is also the
  real test of whether the specification works at all.
- **The paperwork grows**: a trace file per role per task in `docs/traces/`, plus a validation record
  naming the owner. Three or four records per task instead of one.

## References

- `docs/sdd/HARNESS.md` § Profiles · `docs/sdd/ROLES.md`
- `docs/project/agent-config.md`
