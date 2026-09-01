---
id: T-006
title: The first loop, front half — the portfolio you open and the entry you write
status: review
profile: team
harness: 0.8.1
role: Frontend Implementer
goal: Build the landing surface and the log form from the approved design, against the endpoints
  T-005 exposes, so opening Ritmo shows what moved and writing an entry takes seconds.
decisions: [D-008, D-009]
implements: [US-3, NFR-1]
---

## Sources

- `docs/project/design-handoff.md` — the whole file. Tokens, the hero chart, motion, navigation,
  accessibility. It is the authority here, not the artboards.
- `https://claude.ai/code/artifact/c21822cb-584e-4600-8f31-0b9afbc8d629` — the approved screens
- `docs/project/architecture.md` § Layout · `docs/tasks/T-005-first-loop-back.md` § Scope

## Scope

- `src/pages/index.astro` — the portfolio. What moved, before what is outstanding.
- `src/pages/registrar.astro` — the log form, one field first.
- `src/components/` — atoms, molecules and organisms per `D-008`, and `src/layouts/` for the shell.
- The hero chart as an inline SVG built from the portfolio response, with its three states and its
  legend naming the unit.
- Tailwind tokens wired from `design-handoff.md`, both palettes, with the theme following the
  viewer's setting.
- An island only where one is earned: the form's submit, so writing does not cost a page load.

## Out of Scope

- **Every other screen.** The weekly close, the dormant project and the project detail are later.
- **Navigation beyond what exists.** The wordmark returns to `/`; the archive and settings links
  from `design-handoff.md` § Navigation Map render but may point nowhere yet.
- **Identity.** No sign-in screen. `T-005` seeds the owner.
- **Reading data directly.** `.astro` files import `contracts/` only and reach data through
  `/api/*` (`D-009`). A template touching an adapter is a failed baseline, not a review note.

## Acceptance Criteria

- [x] WHEN the owner opens `/`, THE SYSTEM SHALL render recent progress above any outstanding work
      (`AC-G1`), with no streak, counter, badge or debt anywhere on the page (`AC-X4`, `NFR-7`).
- [x] WHEN an active project has no open next action, THE SYSTEM SHALL render the project with a
      prompt to write one, in `dim` and without evaluative or debt language (`NFR-7`, `NFR-8`).
- [x] The hero chart renders the three states of `design-handoff.md` — nothing logged, logged
      without minutes, logged with minutes — and carries its legend naming days and unit.
- [x] 28 marks at desktop widths and 14 below 768px.
- [x] WHEN an entry is written from `/registrar`, THE SYSTEM SHALL persist it through `/api/entries`
      and the next render of `/` SHALL show it.
- [x] Every interactive target is at least 56px tall on desktop and 58px on mobile, and no
      decorative element extends past a hit area.
- [x] The entry animation completes within 400ms end to end, and `prefers-reduced-motion` removes it.
- [x] Both palettes render, contrast matches the measured table in `design-handoff.md`, and `faint`
      carries no text — `faint-text` does.
- [x] Accent covers roughly 2% of each screen, and no error state uses red (`NFR-8`).
- [x] `npm run check:core` stays green, proving no `.astro` file reached past `contracts/`.
- [x] All five gates stay green from a clean `npm ci`.

## Verification

