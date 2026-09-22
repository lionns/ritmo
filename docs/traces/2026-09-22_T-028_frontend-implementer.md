## Trace

- 2026-09-22 — role: Frontend Implementer
  - read: `T-028` § Scope, `FR-14`, `FR-17`, `core/rules/project.ts:173` and its `hasClosedWeek`
    check, `ProjectPanel.astro`, `src/pages/api/projects.ts`
  - did: "Archivar" / "Activar" beside finishing on `/p/:id`; a shelved project's screen no longer
    offers the step form or a mark for today, and says why in one line; the cap refusal and the
    week-boundary refusal translated into the product's register, never in red; the manual and the
    handoff, including the note that the Monday restriction is dormant
  - files: `src/components/organisms/ProjectPanel.astro`,
    `test/{core/page-layout,integration/sqlite-store}.test.ts`, `README.md`,
    `docs/project/design-handoff.md`
  - checks: baseline unit 51/51, isolation, typecheck, build, integration 25/25, green before any
    edit; final unit 51/51, isolation, typecheck 0 errors, build, integration 26/26
  - probe: seeded throwaway on 4431. Archived a capped project — it left the live groups, dropped
    `activeCount` to 1, appeared in `/archivo`, kept its screen. Lowered the cap to 1 and asked to
    activate it: refused with "1 of 1 capped projects are active" and nothing changed
  - note: no rule was written. `changeProjectState` has existed since `T-012` with its cap check
    and its week check, covered by unit tests and reached by no screen; this task is the caller.
    `hasClosedWeek` is false until `/semana` exists, so the Monday half of `FR-14` is dormant and
    the manual says so rather than letting the interface imply otherwise
  - result: a project can be archived and brought back. Open for owner validation; no blocker.
