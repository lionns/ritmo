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
  utilities, both palettes, vendored Fontshare assets, chart/layout/row coverage. 27 files.
- Baseline: clean `npm ci`; unit 9/9, isolation/typecheck/build, integration 3/3, lint clean.
- Final: unit 23/23, isolation/typecheck/offline build, integration 3/3; live route probes green.
- Decisions: owner-settled in `design-handoff.md` and the traces; no decision file.
- Follow-up before `done`: owner rechecks the screens, settles `AC-5` and findings 2–3, and measures
  `backdrop-filter` on a real phone.

## Review

- **2026-08-31 (settled).** Tailwind refactor and vendored fonts verified; regression checked on a
  running server. Round 2 refused validation — the columns of `/` shared no vertical anchor and the
  responsive table specified width only. Owner answered with the `100dvh` stage, denser dark glass,
  chart opacity off the legend, and panel reading hierarchy.
- **2026-09-01, owner rounds.** The owner recognised markers drawn in the approved canvas that the
  screens never had — `design-handoff.md` had no project-row section, so no build from it could
  have produced them, and the row had shipped as six blocks under four mono labels. It is now
  marks, title, one sentence and the last movement, written into § The Project Row. Owner settled:
  the marks are a path not a score, four is the cap, the row is the prefilled link, and the outline
  is the next step drawn always — `data-model.md:233` holds, since without a task list the next
  action is the only thing that says what to do, so `AC-2` is repair copy for invalid data. A
  hierarchy regression was fixed the same day: the rewrite had cut the row's semantic gaps to 6px.
- For the next-action task: `closeNextAction` closes without requiring a replacement, and `seed-local.mjs` seeds four projects with two next actions — both produce the state the invariant forbids.
- **Reviewer, `/code-review high` on `351319f`, 2026-09-01.** All gates green, so every finding is
  behavioral. **Independence: none** — `agent-config.md` puts Frontend Implementer on Codex and
  Reviewer on Claude for work it did not write; Claude did both here, owner-accepted. Weigh it so.
- Medium/High · `AC-5` · a written entry could leave `/` wholly unchanged — already first, already
  at the mark cap, untimed, same day: no mark, no order, no bar (`UNTIMED_HEIGHT` is fixed) ·
  **closed**: owner restored the last movement as a `dim` line, and the probe that failed now passes
  (201, then the line changed). `AC-5` re-checked on that evidence.
- Medium · `project-row.ts:6` · marks read the rolling 28-day window, so a path decays with time
  alone — the score `NFR-7` forbids · owner settled the fix: count entries since the open next action
  opened. **Blocked here**: needs `NextAction.createdAt` in the contract (it exists in
  `data-model.md:153`, not in `PortfolioNextAction`) and a window wider than 28 days, so it is a
  finding against `T-005`, not an edit here. `reserve_spend` counting as progress rides along.
- Medium · proper nouns lowercased (`"Notion"` → `"notion"`) · **closed**: owner chose to join the
  act verbatim, so it fails benignly (a capital after a comma) instead of corrupting a name.
- Self-inflicted, caught after landing in `aa17a7e`: rewriting § The Hero Chart deleted § The Project Row wholesale, and no gate covers prose. Restored from `HEAD~1` with this round's rules applied.
- Fixed · doubled terminal punctuation, a leading `¿` defeating the lowercasing, a blank act rendering `"Cuando X, ."`, the weak unconditional-mark guard (now shape-based, mutation-tested).
- The three Low, closed 2026-09-01: dead `::-webkit-scrollbar` block gone (the standard properties
  already carry the handoff's thumb/track contract), `scrollbar-gutter` no longer offsets a panel
  that does not scroll, and the chart legend is out of the figure entirely. A key of three bars was
  built first and **rejected on sight by the owner** — right, and recommending it was the
  implementer's error: a key sized for a `9px` line cannot teach the `9:12` difference honestly, and
  a chart drawn at `0.30` as ground carries neither caption nor taxonomy. The four artboards settled
  it: the header's right slot is a per-screen context label (`REGISTRO`, `DOMINGO · S34`, …) that
  both pages were duplicating as a body eyebrow. `AppShell` owns the slot; key, figcaption and
  eyebrows are gone. `AC-3`'s legend now sits in the header, still naming days and unit, each mark
  keeping its `<title>`. Written into § The Hero Chart and § Navigation Map.
- Assessment: validation not granted. `AC-5` unchecked, findings 1–3 are the owner's, and this review was written by the code's own author.

## Validation

- Validated by:
- Date:
