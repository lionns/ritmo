## Trace

- 2026-09-22 — role: Frontend Implementer
  - read: `T-030` § Scope, the artboard "Más acciones · abierto", `SettingsPanel.astro` (the only
    `<details>` the product has), `ListboxField.astro:191` and `:207` for Escape and outside
    pointer, `EntryForm.astro:204` for what a save does today
  - did: the two standing buttons replaced by a `···` disclosure carrying an accessible name, its
    items worded for the project's state; Escape and outside-pointer closing; the panel flips
    upward when it will not fit below; the history list is now always rendered, even empty, so a
    saved entry has somewhere to land; `EntryForm` emits `ritmo:entry-saved` and the panel
    prepends the row without reloading
  - corrected: built inside the right-hand panel first; the approved board draws it beside the
    project's name. Extracted to `ProjectMenu.astro` and mounted on the eyebrow row, then shrunk
    to 36px drawn / 44px to the finger and pushed to the column's right edge, as the owner asked
  - files: `src/components/molecules/ProjectMenu.astro`,
    `src/components/organisms/{ProjectPanel,EntryForm}.astro`, `src/pages/p/[id].astro`
  - checks: baseline unit 55/55, isolation, typecheck, build, integration 26/26, green before any
    edit; after: identical, and harness-lint clean
  - probe: the served page carries the `···` trigger with its label, both items, no standing
    button, and the always-present history list; screenshot confirms the trigger at the column's
    right edge and "Guardar entrada" above the fold
  - verified by the owner, not by me: the menu opening and closing, archiving from it, and an
    entry appearing in the history without a reload. None of that is reachable from here — a menu
    that will not close would pass every check above. Third time in two days.
  - result: closable.
