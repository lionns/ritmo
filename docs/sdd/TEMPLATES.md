# Templates

## Task File

`docs/tasks/<ID>-<slug>.md`. Budgets: plan 120 lines; record 60, split at the first `## Outcome`.
Fill sections in place — **never append history**.
The change history of a task is `git log --follow` on its file.

````md
---
id: T-001
title: Short title
status: ready
profile: solo
harness: 0.3.0
role: Implementer
goal: One or two concrete sentences describing the desired outcome.
decisions: []
implements: [FR-1, US-2]   # optional; ids from docs/project/*.json, linted for existence
---

## Sources

- `path/to/spec.md` § section

## Scope

- Included file, feature, behavior, or artifact

## Out of Scope

- Excluded file, feature, behavior, or artifact

## Acceptance Criteria

- [ ] Testable criterion

## Verification

- Baseline: `command`
- Final: `command`
- Task-specific: manual check or review step

## Assumptions

- Labelled assumption, or "None"

## Risks

- Risk, or "None"

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

- Validated by: Name
- Date: YYYY-MM-DD

## Trace

- YYYY-MM-DD — read: … · did: … · checks: … · result: …
````

### Acceptance Criteria

Behavioral criteria state a trigger and an observable result:
`WHEN a task is set to done with no journal line THE SYSTEM SHALL exit non-zero naming the id.`
Non-behavioral ones stay plain: `the budget holds.` "Works correctly" is neither. At least one
criterion must exercise the change together with existing behavior rather than in isolation. The
grammar is not linted: a rule satisfiable by shape alone would be worse than none.

## Decision File

`docs/decisions/D-###-<slug>.md`. Budget: 40 lines. One decision per file, immutable once
`accepted` — supersede it with a new file rather than editing it.

```md
# D-004 — Short title

- Status: proposed | accepted | superseded
- Date: YYYY-MM-DD
- Supersedes: D-002 | none
- Tasks: T-003
- Foundation: runtime        # only when this decision settles a topic — HARNESS.md § Inception

## Context

The problem, constraint, or tradeoff. Two or three sentences.

## Decision

The selected approach. One or two sentences.

## Consequences

- What this makes easy, and what it costs.

## References

- `path` or `T-###`
```

After creating one, add its row to `docs/decisions/README.md`.

## Journal Entry

`JOURNAL.md`, append-only, newest last. Exactly one line, pipe-separated:

```txt
YYYY-MM-DD | T-### | done | short outcome | N files | checks result | D-###,D-###
```

Use `-` for an empty field. Example:

```txt
2026-08-25 | T-003 | done | core + sqlite adapter behind port | 7 files | tests 42/42 | D-004
```

## Trace Block

Same shape in both profiles — inline in `solo`, in `docs/traces/` in `team`. Budget: 25 lines.
One sub-entry per working round; compress older rounds to one line when the budget fills.

```md
## Trace

- 2026-08-25 — role: Implementer
  - read: `docs/project/data-model.md`, `T-002`
  - did: added repository port + sqlite adapter
  - files: `src/core/ports.ts`, `src/adapters/sqlite/*`
  - checks: `pnpm test` 42/42, `pnpm typecheck` clean
  - assumptions: none
  - blockers: none
```

## Improvement Proposal

Governance changes need explicit human approval in both profiles.

```md
- Affected: `docs/sdd/PROTOCOLS.md` § Budgets
- Current limitation:
- Proposed change:
- Expected benefit:
- Risk or tradeoff:
```
