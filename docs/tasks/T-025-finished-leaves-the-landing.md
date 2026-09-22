---
id: T-025
title: A finished project leaves the landing
status: done
profile: team
harness: 0.9.0
role: Frontend Implementer
goal: Take finished projects out of every group on `/` the moment they are finished, and remove the
  week-long stay and the code that served it, so the landing shows what is live and nothing else.
decisions: [D-026]
implements: [FR-23]
---

## Sources

- `docs/decisions/D-026-a-finished-project-leaves-the-landing.md` — the whole of this task
- `docs/decisions/D-025-finishing-a-project.md` — the consequence `D-026` supersedes, and the rest
  of it, which stands untouched
- `core/rules/portfolio.ts` — `finishedThisWeek`, `weekStartOf` and `sortKey`, all added for the
  week-long stay
- `src/pages/api/portfolio.ts` — the `finishedAt === null` filter on `activeCount`, which becomes
  unreachable once no finished project enters a group
- `src/components/molecules/ProjectCard.astro` — its `finished` branch, for the same reason
- `README.md` § La pantalla del proyecto and `design-handoff.md` § The Project Row

## Scope

- **`core/rules/portfolio.ts`.** A project with `finishedAt` set enters no group. `weekStartOf`,
  `finishedThisWeek` and `sortKey` go with it; `progress` sorts by its most recent entry again.
- **`src/pages/api/portfolio.ts`.** The `activeCount` filter goes: the rule is the one place the
  cap is decided, and a guard nothing can reach cannot be tested.
- **`src/components/molecules/ProjectCard.astro`.** The `finished` branch goes; the card only ever
  renders live projects now.
- **The manual and the handoff** stop saying a finished project stays for its week.

## Out of Scope

- Anything else in `D-025`: finishing on any day, the cap freeing at once, undo to `shelved`, no
  celebration. All stand.
- `/archivo` and `/p/:id`, which already show finished projects and are how they stay reachable.
- `FR-14`'s missing interface, still its own task.

## Acceptance Criteria

- [x] WHEN a project is finished THE SYSTEM SHALL return it in none of `progress`, `outstanding`
      or `shelved`, on the same day — no week of grace.
- [x] WHEN a project is finished THE SYSTEM SHALL still report an `activeCount` one lower, with
      the endpoint no longer filtering — the check that the rule alone holds the cap.
- [x] WHEN a finished project is undone THE SYSTEM SHALL return it among `shelved` again.
- [x] WHEN `/` renders after a project is finished THE SYSTEM SHALL contain neither its title nor
      the word "Terminado".
- [x] `grep -rn "weekStartOf\|finishedThisWeek" core/ src/` returns nothing.
- [x] `/p/:id` and `/archivo` still list it — the check that exercises this against `T-022`
      and `T-023`.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: seed a throwaway `RITMO_DB_PATH`, finish a project, and read `/`, `/p/:id` and
  `/archivo`. Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption: removing `weekStartOf` rather than leaving it for `/semana`. It is six lines and a
  Monday definition that route will want to settle for itself; an unused helper is a claim about a
  decision nobody has taken.

## Risks

- **This is a deletion, and deletions look like nothing.** The only visible proof is a project that
  is not where it was, so the criteria name both what disappears and what must still be reachable.
- `D-025` stays accepted and now has one consequence that is no longer true. `D-026` names which,
  and a reader of `D-025` alone would be misled — which is what the `Supersedes` line is for.

## Outcome

- Changes: a finished project enters none of the landing's groups; `weekStartOf`,
  `finishedThisWeek` and `sortKey` deleted; the endpoint's `activeCount` filter deleted so the cap
  lives in one place; the card's `finished` branch deleted; manual and handoff corrected.
- Files: `core/rules/portfolio.ts`, `src/pages/api/portfolio.ts`,
  `src/components/molecules/ProjectCard.astro`, `test/integration/sqlite-store.test.ts`,
  `README.md`, `docs/project/design-handoff.md`.
- Baseline result: unit 51/51 · isolation · typecheck 0 errors · build · integration 18/18.
- Final result: identical. Nothing this task removed had a test of its own beyond the one moved.
- Decisions recorded: `D-026`, accepted, superseding one consequence of `D-025`.
- Follow-up: `FR-14`'s missing interface, unchanged and still the oldest unbuilt promise.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `docs/decisions/D-025-finishing-a-project.md` · It stays `accepted` while one of its
  consequences is now false. That is what the template's immutability buys — the reasoning of the
  day survives — but anyone reading `D-025` without following `Supersedes` gets the wrong answer.
  · `D-026` names exactly which consequence and why; there is no cheaper way to keep both true.
- Low · `src/pages/api/portfolio.ts` · The filter removed here was added by `T-022` after this
  exact number silently widened the cap. Removing a guard that once caught a real bug deserves
  naming: it is unreachable now because no finished project enters a group, and the integration
  case still asserts `activeCount` drops when one is finished.
- Note · The week-long stay lasted about an hour of real use before the owner called it noise. The
  reasoning in `D-025` was sound and the constraint it rested on — no `/archivo` — expired the
  same day it was written. Worth remembering before defending a consequence on its argument alone.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-21

## Trace

Team profile — `docs/traces/<date>_T-025_frontend-implementer.md`.
