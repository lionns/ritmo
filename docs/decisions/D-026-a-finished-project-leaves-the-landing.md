# D-026 — A finished project leaves the landing at once

- Status: accepted
- Date: 2026-09-21
- Supersedes: D-025 (its first consequence only; everything else in it stands)
- Tasks: T-025

## Context

`D-025` kept a finished project in `EN MOVIMIENTO` for the week it was finished, and the reason was
stated there: `/archivo` did not exist, so leaving the landing meant vanishing with nowhere to go.
`T-023` built that route. The owner, using it, reports the week of visibility as noise — the same
way they found the trigger: by living with it rather than by reading the reasoning.

## Decision

A project with `finishedAt` set appears in **none** of `progress`, `outstanding` or `shelved`, from
the moment it is finished. It is reachable at `/p/:id`, listed in `/archivo`, and undoable from
either. The landing shows what is live and nothing else.

## Consequences

- **Neither group on the landing was ever true of it.** "En movimiento" says it will move again;
  "para cuando vuelvas" says it will come back. A finished project has no honest home there, which
  is the argument that outlives the `/archivo` one.
- §4 — small visible progress being the strongest motivator — was what bought the week. The moment
  survives without it: finishing changes the project's own screen to "Terminado · Deshacer" as it
  happens. A week of sitting in the working list is not acknowledgement, it is what the owner
  called noise.
- `weekStartOf` in `core/rules/portfolio.ts` loses its only caller. Nothing else asks which week a
  moment falls in until `/semana` exists.
- The cap already excludes finished projects in `core/rules/project.ts`, and now no finished
  project reaches the portfolio's groups either, so the endpoint's own filter becomes dead code.
  It goes: a guard that cannot be reached cannot be tested, and the rule is the one place.

## References

- `D-025` · `T-023` (`/archivo`) · `research.md` §4 · `brief.md` § Scope (the landing) ·
  owner, 2026-09-21
