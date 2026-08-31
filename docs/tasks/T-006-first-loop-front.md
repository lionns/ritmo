---
id: T-006
title: The first loop, front half — the portfolio you open and the entry you write
status: doing
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
- [ ] 28 marks at desktop widths and 14 below 768px.
- [x] WHEN an entry is written from `/registrar`, THE SYSTEM SHALL persist it through `/api/entries`
      and the next render of `/` SHALL show it.
- [x] Every interactive target is at least 56px tall on desktop and 58px on mobile, and no
      decorative element extends past a hit area.
- [x] The entry animation completes within 400ms end to end, and `prefers-reduced-motion` removes it.
- [ ] Both palettes render, contrast matches the measured table in `design-handoff.md`, and `faint`
      carries no text — `faint-text` does.
- [ ] Accent covers roughly 2% of each screen, and no error state uses red (`NFR-8`).
- [x] `npm run check:core` stays green, proving no `.astro` file reached past `contracts/`.
- [x] All five gates stay green from a clean `npm ci`.

## Verification

- Baseline: the five gates, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset && npm run seed && wrangler dev`, then open `/` at 390px and at
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

- Changes: responsive SSR portfolio, three-state SVG chart, one-island entry form, shared shell,
  exact light/dark tokens, build-time Fontshare assets, and focused chart coverage.
- Files: 16 frontend, build-config, test, generated-status and task-record files.
- Baseline result: clean `npm ci`; unit 9/9, isolation/typecheck/build, integration 3/3, lint clean.
- Final result: clean `npm ci`; unit 12/12, isolation/typecheck/build, integration 3/3; live routes,
  Fontshare assets and POST-then-render probe green. Browser-only observations remain.
- Decisions recorded: none.
- Follow-up: connect a browser and inspect 390px/1440px, both palettes and reduced motion; only then
  close the three visual criteria and move this task to review.

## Review

- Looked at, not assumed. Both pages return 200 on a running worker · the DOM puts the progress panel before the `outstanding` section and orders projects recent-first, so `AC-G1` holds in the markup · the desktop chart draws 28 marks and the mobile one 14, over genuinely different data thanks to the `T-005` seed · worst-case motion is 28 × 6ms + 220ms = **388ms**, inside Doherty, with `prefers-reduced-motion` removing it · targets are 58px on mobile and 56px on desktop · no red anywhere and `faint` carries no text · `backdrop-filter` appears three times but all in one `.glass-panel` rule, so it is one surface, not three · writing an entry returns 201 and it appears on the next render of `/`.
- Medium · `src/styles/global.css:1` · Tailwind is imported and then not used · measured, not impressions: **zero** utility classes across every template, and **zero** uses of the `var(--color-*)` variables that the 18-line `@theme inline` block generates, against 28 uses of the project's own `var(--page-*)`. Tailwind's entire contribution is its reset; `@theme` produces variables nothing consumes · `D-008` is the accepted foundation decision for `interface` and says Astro **and Tailwind**, and this task's scope says Tailwind tokens wired from the handoff · this is the owner's call, not the implementer's: either use Tailwind as `D-008` intends, or supersede `D-008` with a decision saying it provides the reset while hand-written CSS carries a bespoke design. Carrying both without choosing is the one option that should not stand — a later reader cannot tell which system governs.
- Medium · `astro.config.mjs:14` · the build downloads fonts over the network and throws when it cannot · two Fontshare stylesheets and four `woff2` files are fetched on every `astro:build:done`, with a throw on any non-ok response and on receiving other than exactly four faces · `npm run build` is a required gate, so it now fails offline, on a rate limit, or if Fontshare changes its CSS shape — for reasons unrelated to the change under it, which is precisely what `D-013` exists to prevent · **this one is mine**: `design-handoff.md:22` says the fonts *must be downloaded from Fontshare at build time*, and the implementation followed it. I wrote that line without thinking about what it does to a gate · vendor the four files with the licence note, or cache them behind an integrity check with a committed fallback — and correct the handoff either way.
- Assessment: the screens are right and the design criteria hold under measurement. Both Mediums are about how the thing is built rather than how it behaves, and one of them is a decision only you can make.

## Validation

- Validated by:
- Date:
