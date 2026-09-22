---
id: T-022
title: Finishing a project
status: done
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Give a project a `finishedAt` timestamp it can be set to and taken back from, free its cap
  slot the moment it is set, and show it in `EN MOVIMIENTO` for the week it was finished — so the
  owner can record that something ended instead of pretending they paused it.
decisions: [D-025]
implements: [FR-14, FR-17, FR-23]
---

## Sources

- `docs/decisions/D-025-finishing-a-project.md` — the whole shape of this task
- `docs/project/data-model.md` § Project and § Validation rules
- `migrations/0001_initial_schema.sql:53` — `state TEXT NOT NULL CHECK (state IN (…))`, the CHECK
  that `D-025` routes around by adding a column rather than a third state
- `core/rules/project.ts:47` and `:99` — `countCappedActiveProjects`, which decides the cap
- `docs/project/design-handoff.md` § The Project Row — where the finished row is drawn
- `docs/project/brief.md` § Success Measures — the measure this makes answerable
- `research.md` §4 (small visible progress), §11 §12 (the cap), §14 (no reward layer)

## Scope

- **`FR-23`, new**, in `requirements.json`: a project may be finished on any day; finishing frees
  its slot at once; un-finishing returns it to `shelved`; finishing renders without celebration.
- **`migrations/0003_project_finished_at.sql`** — `ALTER TABLE projects ADD COLUMN finished_at
  TEXT`. One column, no rebuild, nothing copied.
- **`Project.finishedAt`** in the model, the SQLite row type and its mapper.
- **`core/rules/project.ts`** — `finishProject` and `unfinishProject`; `countCappedActiveProjects`
  counts only projects with `finishedAt` null; `changeProjectState` refuses to act on a finished
  project, because its state is not the question any more.
- **`contracts/capture.ts` and `src/pages/api/projects.ts`** — `PATCH` accepts `finished: boolean`
  beside the existing `state`, exactly one of the two per request.
- **`contracts/portfolio.ts` and `core/rules/portfolio.ts`** — `finishedAt` on the project, and a
  finished project sorted into `progress` for the week it was finished, out of everything after.
- **The row.** A finished project shows **"Terminado"** where its steps would be, keeps its last
  entry, draws no next-step mark, and offers "Deshacer" in place of the day-list disclosure. Its
  `design-handoff.md` § The Project Row paragraph says so.
- **`README.md`** — the "Todavía no existe" row for finishing a project becomes a manual section.

## Out of Scope

- **`/archivo`.** A finished project drops out of `/` after its week and has nowhere to go until
  that route exists. Named in the manual as a known gap, not papered over.
- Finishing an **objective** — `FR-3` derives objective state, and `D-025` says nothing about it.
- Any change to shelving, to the Monday rule for `active`/`shelved`, or to the cap number.
- Steps. A finished project keeps its open steps exactly as they are; nothing is auto-completed.

## Acceptance Criteria

- [x] WHEN a project is finished on a Wednesday THE SYSTEM SHALL set `finishedAt` and SHALL NOT
      require a week boundary — `FR-14` binds `state`, not this.
- [x] WHEN a project in a capped area is finished THE SYSTEM SHALL let a new project be created
      active in that area the same day, the freed slot being the point.
- [x] WHEN a finished project is un-finished THE SYSTEM SHALL clear `finishedAt` and leave it
      `shelved`, never `active`, whatever it was before.
- [x] WHEN `PATCH /api/projects` sends both `state` and `finished` THE SYSTEM SHALL answer 400 and
      change nothing.
- [x] WHEN a project was finished during the current week THE SYSTEM SHALL return it in `progress`;
      WHEN it was finished in an earlier week THE SYSTEM SHALL return it in neither `progress` nor
      `outstanding` nor `shelved`.
- [x] WHEN a finished project's row renders THE SYSTEM SHALL show "Terminado", no next-step mark,
      no day-list disclosure, and no word of congratulation anywhere in the served HTML.
