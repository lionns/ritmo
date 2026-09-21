# D-025 — Finishing a project is a state the product does not have

- Status: proposed
- Date: 2026-09-21
- Supersedes: none
- Tasks: -

## Context

`Project.state` is `active | shelved` and nothing else (`data-model.md:110`). `FR-17` defines
shelving as reversible and free of penalty language — a pause, not an ending — so archiving a
finished project records something false. The only trace of the missing state is the route table
calling `/archivo` "Shelved, dormant, **closed**"; the word appears nowhere else in the repository,
in no requirement, field or rule. The owner raised it on 2026-09-21.

## Decision

*Proposed, not taken.* Add a third project state, **`done`**, rendered as "Terminado" and never as
"cerrado". A finished project leaves the portfolio for `/archivo`, keeps every entry as history,
and frees its cap slot **only at the next week boundary** — `FR-14` fixes the active set within a
week, and finishing is not a reason to reopen it mid-week. No celebration attaches to it: §14
forbids the reward layer, so the acknowledgement is that the project moves, in the shape
§ Interaction States already uses for logging.

## Consequences

- `brief.md` § Success Measures becomes answerable: it needs finished and shelved to be
  distinguishable, and today they are the same row.
- Finishing is the strongest progress signal the evidence names (§4, §19) and the product currently
  has nowhere to put it. This adds the place without adding a reward.
- `FR-17` gains a sibling rather than changing: shelving stays exactly what it is.
- `/archivo` is unbuilt, so a `done` project has no screen yet: either this waits for that route
  or `done` renders in the shelved group meanwhile. The implementing task decides, and says so.
- The state machine grows a one-way door. Unshelving is free, so un-finishing should be too, or
  the owner will avoid the button. Settled when this is planned.

## References

- `data-model.md:110` · `design-handoff.md` § Routes · `FR-14` `FR-17` · `brief.md` § Success
  Measures · `research.md` §4 §14 §19 · owner's question, 2026-09-21
