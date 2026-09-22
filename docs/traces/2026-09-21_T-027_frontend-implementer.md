## Trace

- 2026-09-21 — role: Frontend Implementer
  - read: `T-027` § Scope, the artboards the owner approved ("Pasos y cierre", "Cuando no se
    supo"), `D-027`, `core/rules/project-detail.ts`, `ProjectPanel.astro`
  - did: `readDoneSteps` on the port and adapter; `readProjectDetail` returns closed steps with
    the effort attributed to each; `ProjectHistoryItem` as a discriminated list merged in the
    endpoint so the order is decided once; the panel shows an open step's estimate and draws the
    merged history; the manual and the handoff
  - files: `core/{ports/store,rules/project-detail}.ts`, `adapters/sqlite/store.ts`,
    `contracts/project.ts`, `src/pages/api/project/[id].ts`,
    `src/components/organisms/ProjectPanel.astro`, three test fakes,
    `test/integration/sqlite-store.test.ts`, `README.md`, `design-handoff.md`, one screenshot
  - checks: baseline unit 51/51, isolation, typecheck, build, integration 23/23, green before any
    edit; final unit 51/51, isolation, typecheck 0 errors, build, integration 25/25
  - probe: seeded throwaway on 4421. Closed two steps — one with effort attributed, one without —
    and the screen read **"estimaste 25 · registraste 40"** and **"estimaste 60"** alone, with two
    filled circles, an entry with none, and no checkbox anywhere. An open step showed
    "30 min estimados". That pair of lines is the task: the second one is the silence
  - fixed on sight: the date column wrapped "21 sept" onto two lines at a fixed 46px. It is
    `whitespace-nowrap` and intrinsic now
  - result: a step marked done stops disappearing. Open for owner validation; no blocker.
