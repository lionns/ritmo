## Trace

- 2026-09-21 — role: Backend Implementer
  - read: `D-025`, `T-022` § Scope, `data-model.md` § Project and § The weekly cycle,
    `migrations/0001_initial_schema.sql:53`, `core/rules/project.ts:47` and `:99`
  - did: `0003_project_finished_at.sql` — one `ADD COLUMN` and a partial index, no rebuild;
    `Project.finishedAt` through model, port, adapter and both contracts; `finishProject` and
    `unfinishProject`; `countCappedActiveProjects` excludes finished; `changeProjectState` refuses
    a finished project; `PATCH /api/projects` takes exactly one of `state` and `finished`;
    `weekStartOf` puts a project finished this week into `progress` and drops it after; the
    finished row with "Terminado" and "Deshacer"; "Terminar proyecto" in the step disclosure
  - files: `migrations/0003_*.sql`, `core/{model,ports,rules}/**`, `adapters/sqlite/store.ts`,
    `contracts/{capture,portfolio}.ts`, `src/pages/api/{projects,portfolio}.ts`,
    `src/components/**` (1 new, 2 changed), `data-model.md`, `README.md`, four test files
  - checks: baseline unit 48/48, isolation, typecheck, build, integration 12/12, green before any
    edit; final unit 51/51, isolation, typecheck 0 errors, build, integration 15/15
  - caught: the new integration case failed first time — the portfolio endpoint summed `progress`
    for `activeCount`, and `progress` now carries this week's finished project, so the cap silently
    widened. Exactly the failure § Risks named. Fixed in `src/pages/api/portfolio.ts`
  - probe: built and served on 4405 against a seeded throwaway. Finishing an uncapped-area project
    left `activeCount` alone — correct, it never held a slot — and finishing a capped one took it
    from 2 to 1, after which a new project was created `active` the same day. Undo returned it to
    `shelved` with `finishedAt` null. The row shows "Terminado" and "Deshacer", draws no step mark,
    and the served HTML carries no congratulation. Both fields in one request is 400
  - result: a project can end without pretending it was paused. Open for owner validation.
