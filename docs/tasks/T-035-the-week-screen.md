---
id: T-035
title: /semana — the close, and the Monday that finally means something
status: ready
profile: team
harness: 0.9.0
role: Frontend Implementer
goal: Build the one screen the week has been missing since the product began — the close, the
  proposal for next week, and the pattern across eight weeks — and make `FR-14`'s Monday
  restriction visible on the screens that enforce it instead of refusing the owner in silence.
decisions: []
implements: [FR-11, FR-12, FR-14, NFR-8]
---

## Sources

- **The design, approved by the owner before any markup is written.** The canvas at
  `https://claude.ai/artifact/DWF9g1gc1EaZuAMBTjs3tJ` holds every approved artboard; `/semana` is
  not drawn there yet. Draw it, get it approved, then build — the last four screens each cost a
  round of rework when that order was reversed.
- `docs/project/design-handoff.md` — tokens, the 390px target, and the rules for state and motion
- `src/pages/archivo.astro` and `src/pages/p/[id].astro` — the two most recent screens, and the
  patterns they settled
- `src/components/molecules/ProjectMenu.astro` — the disclosure pattern, and the fact that native
  `<details>` closes on neither Escape nor an outside pointer
- `T-034`'s contracts and routes

## Scope

- `/semana` — the current week, its commitments, the close with its three fields, the proposal
  for next week as something editable, and the eight-week pattern
- The footer link to `/semana` on every screen, and a check that it resolves. `/archivo` shipped
  with a footer link on every screen that answered 404, and no test asks whether a link resolves.
- Wherever `FR-14`'s restriction now refuses a state change, a line that says what is fixed and
  until when — in `ProjectMenu.astro`'s `readStateError`, which already translates server messages

## Out of Scope

- Any change to how a week is derived or closed. If the screen wants a number T-034 does not
  return, that is a defect in T-034, not a calculation to do in the browser.

## Acceptance Criteria

- [ ] The screen matches the approved artboard at 390px and at desktop width, checked by
      screenshot against the board and not by reading the markup
- [ ] Week attribution appears here and **nowhere else** — never on `/`, never red, never
      accumulated across weeks, never the word "perdido" (`NFR-8`)
- [ ] Closing a week takes the owner two taps from the screen opening, and the close button is
      visible without scrolling at 390px (`NFR-1`)
- [ ] A week closed with only the capacity label looks as finished as one closed with all three
      fields — no empty slot, no prompt to complete it
- [ ] Archiving a project mid-week explains why it is refused, in the owner's language, rather
      than failing silently or showing a server string
- [ ] The eight-week pattern shows no duration and no ranking (`FR-12`, `NFR-7`)

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, all green
- Task-specific: **screenshot the built screen against the approved board**, at 390px and at
  1456px. Layout and reachability defects pass the entire suite; this repository has shipped three
  of them, and each was caught by a person looking at the screen.
- Task-specific: drive the close in a browser end to end — open, fill one field, close, and
  confirm the next week opens with no carried state. Then try to archive a project and read what
  the screen says.

## Assumptions

- The owner is available to approve the artboard before implementation starts. If not, the task
  waits; it does not guess.

## Risks

- This screen turns on a restriction the owner has never experienced. A Monday rule that arrives
  without explanation reads as a bug, and the product's whole posture is that it never punishes.

## Outcome

Filled in as the task progresses; overwritten, not appended.

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- Severity · `file:line` · issue · impact · recommendation

## Validation

`team` only — required before `done`, and linted.

- Validated by:
- Date:
