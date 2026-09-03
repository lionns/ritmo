---
id: T-015
title: Errors that point at the field, and a listbox that is ours
status: doing
profile: team
harness: 0.8.1
role: Frontend Implementer
goal: Give every form one error treatment that names the field it belongs to, and replace both
  native `select`s with a listbox the product styles and owns — so a failure stops looking like a
  success, and opening a dropdown stops opening the operating system.
decisions: [D-021]
implements: [NFR-7]
---

## Sources

- `docs/project/design-handoff.md` § Interaction States — **Error** is already specified as "`ink` on
  `glass`, stated as a fact, with the action to fix it. Never red (`NFR-8`)", and the code renders
  `dim`; **Focus** is a 2px accent outline; **Native control chrome is normalised, never inherited**
  is the rule this task extends from the control to its validation
- § Accessibility Notes — "Colour is never the only channel", and targets 56px desktop / 58px mobile
- `docs/tasks/T-014-…md` § Review — the owner's finding and the inventory behind it
- The six status elements: `data-setup-status`, `data-area-status`, `data-cap-status`,
  `data-project-status`, `data-next-action-status`, `data-form-status`, across five forms
- The two selects: `EntryForm.astro` (project) and `ProjectCapture.astro` (area)

## Scope

- **Errors get their own channel.** Today one `<p class="text-dim">` per form carries "Guardando…",
  the success message and the failure, so a failure reads exactly like a success. The status line
  keeps progress and success in `dim`; an error moves out of it, renders in `ink` as § Interaction
  States already requires, and sits under the field it names.
- **Errors name a field.** A message is attached to the input it concerns with `aria-describedby`,
  the input carries `aria-invalid="true"`, and the field is marked by something that is not colour
  (`NFR-8` forbids red, and § Accessibility Notes forbids colour alone). A form-level failure with
  no single field — a network error, a 500 — stays in the status line, which is what it is for.
- **Validation stops being the browser's.** The forms carry `novalidate` and the product validates,
  so the message is in the product's words, position and language rather than the browser's. This is
  § Interaction States' control-chrome rule applied to the validation of the same controls.
- **A listbox of our own**, replacing both `<select>`s: a button showing the selection, a
  `role="listbox"` of `role="option"` rows, full keyboard support — arrows, `Home`/`End`, `Esc`,
  `Enter`/`Space`, type-ahead — `aria-activedescendant`, and focus returning to the button on close.
  Options are 58px targets on mobile, 56px on desktop, and the shared 2px accent focus outline
  applies. It submits the same value the `select` did; no request shape changes.
- `docs/project/design-handoff.md` — extend § Interaction States with the error treatment and add
  the listbox as a written component, because an unwritten control is invented twice (`T-008`,
  `T-010`, `T-012`, `T-014` each rediscovered this).
- Coverage in `test/core/` for whatever is pure, and a browser check for what is not.

## Out of Scope

- **New validation rules.** What counts as invalid does not change; `api/*` keeps its rules and its
  status codes. This task changes how a rejection is shown, not what is rejected.
- **`core/`, `adapters/`, `contracts/`.** `git diff --stat` on those three is empty at the end.
- **The rest of the form UI** — labels, spacing, pairing, the disclosure, the chevron. `T-014`
  settled those and they are not reopened here.
- **A date picker, a combobox with free text, or multi-select.** One listbox, single selection, from a
  known list. Anything else is a later control with its own decision.
- **The `/semana` findings** routed from `T-012` and `T-013`.

## Acceptance Criteria

- [x] WHEN a required field is submitted empty, THE SYSTEM SHALL show the product's own message
      under that field rather than a browser bubble, and `grep -rn "novalidate" src/` SHALL match
      every form that validates.
- [x] The invalid field carries `aria-invalid="true"` and an `aria-describedby` pointing at the
      message's id, and the message is reachable from the field by that association alone.
- [x] No error state uses red, and no field is marked by colour alone (`NFR-8`, § Accessibility
      Notes). Stated as a fact with the action to fix it, never evaluative (`NFR-7`).
- [x] Error text renders in `ink` and the progress/success line stays `dim`, so the three states are
      distinguishable without reading them.
- [x] `grep -rn "<select" src/` returns nothing; both replacements expose `role="listbox"` with
      `role="option"` children and set `aria-activedescendant` while open.
- [ ] The listbox is operable by keyboard alone: open, move with arrows and `Home`/`End`, choose
      with `Enter`, dismiss with `Esc`, and focus returns to the trigger. Verified in a browser.
- [ ] Every option is at least 58px tall on mobile and 56px on desktop, measured in a browser.
- [x] Creating a project and writing an entry both still work end to end, with the same request
      bodies as before.
- [x] All five gates green from a clean `npm ci`, and `node scripts/harness-lint.mjs` clean.

## Verification

- Baseline: the five gates of `quality-gates.md`, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: with a browser at 1440px and at 390px, open each listbox, drive it with the
  keyboard only, and measure an option's height. **This is the first task whose criteria assume a
  browser**; `T-014` needed four rounds because source-grep tests cannot see layout.
- Task-specific: submit each of the five forms empty and with a server-rejected value, and confirm
  the field-level message and the form-level line are different channels.

## Assumptions

- **The listbox is custom on every viewport**, settled with the owner on 2026-09-03. The alternative
  — native `select` on touch, custom on pointer — keeps the OS picker where it is arguably better
  and was rejected for consistency. Labelled because it is a real trade and the risk below is its
  cost.
- **`ink` plus position is enough to separate an error from a success**, per § Interaction States and
  "colour is never the only channel". If it reads as too quiet in use, that is a handoff change.

## Risks

- **A custom listbox on a phone can be worse than the OS picker**, which is scroll-snapped, familiar
  and never clipped by a container. `NFR-1` gives the log form twenty seconds and `EntryForm`'s
  select is on that path. If the custom control costs time there, the honest answer is native on
  touch, not a faster animation.
- **Accessibility is the whole difficulty.** A `select` is accessible for free; a listbox is
  accessible only if the roles, `aria-activedescendant`, focus return and type-ahead are all right.
  Getting it half-right is worse than the native control it replaces.
- **Six status elements across five forms is where an inconsistency hides.** A shared treatment
  applied to five of six leaves the sixth looking like the old product, and it will be the one the
  owner meets first.

## Outcome

- Changes: added one shared field-error treatment to all six validating forms and replaced the area
  and project selects with one ARIA listbox component that preserves their submitted values.
- Files: form components, `FieldError`, `ListboxField`, front-end error/listbox helpers, global
  styles, design handoff, focused unit/layout tests, and task/trace records. Backend scope is untouched.
- Baseline result: clean `npm ci`; unit 41/41, isolation, harness lint, typecheck 0 and Node build
  green. Node 26.8.1 warned against the package pin of 24.20.0.
- Final result: unit 49/49, isolation, typecheck 0, Node build and integration 7/7 green. A built
  server on throwaway SQLite rendered two listboxes and no selects; project and entry POSTs returned
  201 with the existing request keys. The first lint pass named the missing trace; adding it closed it.
- Decisions recorded: none; the implementation follows D-021 and the task's owner-settled handoff.
- Follow-up: **back to the Frontend Implementer, 2026-09-03, after Reviewer round 1.** Two Medium.
  **Open the listbox from the keyboard** — `Enter`, `Space` and `ArrowDown` on the closed trigger
  must open it and put the active option on the selected row; today the keydown is consumed and no
  `click` fires. **Make the paired cells structurally symmetric** so an error grows a row shared by
  both fields instead of sliding the one without a label. Nothing else is reopened: the ARIA, the
  three error channels and the target sizes all measured correct. Then Reviewer round 2.

## Review

- 2026-09-03 · Reviewer, round 1, **measured in a browser** as this task's Verification requires.
  Five gates green: unit 49/49, isolation, typecheck 0, build, integration 7/7, lint. Verified:
  `grep -rn "<select" src/` returns nothing, six forms carry `novalidate`, and the listbox exposes
  `role="listbox"`, `role="option"`, `aria-activedescendant` and `aria-selected`. Options measure
  **56px at desktop and 58px at 390px**, trigger 58px. Errors carry `aria-invalid="true"` and an
  `aria-describedby` pointing at the message id, and use **three channels** — dashed border, `ink`,
  and an `aria-hidden` `↑` — so no field is marked by colour alone and nothing is red (`NFR-8`).
  Empty error slots are `hidden` at zero height; a first read of their `textContent` looked like
  stray arrows and was not.
- **Medium · the listbox cannot be opened from the keyboard**, which fails the criterion in so many
  words · probed rather than assumed, because the alternative explanation was my own tooling: with
  the trigger focused, `Enter` produces `keydown: ["Enter"]` on the button and **`click: 0`**, and
  `aria-expanded` stays `false`. `Space` and `ArrowDown` behave the same. A `<button type="button">`
  fires `click` on `Enter`, so the component's own keydown handler is consuming the key while closed
  instead of opening · this is the risk this task named: half-right is worse than the `<select>` it
  replaced, which opened on all three keys.
- **Medium · `SettingsPanel.astro`, the Áreas row · an error slides the checkbox 29px out of
  alignment**, which the owner found on sight. The row is `display: grid` with
  `align-items: flex-end`, chosen so the boxes line up although “Nombre” carries a label and the
  checkbox does not. When the message appears the name cell grows 56px → **114px** and the checkbox,
  pinned to the row's end, drops. Confirmed by contrast: the project form's pairs move **together**
  (`Nombre`/`Área` hold, `Disparador`/`Acción` both drop 30px) because both its cells have labels ·
  the defect is the row's structural asymmetry, not the error treatment · make the pair share
  label/control/error rows so either error grows a common row and neither control moves.

## Validation

- Validated by:
- Date:
