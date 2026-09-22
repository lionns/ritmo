# D-027 — Effort is attributed to a step when it is written, not derived later

- Status: accepted
- Date: 2026-09-21
- Supersedes: none — it replaces the derivation in `brief.md` (settled 2026-08-29) and
  `data-model.md` § Derived values, neither of which is a decision file
- Tasks: T-026

## Context

`FR-20`'s actual was **derived**: effort logged on a project between a next action's `createdAt`
and `closedAt`, assuming work in that window belonged to it. That held while exactly one action was
open per project. `D-024` made it a **list**, so windows overlap and the same minutes count in full
toward every step open at the time — the owner found it by asking how the product could know.
Reading backwards instead is closed off by `FR-22`: a past `markedFor` is never read.

## Decision

`Entry` carries **`stepId`**, nullable, set **when the entry is written**. If exactly one step of
that project is marked for the entry's day, the entry records it; with several marked or none, it
records nothing. The owner is asked nothing — the server already knows what is marked. A step's
actual is the sum of the effort on entries pointing at it: exact, not derived.

## Consequences

- **Nothing reads a past mark**, so `FR-22`'s expiry stands: attribution happened while the mark
  was alive, and a day that went unworked still leaves no trace.
- **Ambiguity yields no attribution, never a split.** Splitting minutes across two marked steps
  invents precision; recording nothing loses a sample and keeps the rest true. §10 wants enough
  good samples, not all of them, and the calibration is already bounded to twenty.
- The history can state a closed step honestly — estimate beside recorded effort — or say nothing
  where it never knew.
- One additive migration and one nullable column. `NFR-1` is untouched: no field is added to the
  log form, and nothing is typed twice.
- An unattributed entry still counts as progress everywhere it did before: attribution serves
  calibration only, and is not a second kind of entry.

## References

- `FR-20` `FR-22` · `D-024` · `brief.md` § Scope · `data-model.md` § Derived values · §10
