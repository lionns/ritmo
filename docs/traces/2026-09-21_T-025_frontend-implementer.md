## Trace

- 2026-09-21 — role: Frontend Implementer
  - read: `D-026` and the consequence of `D-025` it supersedes, `core/rules/portfolio.ts`,
    `src/pages/api/portfolio.ts`, `ProjectCard.astro`
  - did: a finished project enters no group; `weekStartOf`, `finishedThisWeek` and `sortKey`
    removed with the week-long stay they served; the endpoint's `activeCount` filter removed, the
    cap now decided only in `core/rules/project.ts`; the card's `finished` branch removed; the
    manual and the handoff corrected
  - files: `core/rules/portfolio.ts`, `src/pages/api/portfolio.ts`,
    `src/components/molecules/ProjectCard.astro`, `test/integration/sqlite-store.test.ts`,
    `README.md`, `docs/project/design-handoff.md`
  - checks: baseline unit 51/51, isolation, typecheck, build, integration 18/18, green before any
    edit; final identical
  - probe: seeded throwaway on 4414. Finished a capped project and read all three screens: **gone
    from `/`, the word "Terminado" nowhere on it, present in `/archivo` and on `/p/:id`**. That
    triple is the whole task — a deletion is only honest if what it removes is still reachable
  - note: `D-025` stays accepted with one consequence no longer true. `D-026`'s `Supersedes` line
    names which; a reader of `D-025` alone would be misled, and nothing else in it moved
  - result: the landing shows what is live. Open for owner validation; no blocker.
