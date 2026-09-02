---
id: T-014
title: Creation moves to the structure screen — `/` goes back to being read
status: ready
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

- [ ] WHEN `/` is rendered with at least one project, THE SYSTEM SHALL NOT render a project creation
      form anywhere on the page, and the portfolio panel SHALL contain no `<form>` other than the
      per-row action disclosures.
- [ ] WHEN `/` is rendered with no projects, THE SYSTEM SHALL state that plainly and link to
      `/ajustes`, with no debt, apology or encouragement language (`NFR-7`, `US-2`).
- [ ] WHEN `/ajustes` is rendered and at least one area exists, THE SYSTEM SHALL render the project
      creation form, and creating a project there SHALL return to a state where `/` shows it.
- [ ] `/ajustes` renders exactly **two** elements carrying `glass-panel`, `PageStage` no longer
      selects by child position, and `page-layout.test.ts` asserts the new selector — checked by
      seeing a third stage child bound, not by reading the CSS.
- [ ] WHEN `/ajustes` is rendered with no areas, the project form SHALL say an area is needed first,
      keeping the factual sentence `T-012` already wrote rather than inventing a second one.
- [ ] The cap response after creation still reads as a count and nothing else — `T-012`'s copy rule
      moves with the form (`US-2`).
- [ ] `git diff --stat core/ contracts/ adapters/` is empty at the end of this task.
- [ ] All five gates green from a clean `npm ci`, and `node scripts/harness-lint.mjs` clean.

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

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- Severity · `file:line` · issue · impact · recommendation

## Validation

- Validated by:
- Date:
