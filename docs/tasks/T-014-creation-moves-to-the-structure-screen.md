---
id: T-014
title: Creation moves to the structure screen — `/` goes back to being read
status: doing
profile: team
harness: 0.8.1
role: Frontend Implementer
goal: Move project creation out of the portfolio card and into `/ajustes`, split that screen into
  the two glass surfaces the handoff allows, and make the panel bound stop depending on child order
  — so the landing screen is what moved and what is next, and the structure screen does not inherit
  the pile it was handed.
decisions: [D-021]
implements: [FR-1]
---

## Sources

- `docs/tasks/T-013-…md` § Review — the owner's finding and the measurement behind it: with three
  projects the portfolio panel holds four forms and eighteen fields
- `docs/project/design-handoff.md` § Setup and Capture — "**Projects on `/`**", the paragraph this
  task replaces, and the first-run reasoning it rests on · § Navigation Map — six routes settled
  2026-08-30, `/ajustes` carrying "Capacity cap (US-1), areas" under "La estructura." · § Responsive
  Behavior — the glass capped to the grid row · the `backdrop-filter` paragraph — **two glass
  surfaces per screen**, measured against `NFR-6` before a third, and `/ajustes` uses one today
- `docs/tasks/T-012-…md` § Review — the nit that `PageStage`'s bound is positional, which a second
  panel turns from a nit into the original defect

## Scope

- **Project creation moves to `/ajustes`**, and that screen becomes **two glass surfaces**, which is
  the ceiling § Depth and Materials sets and the reason it is a ceiling. Owner settled this on
  2026-09-02 after asking whether one destination just moves the pile — it does, so it does not stay
  one card. **Áreas** holds its form and its list; **Proyectos** holds the active cap, the count and
  the creation form. The cap moves down deliberately: it is a fact *about projects*, and "2 de 3
  activos" only means something beside the form that will consume it.
- **`PageStage`'s bound stops being positional, first.** `.stage-main > :nth-child(2)` was `T-012`'s
  fix and its review already named the fragility; a second panel makes child 3 unbounded, which is
  the exact defect the owner reported. Every panel carries `glass-panel`, so the selector becomes
  `> :global(.glass-panel)` — and that must land before the split, not after.
- **Forms stay visible; the area list may collapse.** `/ajustes` is where the owner goes to create,
  so hiding a form would hide the reason for the screen. The area list is the only part that grows
  without bound and the only part that is pure reference — nothing edits it yet and the names
  reappear in the project form's `select` — so a `<details>` summarised as a count is allowed here,
  following `T-013`'s precedent. **Reversible on sight**: if two cards read well without it,
  removing it is three lines, and that is a judgement better made looking than planning.
- **`/`'s empty state becomes a signpost** linking to `/ajustes`. This is the cost the owner
  accepted: `T-012` put creation on `/` so the empty state would point at the next object rather
  than ask for progress against nothing, and a link is a weaker pointer than a form. The copy
  carries that weight and stays factual (`NFR-7`). **`/` keeps the per-row cycle** — `T-013`'s
  disclosure acts on the row it sits in, and the owner's finding was about creation, not about it.
- `docs/project/design-handoff.md` — rewrite § Setup and Capture's "Projects on `/`" as projects on
  `/ajustes`, record why the first-run reasoning was overridden rather than deleting it, and note
  that `/ajustes` now spends both its glass surfaces. The component moves rather than being
  rewritten: `ProjectCapture.astro` already carries the form and its client script.

## Out of Scope

- **The API, the rules, the contracts.** `POST /api/projects` does not change. If anything under
  `core/`, `adapters/` or `contracts/` needs to change, the move is not a move and that is a
  finding.
- **Editing or deleting an area or a project.** Still not built, still not what this is.
- **`/p/:id`.** A project route would be another home for this and is a bigger question; the six
  routes stand. **The per-row action cycle** and the `T-013` Low about a shelved project carrying
  an action both stay where they are. The area and cap **forms** keep their fields; only which
  surface holds them changes.

