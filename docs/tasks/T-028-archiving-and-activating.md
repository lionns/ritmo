---
id: T-028
title: Archiving and activating, the control FR-14 never had
status: done
profile: team
harness: 0.9.0
role: Frontend Implementer
goal: Put the archive/activate control on the project screen, so "what is active is changeable"
  stops being a rule with no way to reach it — a project has been able to leave `active` only by
  being created while the cap was full.
decisions: []
implements: [FR-14, FR-17]
---

## Sources

- `FR-14` — what is active is changeable every Monday, at no cost, and fixed within the week
- `FR-17` — shelving is reversible, carries no penalty language, and shelved items stay visible
- `core/rules/project.ts:173` — `changeProjectState`, written, tested, and called by no screen
- `core/rules/project.ts:175` — the boundary is `hasClosedWeek`, which is false until `/semana`
  exists, so the rule permits changes on any day today
- `src/components/organisms/ProjectPanel.astro` — where finishing already lives
- `src/pages/api/projects.ts` — `PATCH` already accepts `state`

## Scope

- **The control, on `/p/:id`**, beside finishing: "Archivar" on an active project, "Activar" on a
  shelved one. Both rare, both project-level, both belong where everything else about a project is.
- **The cap refusal shown plainly.** Activating past the cap already throws with the count; the
  screen says it in the product's register and never in red (`FR-17`, `NFR-7`).
- **The shelved project's screen.** It renders today with a step list it cannot write to — steps
  require an active project — so it shows what it has and offers "Activar", nothing else.
- **`README.md`** — a section for it, and the note that the Monday restriction is not enforced yet
  because weeks are unbuilt. The manual has said "no se puede desde ninguna pantalla" since
  `T-023`; that line goes.
- **`design-handoff.md`** § The Project Row.

## Out of Scope

- **`/semana` and the week boundary.** This task adds no week and enforces no Monday; when
  `/semana` lands, `hasClosedWeek` starts refusing and this control starts failing on Tuesdays,
  which is `FR-14` working rather than a regression.
- Archiving or activating from `/archivo` or the portfolio row. One place first.
- Objectives, which `FR-17` also covers and which are unbuilt.

## Acceptance Criteria

- [x] WHEN an active project's screen renders THE SYSTEM SHALL offer "Archivar", and WHEN a
      shelved one's renders THE SYSTEM SHALL offer "Activar".
- [x] WHEN a project is archived THE SYSTEM SHALL move it out of the portfolio's live groups and
      into `shelved`, and it SHALL still appear in `/archivo` and on its own screen.
- [x] WHEN a shelved project is activated while the capped count is already at `Owner.activeCap`
      THE SYSTEM SHALL refuse, name the count, leave the project shelved, and say so without red
      or penalty language.
- [x] WHEN a shelved project's screen renders THE SYSTEM SHALL NOT offer to write a step or mark
      one for today — the rules refuse both, and offering them would be a lie.
- [x] WHEN a finished project's screen renders THE SYSTEM SHALL offer neither: its state is not
      the question until it is reopened (`D-025`).
- [x] WHEN a project is archived and then activated THE SYSTEM SHALL return it to the portfolio
      with its steps and history intact — the check that exercises this against `T-027`.
- [x] The five gates are green and `node scripts/harness-lint.mjs` exits zero.

## Verification

- Baseline: `npm test` · `npm run check:core` · `npm run typecheck` · `npm run build` ·
  `npm run test:integration`, green before starting.
- Final: the same five, plus `node scripts/harness-lint.mjs`.
- Task-specific: seed a throwaway `RITMO_DB_PATH`, archive a project, activate it again, and fill
  the cap to see the refusal. Never against `data/ritmo.sqlite`.

## Assumptions

- Assumption: the control sits beside finishing rather than in `/ajustes`. Archiving is a decision
  about one project, and `T-024` settled that those live on the project's screen.
- Assumption: the refusal is shown where the button is, in the shape `form-errors.ts` already uses
  for a server rejection, rather than as a toast — the product has none.

## Risks

- **The rule has never run in the product.** It is covered by unit tests and has had no user, so
  this is the first time its cap check and its week check are reached from a screen.
- The Monday restriction is dormant. Building the control now means `FR-14` reads as satisfied
  while half of it — "every Monday, and fixed within the week" — is still waiting on `/semana`.
  The manual says so rather than letting the interface imply otherwise.

## Outcome

- Changes: "Archivar" / "Activar" beside finishing on the project screen; a shelved project stops
  being offered step writing and today's marks; both refusals said in the product's voice; the
  manual gains a section and loses the line saying this was impossible; the handoff records it.
- Files: `src/components/organisms/ProjectPanel.astro`, `test/core/page-layout.test.ts`,
  `test/integration/sqlite-store.test.ts`, `README.md`, `docs/project/design-handoff.md`.
- Baseline result: unit 51/51 · isolation · typecheck 0 errors · build · integration 25/25.
- Final result: unit 51/51 · isolation · typecheck 0 errors · build · integration 26/26.
- Decisions recorded: none. No rule was written; this task is the caller a rule already had.
- Follow-up: `FR-20`'s calibration factor, which is the other half of what the owner asked for.

## Review

Self-review as Reviewer; not validation under `team` (`PROTOCOLS.md`).

- Medium · `src/components/organisms/ProjectPanel.astro` · Server error strings are matched by
  regex in the browser to say them in Spanish. If a rule's message is ever reworded, the screen
  quietly falls back to "No se pudo cambiar" and the owner loses the count. · The alternative is a
  typed error code in the contract; that is the right fix and it is bigger than this task, which
  is why the fallback is a sentence that is still true rather than a blank.
- Low · `FR-14` now reads as satisfied while half of it is not. "Every Monday, and fixed within the
  week" waits on `/semana`; `hasClosedWeek` is false, so changes are allowed any day. · The manual
  says so in a blockquote rather than letting the interface imply the rule is enforced.
- Low · `test/core/page-layout.test.ts` · The shared-chrome test counted `data-form-status` at six
  and now expects seven, across the same six forms. · A status region that is not a form is new
  here; the assertion says why in a comment rather than just moving a number.
- Note · The shelved screen hides the step form and the "Hoy" button because the rules reject both.
  That is three places now agreeing — rule, endpoint, screen — and only the rule is tested for it.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-22

## Trace

Team profile — `docs/traces/<date>_T-028_frontend-implementer.md`.
