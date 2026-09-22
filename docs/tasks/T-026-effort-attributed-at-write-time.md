---
id: T-026
title: Effort attributed to a step when it is written
status: done
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Give `Entry` a `stepId` the log route fills from the day's marks, and replace the overlapping
  window `D-024` broke with an exact attribution — so a closed step can say what it took, or say
  nothing, but never say something the product invented.
decisions: [D-027]
implements: [FR-20, FR-22]
---

## Sources

- `docs/decisions/D-027-effort-is-attributed-when-it-is-written.md` — the whole of this task
- `docs/project/data-model.md` § Derived values — the window rule this replaces, and § Step's
  `markedFor` note, whose "a past value is never read" this must not break
- `docs/project/brief.md` § Scope § Estimate calibration — the same derivation in prose
- `docs/project/requirements.json` — `FR-20`, whose statement names the window
- `src/pages/api/entries.ts` and `core/rules/entry.ts` — where an entry is written
- `core/rules/step.ts` — `calendarDateOf` and `readDayList`, which already answer "marked today"

## Scope

- **`migrations/0004_entry_step.sql`** — `ALTER TABLE entries ADD COLUMN step_id TEXT`, plus the
  index the per-step read needs. Additive; no row is rewritten and no history is reinterpreted.
- **`Entry.stepId`** through the model, the row type, its mapper and the store write.
- **`core/rules/entry.ts`** — on write, attribute: exactly one step of that project marked for the
  entry's day gives its id; several or none give null. The owner is asked nothing, and nothing
  reads a mark that is not current.
- **A port read** for the effort attributed to a step, and the derived actual built on it.
- **`FR-20` rewritten** in `requirements.json`, and the same derivation corrected in
  `data-model.md` § Derived values and `brief.md`.
- **Tests** for each branch: one marked, two marked, none marked, and a project whose entry is
  logged on a day with a mark belonging to a *different* project.

## Out of Scope

- **Drawing any of it.** The history with closed steps is `T-027`, and it is the reason this task
  exists; nothing in `src/components/` or `*.astro` changes here.
- **The calibration factor** itself — actual ÷ estimate across the last twenty. `FR-20`'s other
  half stays unbuilt, and this task only makes it buildable.
- Back-filling `step_id` on existing entries. Nothing knows which step they belonged to, and
  inventing it is exactly what `D-027` refuses.

## Acceptance Criteria

- [x] WHEN an entry is saved on a day when exactly one step of that project is marked THE SYSTEM
      SHALL record that step's id on the entry.
- [x] WHEN two steps of that project are marked for that day THE SYSTEM SHALL record no step on
      the entry, and SHALL NOT split its effort.
- [x] WHEN no step is marked THE SYSTEM SHALL record no step, and the entry SHALL still count as
      progress everywhere it did before — the check that exercises this against the portfolio.
- [x] WHEN a step of **another** project is marked that day THE SYSTEM SHALL record no step on
      this project's entry.
- [x] WHEN the effort attributed to a step is read THE SYSTEM SHALL sum only entries pointing at
      it, and SHALL return zero for a step nothing points at.
- [x] `grep -rn "createdAt.*closedAt\|open window" docs/project/` finds no surviving claim that
      the actual is derived from a window.
- [x] `data-model.md` § Step still says a past `markedFor` is never read, and nothing in this task
      reads one.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: seed a throwaway `RITMO_DB_PATH`, mark one step, log against it, and read
  `step_id` in the database. Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption: the entry's day is `calendarDateOf(entry.occurredAt)` in the owner's local calendar,
  the definition `D-020` and `calendarDateOf` already fixed. An entry is written the day it is
  written; the product has no backdating.
- Assumption: attribution is decided once, at write time, and never revisited. Marking a step after
  logging does not reach back — which is the point, and what keeps `FR-22` intact.

## Risks

- **This writes a column nothing renders yet.** A mistake here is invisible until `T-027`, so the
  tests carry the whole weight and are written per branch rather than per path.
- The window rule survives in three documents. Missing one leaves the product describing a
  calculation it no longer performs, which is how this defect lasted from `D-024` until the owner
  asked.

## Outcome

- Changes: `entries.step_id` added by migration; `Entry.stepId` through model, adapter and store;
  `attributeToStep` decides it at write time from the day's marks; `readEffortForStep` sums it;
  the open-window derivation corrected in `FR-20`, `data-model.md` and `brief.md`; the seed's UTC
  date bug fixed.
- Files: `migrations/0004_entry_step.sql`, `core/model/entities.ts`, `core/ports/store.ts`,
  `core/rules/entry.ts`, `adapters/sqlite/store.ts`, `scripts/seed-local.mjs`,
  `docs/project/{requirements.json,data-model.md,brief.md}`, four test files.
- Baseline result: unit 51/51 · isolation · typecheck 0 errors · build · integration 18/18.
- Final result: unit 51/51 · isolation · typecheck 0 errors · build · integration 23/23.
- Decisions recorded: `D-027`, accepted.
- Follow-up: `T-027` draws the history with closed steps, which is why this exists. `FR-20`'s other
  half — the calibration factor itself — is still unbuilt, and now buildable.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `scripts/seed-local.mjs` · The seed marked steps with the UTC date while the product
  reads the local one, so after 19:00 here a fresh seed showed **no steps for today** — the whole
  feature looked broken on a clean database. Mine, from `T-020`, and found only because this task
  needed a marked step to probe. · Fixed; it is the second time a "today" has been computed twice
  in this codebase, and `calendarDateOf` should be what every caller uses, seed included.
- Medium · `docs/project/` · The window rule lived in three documents and `T-017` rewrote that
  section without noticing `D-024` had just invalidated it. All three are corrected now, but the
  lesson is that a derivation stated in prose in three places survives a change to its premise.
- Low · `core/rules/entry.ts` · `attributeToStep` reads every step marked for the owner today and
  filters by project, rather than asking for one project's marks. · One indexed read on a table
  holding a handful of rows a day; a narrower port method would be premature.
- Note · Nothing renders `stepId` yet. Every branch is covered by an integration case instead,
  which is the whole defence until `T-027` lands.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-21

## Trace

Team profile — `docs/traces/<date>_T-026_backend-implementer.md`.