## Acceptance Criteria

- [x] WHEN `/` is rendered with at least one project, THE SYSTEM SHALL NOT render a project creation
      form anywhere on the page, and the portfolio panel SHALL contain no `<form>` other than the
      per-row action disclosures.
- [x] WHEN `/` is rendered with no projects, THE SYSTEM SHALL state that plainly and link to
      `/ajustes`, with no debt, apology or encouragement language (`NFR-7`, `US-2`).
- [x] WHEN `/ajustes` is rendered and at least one area exists, THE SYSTEM SHALL render the project
      creation form, and creating a project there SHALL return to a state where `/` shows it.
- [x] `/ajustes` renders exactly **two** elements carrying `glass-panel`, `PageStage` no longer
      selects by child position, and `page-layout.test.ts` asserts the new selector — checked by
      seeing a third stage child bound, not by reading the CSS.
- [x] WHEN `/ajustes` is rendered with no areas, the project form SHALL say an area is needed first,
      keeping the factual sentence `T-012` already wrote rather than inventing a second one.
- [x] The cap response after creation still reads as a count and nothing else — `T-012`'s copy rule
      moves with the form (`US-2`).
- [x] `git diff --stat core/ contracts/ adapters/` is empty at the end of this task.
- [x] All five gates green from a clean `npm ci`, and `node scripts/harness-lint.mjs` clean.

## Verification

- Baseline: the five gates of `quality-gates.md`, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: `npm run db:reset` with no seed, then answer setup and follow the first-run path
  through to a project without going back and forth — area and project created in one place.
- Task-specific: with three projects, count the forms and fields inside the portfolio panel — four
  forms and eighteen fields is what the owner rejected, and the per-row disclosures are what should
  remain. Then add a third child to a stage and confirm it is bounded too.

## Assumptions

- **`/ajustes` is the right home rather than a new route.** It already holds the cap and the areas,
  and it renders under "La estructura.". Labelled because § Navigation Map lists what `/ajustes`
  carries and projects are not in that list; the list is being extended, which is a handoff change
  and is in scope above.
- **Two surfaces is the ceiling, not a step toward more.** § Depth and Materials caps it at two for
  `backdrop-filter` cost on low-end mobile GPUs (`NFR-6`). If the split still reads badly, the next
  move is fewer things on the screen, not a third card.
- **The first-run loss is acceptable to the owner**, settled 2026-09-02 after seeing the measured
  panel. Recorded as an assumption because it reverses reasoning `T-012` wrote down, and a reversal
  that is not written looks like an oversight later.

## Risks

- **The split could still read as a pile, one card lower.** Two surfaces and a collapsible list are
  the answer being tried; if the screen is still hard to read, the honest next move is fewer things
  on it — a project route — not a third glass surface, which `NFR-6` forbids anyway.
- **Un-bounding by position is the defect that started this.** The selector change is small and it
  is load-bearing: if the split lands first, the second card walks off the stage exactly as the
  settings panel did, and the owner sees the same bug twice.
- **Two navigations to log the first entry.** Setup on `/`, structure in `/ajustes`, back to `/` to
  log. `NFR-1` governs logging rather than setup, so the friction is in the right place, but the
  first-run path should be walked end to end before this is called done.

## Outcome

- Changes: moved project creation from the portfolio to `/ajustes`; split areas and projects into
  two glass surfaces; collapsed the reference-only area list; added the empty-portfolio signpost.
  Owner rounds moved `/ajustes` to document flow, then to a full-width desktop pair with Title text.
- Files: `AppShell`, `PageStage`, portfolio/settings/project-capture components, `/` and `/ajustes`,
  design handoff, and page-layout tests. No API, rule, contract or adapter changed.
- Baseline result: clean `npm ci`; unit 36/36, isolation, harness lint, typecheck 0, Node build,
  integration 7/7. Node 26.8.1 warned against the package pin of 24.20.0.
