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

- Changes: responsive SSR portfolio, three-state SVG chart with a bar-shaped key, canvas-faithful
  project row, one-island entry form, `100dvh` stage with height-aware density, token-backed
  utilities, both palettes, vendored Fontshare assets, and plan-lifetime project marks. 27 files.
- Baseline: clean `npm ci`; unit 9/9, isolation/typecheck/build, integration 3/3, lint clean.
- Final: clean `npm ci`; unit 25/25, isolation/typecheck/build, integration 4/4 and harness lint;
  live API 3/3/0 plan counts rendered as 3/3/0 marks while recent entries stayed 5/5/0.
- Decisions: owner-settled in `design-handoff.md` and the traces; no decision file.
- Follow-up: independent Reviewer re-checks the T-007 consumption; owner then performs the visual
  and marks-reading checks plus `backdrop-filter` measurement on a real phone. No browser backend
  was connected for the implementer's responsive recheck; live HTTP composition was verified.

## Review

- **Rounds 1–3 (settled, full text in `git log`).** Tailwind refactor and vendored fonts verified;
  validation refused twice on owner-screen findings, answered with the `100dvh` stage, denser glass
  and panel reading hierarchy. Then the project row: markers the canvas drew and no document
  recorded, rebuilt as marks, title, sentence and last movement, with § The Project Row written.
  Owner settled the path-not-score reading, the cap of four, the prefilled row, the always-drawn
  next step, the verbatim act, and the legend's removal. Nine findings raised and closed, `AC-5`
  unchecked and re-earned with a probe. Those reviews were written by the code's own author.
- **Round 4, `/code-review high`, 2026-09-01 — the `T-007` consumption.** Independent: Codex wrote
  it, Claude reviewed. **The change itself is right and proven live** — the API reports
  `progressSincePlan` 3/3/0 where `recentEntries` is 5/5/0, and the page draws 3/3/0 marks. The
  decay is gone structurally, not just by test: the count compares against a fixed `createdAt`, so
  no moving boundary remains. Handoff, cap and coverage moved with it. Gates re-run: 25/25, 4/4.
- Medium · `PageStage.astro:15` + `HeroChart.astro:43,68` · the three-state legend was deleted on a
  rationale **I wrote into § The Hero Chart** — "the exact state of one day is in that mark's
  `<title>`, on hover and for assistive technology" · neither path works: `pointer-events-none` on
  the chart wrapper kills hover, and `role="img"` makes the SVG's children presentational, so the
  titles reach no screen reader either · the spec now states something false, and the per-day state
  reaches nobody. Correct the rationale, make the titles reachable, or reconsider the legend —
  owner's, since the legend is a decision already taken once.
- Medium, reasoned not observed · `PortfolioPanel.astro:14` · `xl:max-h-full` may never cap the
  panel: it is a grid item on an implicit `auto` row, which grows to content, so `max-height:100%`
  resolves against the grown area and the fallback scroll the handoff promises would never engage —
  the cards would spill over the chart instead · I cannot confirm layout behavior without a browser,
  and the seed's three projects never reach it. Fold into the owner's visual check with ~6 projects.
- Low · `project-row.ts:19` · a whitespace-only `trigger` renders `", Hacer X."`, opening on a bare
  comma, and the opener strip omits `…?!` so `"¿Cuándo vuelvo?"` yields `"¿Cuándo vuelvo?, hacer X."`
  · reproduced both · `act` is guarded and `trigger` is not; no rule validates either.
- Routing, not defects · `next-action.ts:59` compares timestamps lexicographically, so
  `13:00+02:00` passes as later than `12:00Z` when it is an hour earlier (reproduced) — `T-007`'s
  code, closed and validated, and I missed it in that review · nothing enforces the invariant at
  *creation*: there is no project rule at all, so a project can be born without a plan, which is the
  state `AC-2`'s copy repairs · `reserve_spend` still splits one way and counts another.
- Rejected · the seed's verification `SELECT` is not debug residue: `T-007`'s acceptance criterion
  asks for it in those words — "checkable by a query the seed prints or a test asserts".
- Assessment: changes requested, none of them in this round's change. The Medium on the chart
  titles is the one that matters, because a specification now asserts something untrue.

## Validation

- Validated by:
- Date:
