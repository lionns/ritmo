## Trace

- 2026-09-21 — role: Frontend Implementer
  - read: `T-024` § Scope, the design canvas the owner approved
    (`https://claude.ai/artifact/DWF9g1gc1EaZuAMBTjs3tJ`), `design-handoff.md` § Routes and § The
    Project Row, `NFR-1`, `PageStage.astro:45` (how the stage bounds its panels)
  - did: `readProjectDetail` and a bounded history read; `/api/project/[id]`; `p/[id].astro` and
    `ProjectPanel`; steps, finishing and undo moved off the row; `ProjectCard` lost the disclosure
    and links to `/p/:id`; `StepList` and `FinishedRow` deleted; `/api/archivo` → `/api/archive`;
    the handoff, the manual and two screenshots
  - files: `core/**`, `adapters/sqlite/store.ts`, `contracts/project.ts`, `src/pages/**`,
    `src/components/**` (1 new, 2 changed, 2 deleted), three test files, `design-handoff.md`,
    `README.md`, two screenshots
  - checks: baseline unit 51/51, isolation, typecheck, build, integration 16/16, green before any
    edit; final unit 51/51, isolation, typecheck 0 errors, build, integration 18/18
  - probe: the portfolio serves **no `<details>`, no step form, three `/p/` links**; the project
    screen reads registrar → pasos → historial → terminar; an unknown id is 404. Screenshotted
    against the approved canvas and corrected twice — panels overflowing the stage, then the save
    button below the fold. Neither failed a test: `NFR-1` is about what the eye can reach
  - new: `EntryForm` gained `showContext` and `compact` — the copy asks for one line and this
    column shares its height with a title, so 96px keeps "Guardar entrada" on screen
  - owner, on review: the way back shared a line with the area and read as metadata, breaking the
    pattern every other page keeps. The area moved up beside the marks as a mono eyebrow, which
    buys that line back
  - result: one project, one screen, and a landing that reads again. Open for validation.
