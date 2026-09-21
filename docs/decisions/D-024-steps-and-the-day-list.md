# D-024 — Steps and a day list replace the if–then trigger

- Status: accepted
- Date: 2026-09-21
- Supersedes: none
- Tasks: T-017

## Context

Since `T-013`, `FR-6` has required a next action written as a trigger and an act, closed only by
writing its replacement. After weeks of real use the owner reports the trigger is what stopped the
product being used: it names a moment the day has to hit — "cuando termine de trabajar" — and
`brief.md` § Users describes a day whose shape is not knowable. Planning cost more than logging.

## Decision

Replace the trigger with **steps and a day list**. A project carries a short list of next steps —
the next stretch only, never the whole project (§10). Once a day the owner marks which they will do
today, from projects already active that week. No hour, no duration, no condition, no daily cap:
`FR-13`'s weekly cap stays the only one. A mark expires with the day and leaves nothing behind.

## Consequences

- **This overrides `research.md` §6** and its `d = 0.65`, named as § Constraints ("Evidence-bound
  design") requires. What replaces it is §1's own remedy — *"commit to a day, not a clock slot"* —
  and the half of §12 no requirement picked up: *"a day view that names one or two focus
  projects"*, a phrase appearing once in the repository, at `research.md:169`.
- §12 says one or two; the owner chose no daily cap, because `FR-13` already asks that question at
  setup. The divergence is deliberate.
- `FR-6` is rewritten, `US-4`'s first criterion with it, and `NextAction.trigger` leaves the model.
  "Cerrar y escribir la siguiente" goes too: the next step is already in the list.
- The invariant "an active project must have exactly one open `NextAction`" falls.
- **The risk taken on** is the one `brief.md` § Users names — detailed plans abandoned once the gap
  to reality showed. Three guardrails bind, shaped like the week-attribution ones: the step list
  lives inside the project and never on `/` · no count of pending steps · never red. A day with
  nothing marked is a complete day.

## References

- `research.md` §1 §3 §6 §10 §12 · `brief.md` § Users, § Constraints · `FR-6` `FR-13` `US-4` · `T-013`