- Final result: unit 39/39, isolation, typecheck 0, Node build, integration 7/7, lint clean. A built
  server on throwaway SQLite verified the empty route, two panels, area-to-project capture, three
  projects on `/`, three cycle forms and no project-creation form. Round 2 verified `/ajustes` omits
  viewport/equal-row/panel bounds while `/` retains them. Round 3 verified the 1312px container,
  Title treatment, two equal desktop tracks and stacked source order; backend scope diff stayed empty.
- Decisions recorded: none; the move follows `D-021` and the task's owner-settled handoff.
- Follow-up: **back to the Frontend Implementer, 2026-09-03, after owner validation round 3.** Four
  changes, all already specified in the handoff. **Pair the fields** across the 624px —
  `Nombre|Área`, `Disparador|Acción`, `Obstáculo|Minutos`, and `Nombre|`checkbox in Áreas. **Move
  the cap editor** into the Áreas card; the `X DE Y ACTIVOS` count stays above the project form.
  **Animate the disclosure marker**: `+` rotates `45deg` over `120ms`, `motion-reduce` keeps the
  rotation and drops the transition. **Normalise native control chrome** with `appearance: none` on
  both `select`s and the cap `number` — this reaches `/registrar`'s select, a deliberate extension,
  because a rule written per screen is a rule invented twice. Then owner validation round 4.

## Review

- 2026-09-02 · Reviewer, rounds 1-2, both closed. Round 1: `xl:auto-rows-[minmax(0,1fr)]` gave each
  card half the stage regardless of content and clipped the Áreas form through the middle of
  “Crear área”, and the same change left two independent scroll surfaces stacked in one column —
  worse than the single panel this task started from. Round 2 fixed both cleanly. **Both were the
  plan's fault**: it asked for two glass surfaces and for every panel to carry the bound as separate
  requirements, and never said how two panels share the column's height.
- 2026-09-02 · owner validation round 2 · the round-2 fix was correct and still wrong: at 1440px the
  headline column took **787px, 60% of the width, to hold a title**. **Third round of fixing a
  symptom, all three handbacks mine.** The stage is a reading composition and a screen of forms is
  not one. Settled: `/ajustes` runs full width, headline at Title, two surfaces side by side.
- 2026-09-03 · Reviewer, round 3, **measured in a browser rather than read off the CSS** — the first
  round on this screen where that was possible. Verified: two cards at **624px each**, nothing
  clipped (`scrollHeight == clientHeight` on both), headline at Title, no `col-start`, `row-span` or
  `font-display`. Five gates green: unit 39/39, isolation, typecheck 0, build, integration 7/7.
- **Medium · the imbalance turned vertical.** Áreas measures **465px** against Proyectos' **1091px**
  — a **627px void** under the short card — and the page scrolls **635px**. The cause: the cards are
  624px wide while every field is single-column, so `Minutos estimados` renders a **566px input**.
  The width was spent on length instead of height · pair the fields and move the 120px cap editor —
  ~501px against ~719px, which holds a 900px viewport. ~218px apart reads as two cards; 627px reads
  as a hole, and two cards of different content are not made to match.
- **"Short enough that the page does not scroll at all" was mine and was wrong.** I wrote it into
  § Setup and Capture without measuring. The section now carries the measured numbers and says so.
- 2026-09-03 · owner validation round 3, two findings, both unwritten rules rather than slips · the
  disclosure marker is a static `+` with no rotation or transition, so an opened list looks
  identical to a closed one · and nothing in `src/` sets `appearance`, so `select` and `number`
  inherit OS chrome and differ per browser · § Interaction States now carries both as rules, because
  neither was written anywhere and both would be invented again on the next screen.
- Nit · `PageStage.astro` · the bound selector is no longer positional, which closed the `T-012` nit.

## Validation

- Validated by:
- Date:
