## Trace

- 2026-09-22 — role: Backend Implementer
  - read: `T-029` § Scope, the artboard "Calibración · con la muestra", `FR-20`,
    `data-model.md` § Derived values, `D-027`, `SettingsPanel.astro:23` for the subgrid pattern
  - did: `core/rules/calibration.ts` — the ratio of summed actual to summed estimate across the
    last twenty done steps that carry both halves, null below five; `readCalibrationSamples` on
    the port and adapter; the ratio on the project response; the line under the estimate field;
    `StepFields` put on one shared grid; four unit cases and the manual and handoff
  - files: `core/rules/calibration.ts`, `core/ports/store.ts`, `adapters/sqlite/store.ts`,
    `contracts/project.ts`, `src/pages/api/project/[id].ts`,
    `src/components/{molecules/StepFields,organisms/ProjectPanel}.astro`, four test files,
    `README.md`, `design-handoff.md`, one screenshot
  - checks: baseline unit 51/51, isolation, typecheck, build, integration 26/26, green before any
    edit; final unit 55/55, isolation, typecheck 0 errors, build, integration 26/26
  - probe: seeded throwaway on 4440. Silent at four samples, and at five it read **"Tus últimos 5
    pasos tardaron 1,5× lo estimado"** — twenty estimated against thirty recorded, five times —
    with no congratulation in the served HTML
  - probe error worth keeping: the first run showed silence at five, because the seeded project
    already had a step marked for today, so every entry had two marked steps and attributed to
    neither. `D-027` working exactly as decided, and my setup wrong
  - owner, on the canvas: the two fields were not aligned. The same defect was in the product —
    each column its own box, so a wrapping label drops its input — hidden because the labels
    happened to fit. Both columns now share the grid `SettingsPanel` already uses
  - result: `FR-20` is complete. Open for owner validation; no blocker.
