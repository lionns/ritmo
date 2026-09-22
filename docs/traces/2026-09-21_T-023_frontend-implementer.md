## Trace

- 2026-09-21 — role: Frontend Implementer
  - read: `T-023` § Scope, `design-handoff.md` § Routes, `D-025`, `FR-17`,
    `src/layouts/AppShell.astro:74` — the footer link shipped on every screen
  - did: `core/rules/archive.ts` with `readArchive`; `contracts/archive.ts` and
    `src/pages/api/archivo.ts` as their own read, so `/` never carries a backlog it refuses to
    render; `src/pages/archivo.astro` with two groups and undo on the finished ones; the route
    registered in the test worker; the handoff row and the manual corrected
  - files: `core/rules/archive.ts`, `contracts/archive.ts`, `src/pages/api/archivo.ts`,
    `src/pages/archivo.astro`, `test/integration/{worker,sqlite-store}.test.ts`,
    `docs/project/design-handoff.md`, `README.md`
  - checks: baseline unit 51/51, isolation, typecheck, build, integration 15/15, green before any
    edit; final unit 51/51, isolation, typecheck 0 errors, build, integration 16/16
  - probe: built and served on 4407 against a seeded throwaway. `/archivo` answered **404 before
    this task and 200 after** — the link had been broken in every shipped screen. A project
    finished and then aged past its week is absent from `/` and present in the archive with one
    undo button; using it moved the project to the shelved group and back onto `/`, which is what
    `FR-17` promises. Both headings render, no count beside either
  - scope held: no un-shelving. `changeProjectState` is still called by no screen at all, so
    `FR-14`'s "changeable every Monday" has no interface. Named as follow-up, not quietly added
  - result: finished work has somewhere to be, and the footer stops lying. Open for validation.