- [x] WHEN the portfolio is read after a project is finished THE SYSTEM SHALL report an
      `activeCount` one lower than before — the check that exercises this against the existing cap.
- [x] `data-model.md` § Project carries `finishedAt`, and its validation rules say a finished
      project is not counted against the cap.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: seed a throwaway `RITMO_DB_PATH`, finish a project through the interface, and read
  the row and the cap count. Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption: "the week it was finished" is the Monday-based week of `finishedAt`, compared against
  the same week of today. `data-model.md` § The weekly cycle already fixes Monday as the boundary,
  so no second definition is introduced.
- Assumption: a finished project keeps `state` as it was. `state` records the commitment, and
  overwriting it would destroy whether the project was active when it ended.
- Assumption: finishing is reachable from the project row on `/`. There is no `/p/:id` to put it
  on, and the weekly close that might own it is unbuilt.

## Risks

- **The cap is where a mistake hides.** Every count of active projects must exclude finished ones,
  and a miss reads as a cap that quietly grew. Two acceptance criteria aim at exactly this.
- A finished project vanishing after its week, with `/archivo` unbuilt, will look like data loss to
  anyone who does not read the manual. The row is still in the database and the manual says so.
- "Terminado" sits one word away from the reward layer `NFR-7` forbids. The criterion that no
  congratulation appears in the HTML is the guard, and it is worth keeping strict.

## Outcome

- Changes: `finished_at` added by `ALTER TABLE`; `Project.finishedAt` through the model, port,
  adapter and contracts; `finishProject` and `unfinishProject`; the cap excludes finished projects
  in both the rule and the endpoint; `PATCH /api/projects` takes exactly one of `state` and
  `finished`; a project finished this week sits in `progress` and leaves after; the row shows
  "Terminado" and "Deshacer"; "Terminar proyecto" lives in the step disclosure; `FR-23` written.
- Files: `migrations/0003_project_finished_at.sql`, `core/{model,ports,rules}/**`,
  `adapters/sqlite/store.ts`, `contracts/{capture,portfolio}.ts`,
  `src/pages/api/{projects,portfolio}.ts`, `src/components/**`, `docs/project/data-model.md`,
  `docs/project/requirements.json`, `README.md`, four test files.
- Baseline result: unit 48/48 · isolation · typecheck 0 errors · build · integration 12/12.
- Final result: unit 51/51 · isolation · typecheck 0 errors · build · integration 15/15.
- Decisions recorded: `D-025`, accepted 2026-09-21 and rewritten before acceptance — it proposed a
  third `state`, and a timestamp is both truer to this model and the only shape SQLite allows here
  without rebuilding `projects` against four foreign keys.
- Follow-up: `/archivo`. A finished project leaves `/` after its week and has nowhere to go; the
  manual says so rather than hiding it.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `src/pages/api/portfolio.ts` · The cap failure this task named in § Risks actually
  happened: `activeCount` summed `progress`, which now carries this week's finished project, so
  the cap widened by one and nothing broke. The integration case caught it on first run. · It is
  the strongest argument for the two criteria aimed at the count; a validator should re-read them
  rather than take the green as proof.
- Low · `core/rules/portfolio.ts` · `weekStartOf` reads the server's local calendar, like
  `calendarDateOf`. Same reasoning, same dependence on `D-020`. · Two functions now encode "when",
  and if a third appears they should become one module.
- Low · `core/rules/project.ts` · `finishProject` re-reads owner, area and every project to
  recount. · Correct over clever; the alternative is arithmetic on a count that the cap rule
  already owns, which is how the endpoint bug happened in the first place.
- Note · Finishing is reachable only from the step disclosure. It is the rarest thing done to a
  project and deliberately not a neighbour of the daily gesture, but if `/p/:id` is ever built it
  belongs there too.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-21

## Trace

Team profile — `docs/traces/<date>_T-022_backend-implementer.md`.
