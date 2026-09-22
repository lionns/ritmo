---
id: T-030
title: The project screen after use — a menu, and a history that keeps up
status: done
profile: team
harness: 0.9.0
role: Frontend Implementer
goal: Put archiving and finishing behind one "más acciones" disclosure instead of two buttons that
  are always present, and make an entry appear in the history as it is saved rather than on the
  next reload — both from the owner using the screen.
decisions: []
implements: [FR-14, FR-23, NFR-1]
---

## Sources

- The design approved by the owner on 2026-09-22, artboard "Más acciones · abierto" at
  `https://claude.ai/artifact/DWF9g1gc1EaZuAMBTjs3tJ` — the owner's own idea, drawn with "···"
  rather than a gear because the product has no icons and a gear would say "configuration"
- `src/components/organisms/SettingsPanel.astro` — the only `<details>` in the product, and the
  `+` marker `global.css:99` rotates; this disclosure joins that family
- `src/components/molecules/ListboxField.astro:191` and `:207` — Escape and outside-pointer
  closing, already written for the custom listbox
- `src/components/organisms/EntryForm.astro:204` — what a save does today: a status line and the
  chart mark grows. It deliberately does not reload, which is right on `/registrar` and wrong
  beside a history
- `docs/project/design-handoff.md` § Interaction States — the chart is the confirmation

## Scope

- **The actions disclosure** on `/p/:id`: a `···` trigger with an `aria-label`, opening to
  "Archivar" / "Activar" and "Terminar proyecto" / "Deshacer" as the project's state asks. The two
  standing buttons and their block go.
- **Closing it**: Escape, and a pointer outside it, reusing the listbox's approach rather than
  inventing a second one.
- **Opening upward when it will not fit below**, so it is reachable near the bottom of a phone.
- **The history keeps up**: a saved entry is prepended to the list in place — no reload, so the
  chart still grows, the textarea keeps focus, and `NFR-1` keeps its two taps.
- **`design-handoff.md`** § The Project Row and § Interaction States, and **`README.md`**.

## Out of Scope

- A menu anywhere else — the portfolio row, `/archivo`, `/ajustes`. One screen has it.
- Changing what archiving or finishing do. Only where they are reached from.
- Making the history live for anything but the entry the owner just wrote: a step closed elsewhere
  still needs a reload, and pretending otherwise would need polling the product does not have.

## Acceptance Criteria

- [x] WHEN the project screen renders THE SYSTEM SHALL show no standing "Archivar" or "Terminar"
      button, and SHALL show one trigger carrying an accessible name.
- [x] WHEN the disclosure is opened THE SYSTEM SHALL offer archiving and finishing, worded for the
      project's current state.
- [x] WHEN Escape is pressed or a pointer goes down outside it THE SYSTEM SHALL close it.
- [x] WHEN an entry is saved from `/p/:id` THE SYSTEM SHALL show it at the top of the history
      without reloading, and the chart mark SHALL still grow — the check that exercises this
      against `NFR-1` and § Interaction States together.
- [x] WHEN an entry is saved with no minutes THE SYSTEM SHALL render its row without a minutes
      column, as a reloaded page does.
- [x] WHEN the history was empty THE SYSTEM SHALL replace "Nada registrado todavía." with the row
      rather than leaving both.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: seed a throwaway `RITMO_DB_PATH`, save an entry and watch the history, then open
  the menu and archive from it. Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption: `<details>` rather than a `role="menu"` widget. The product already has one and its
  keyboard behaviour is native; a menu role brings arrow-key semantics nothing else here uses.
- Assumption: the row inserted client-side is built from what the form already knows plus the id
  the response returns, rather than re-fetching the screen. Re-fetching would cost the focus this
  is protecting.

## Risks

- **The inserted row and the rendered row can drift.** They are written in two places — Astro and
  the browser — and a change to one will not fail a test about the other. The date format and the
  minutes column are the likely places.
- A disclosure holding the only way to archive means a bug that keeps it shut removes the feature
  rather than degrading it. Native `<details>` works without JavaScript, which is the reason to
  use it here.

## Outcome

- Changes: archiving and finishing moved into a `···` disclosure beside the project's name, in its
  own `ProjectMenu` component — 36px drawn, 44px to the finger — with Escape, outside-pointer and
  upward-flip behaviour; the standing buttons removed from the panel; the history list always
  rendered so a saved entry can be prepended without a reload; `EntryForm` emits `ritmo:entry-saved`.
- Files: `src/components/molecules/ProjectMenu.astro` (new),
  `src/components/organisms/{ProjectPanel,EntryForm}.astro`, `src/pages/p/[id].astro`,
  `test/core/page-layout.test.ts`, `README.md`, `docs/project/design-handoff.md`,
  `docs/images/05-proyecto.jpg`.
- Baseline result: unit 55/55 · isolation · typecheck 0 errors · build · integration 26/26.
- Final result: identical.
- Decisions recorded: none.
- Follow-up: `/semana`, objectives, and the dormant state `/p/:id`'s route row still promises.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `src/components/organisms/ProjectPanel.astro` and the browser · The history row is
  written twice — once in Astro, once in the browser handler — and nothing fails if they drift.
  The date format and the minutes column are where it will show. · A shared renderer would need
  the row as a string on both sides; it was not worth it for one row type, and this note is the
  only thing standing between that judgement and a silent divergence.
- Medium · The interactive behaviour was verified **by the owner, not by me**. A menu that will not
  close and a row that never inserts pass every check this repository has. · The third time in two
  days that only a person looking at the screen could confirm the work.
- Low · `src/pages/p/[id].astro` · The trigger is 36px with a 44px hit area through a pseudo
  element. · Deliberate, so the circle stays out of the title's way without failing the touch
  target the handoff asks for.
- Note · I built the menu inside the right-hand panel when the approved canvas drew it beside the
  project's name. The owner caught it. The drawing was right there and I did not check my work
  against it.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-22

## Trace

Team profile — `docs/traces/<date>_T-030_frontend-implementer.md`.
