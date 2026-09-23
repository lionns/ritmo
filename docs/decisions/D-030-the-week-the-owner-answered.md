# D-030 — The week: its boundary, its proposal, and the one it never closes

- Status: accepted
- Date: 2026-09-22
- Supersedes: none
- Tasks: T-032

## Context

`T-032` put five questions to the owner, answered 2026-09-22. Three were already settled in
`data-model.md` on 2026-08-30 and the task did not say so — a commitment hangs off a project, it is
a frequency or a volume, and `proposedTarget` already sits beside `target`. `FR-15` needed no answer
either: it governs the active cap, which `Area.countsAgainstCap` implements. Below is what was open.

## Decision

1. **A week starts Monday on the local calendar**, through `calendarDateOf`. An entry belongs to
   the week holding its `occurredAt` local date, so one written at 00:30 on Monday about Sunday's
   work belongs to the **new** week. Ritmo records when you wrote it; there is no separate "when it
   really happened" and none is added.
2. **`FR-10`'s proposal is the median of what was achieved in the last 4 closed weeks**, per
   commitment, in that commitment's unit. **The 4 is the Planner's number with nothing behind it.**
   Under 4 closed weeks it is the median of what exists; with none there is no proposal — the field
   opens empty and the owner types the first target, which is where the product stands today.
3. **A week nobody closes closes itself when the next Monday arrives**: `closedAt` set,
   `capacityLabel`, `tagId` and `reflection` left null. `NFR-8` already holds an untagged week as
   complete, so nothing is owed (`FR-19`). The next week opens in the same movement.
4. **`Commitment` gains `unit`** — `times` or `minutes`. `target` is an integer and the model had
   no way to say which of the two it meant, so neither the close nor the proposal could read it.

## Consequences

- The first weeks propose nothing: the median needs closed weeks that do not exist yet. Honest,
  rather than a number invented to fill the field.
- A self-closing week is written by something that runs without the owner, so it must be
  idempotent: two opens of the app on a Monday must not close the week twice.

## References

- `FR-7`…`FR-12`, `FR-14`, `FR-19`, `NFR-8` · `core/rules/step.ts` § `calendarDateOf`