- Baseline: the five gates, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset && npm run seed && npm run dev`, then open `/` at 390px and at
  1440px, write an entry, and confirm it appears. This is the first task whose result is looked at.
- Task-specific: reload with `prefers-reduced-motion: reduce` and confirm the bars arrive at their
  final height with no animation.

## Assumptions

- **`T-005` is done and its contract is stable.** This task consumes it and does not change it; a
  needed change is a finding against `T-005`, not a silent edit here.
- **The design handoff outranks the artboards** where they disagree, which they do on one point
  already: the artboards use `faint` for text and the token table forbids it.

## Risks

- `backdrop-filter` is capped at two glass surfaces per screen by `design-handoff.md`. The portfolio
  already wants one; the form wants another. A third needs a measurement, not a judgement call.
- This is the first task with a visual result, so "looks right" will be tempting as a check. Every
  criterion above is either a command or an observation someone else can repeat.

## Outcome

- Changes: responsive SSR portfolio, three-state SVG chart, canvas-faithful project row, one-island
  entry form, shared shell and `100dvh` desktop stage with height-aware density, token-backed
  Tailwind utilities, exact light/dark palettes, vendored Fontshare assets and chart/layout/row coverage.
- Files: 27 frontend, font, build-config, test, design-handoff, generated-status and task-record files.
- Baseline result: clean `npm ci`; unit 9/9, isolation/typecheck/build, integration 3/3, lint clean.
- Final result: unit 22/22, isolation/typecheck/offline build, integration 3/3; live routes,
  vendored Fontshare assets, marker/prefill and POST-then-render probes green.
- Decisions recorded: owner-settled viewport-height behavior in `design-handoff.md` and the
  implementer trace; no decision file.
- Follow-up: owner rechecks the screens, settles the `AC-5` reading below, and measures
  `backdrop-filter` on a real phone; the three remain before `done`.

## Review

- **Rounds 1–2, reviewer (compressed).** Tailwind refactor verified — all ten `@theme` tokens
  consumed, `global.css` down to 90 lines; fonts vendored and the build makes no network call;
  regression checked on a running server: both pages 200, 28/14 chart marks with legends, `AC-G1`
  order intact, motion 388ms, targets 58/56px, no red, both palettes exact, POST-then-render green.
  Only Low left standing: the real-phone `backdrop-filter` measurement, which is the owner's.
- **Round 2 — validation refused, 2026-08-31 (compressed).** Two findings off the owner's screen:
  the columns of `/` shared no vertical anchor, so composition was a function of window height; and
  the responsive table specified width only, with every depth layer bottom-anchored. Both needed
  the owner, not the reviewer. Martian Mono from Google Fonts was withdrawn on check — the handoff
  specifies it. Owner answered with a bounded `100dvh` stage, fluid gaps, chart and cards, panel
  scroll as exception only; then corrected dark glass to `rgba(5,9,10,0.64)`, moved chart opacity
  off the legend, and restored panel reading hierarchy with a non-accent fallback scrollbar.
- **Project row, owner 2026-09-01.** The owner recognised markers drawn in the approved canvas
  (`L-Escritorio`/`L-Movil`) that the screens never had — because `design-handoff.md` had no
  project-row section at all, so no build from it could have produced them, and the row had shipped
  as six blocks under four mono field labels. The handoff now carries § The Project Row; the row is
  marks, title and one sentence. Owner settled the markers as a path rather than a score, the cap of
  four filled marks, and the whole row as the prefilled link.
- **Hierarchy fix, same day.** Owner approved the design except this row, on air. Cause was this
  round's own regression: the rewrite cut the row's semantic gaps to 6px, which § Responsive
  Behavior forbids, and it applied on every laptop since the compact query is
  `(min-width:1200px) and (max-height:1200px)` and 1440×900 satisfies both. The three 8px gaps are
  now untouchable, density comes out of outer padding, row padding matches the artboard, and the
  invented accent hover is gone. The handoff's stale "12px between semantic groups" is corrected.
- **The next step is always drawn, owner 2026-09-01.** Owner settled the contradiction between
  `data-model.md:233` and this task's `AC-2`: the invariant holds — an active project must carry an
  open next action, because without a task list it is the only thing saying what to do. So the
  outline circle is not conditional, which is also how all three rows of the canvas draw it; the
  inference that it tracked `nextAction !== null` was the implementer's, not the design's. Row now
  renders it unconditionally, and `AC-2` stops describing a normal state: it is the repair copy for
  data that violates the invariant. Behavior kept, criterion left checked under that reading.
- Two consequences outside this task's scope, for the next-action task to carry: `closeNextAction`
  (`core/rules/next-action.ts`) closes without requiring a replacement, so the core can still produce
  the forbidden state; and `scripts/seed-local.mjs` seeds four projects with two next actions, which
  the invariant forbids. Neither is a silent edit here — `Assumptions` says a needed change to
  `T-005` is a finding against it.

## Validation

- Validated by:
- Date:
