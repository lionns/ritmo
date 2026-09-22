# D-025 — Finishing a project, as a timestamp rather than a state

- Status: accepted
- Date: 2026-09-21
- Supersedes: none
- Tasks: T-022

## Context

`Project.state` is `active | shelved` and nothing else. `FR-17` makes shelving reversible and free
of penalty language — a pause, not an ending — so archiving a finished project records something
false, and `brief.md` § Success Measures cannot be answered while finished and shelved are one
row. The only trace of the missing idea was the route table calling `/archivo` "Shelved, dormant,
**closed**"; the word appeared nowhere else.

## Decision

A project carries **`finishedAt`**, a nullable timestamp — not a third `state`. Completion is
already a timestamp in this model (`Step.doneAt`, a closed week), `state` keeps meaning the
commitment rather than the outcome, and `ALTER TABLE ADD COLUMN` avoids rebuilding `projects`
against its four foreign keys. Finishing is allowed **any day**: it records what happened, not a
change of plan, so `FR-14` does not bind it. It **frees the cap slot at once** — the cap exists
because too many live goals are a resource problem (§11, §12), and a finished one is not carried.
Un-finishing sets it back to null and returns the project to `shelved`, never straight to `active`,
which would reopen the week's fixed set.

## Consequences

- A finished project stays in **`EN MOVIMIENTO` for the week it was finished**, then drops out
  until `/archivo` exists. It moved, more than anything else on the screen, and §4 says that is
  what the landing shows. Grouping it under "para cuando vuelvas" would repeat the lie.
- No celebration attaches: §14 forbids the reward layer, so the acknowledgement is that the row
  changes. `FR-17` gains a sibling rather than changing — shelving stays what it is.
- The cap counts active projects **with `finishedAt` null** — the one place a mistake here would
  be invisible, since a miscount silently widens the cap. Entries and steps are untouched.

## References

- `data-model.md` § Project · `migrations/0001_initial_schema.sql:53` · `FR-14` `FR-17` ·
  `brief.md` § Success Measures · `research.md` §4 §11 §12 §14 · owner, 2026-09-21
