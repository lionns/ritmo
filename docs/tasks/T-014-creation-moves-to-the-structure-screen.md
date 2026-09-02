---
id: T-014
title: Creation moves to the structure screen — `/` goes back to being read
status: ready
profile: team
harness: 0.8.1
role: Frontend Implementer
goal: Move project creation out of the portfolio card and into `/ajustes`, beside the areas and the
  cap it belongs with, so the landing screen is what moved and what is next rather than five jobs in
  one bounded panel.
decisions: [D-021]
implements: [FR-1]
---

## Sources

- `docs/tasks/T-013-…md` § Review — the owner's finding and the measurement behind it: with three
  projects the portfolio panel holds four forms and eighteen fields
- `docs/project/design-handoff.md` § Setup and Capture — "**Projects on `/`**", the paragraph this
  task replaces, and the first-run reasoning it rests on
- § Navigation Map — six routes settled with the owner on 2026-08-30; `/ajustes` already carries
  "Capacity cap (US-1), areas". `/ajustes` renders under the display line "La estructura."
- § Responsive Behavior — the glass is capped to the grid row and scrolls internally as a fallback,
  which is the surface the creation form currently sits inside

## Scope

- **Project creation moves to `/ajustes`**, below the areas it depends on. Owner settled this on
  2026-09-02: areas, the cap and projects are one act — structure — and they get one home. Creating
  an area and then a project in it stops being a round trip through `/`.
- **`/`'s empty state becomes a signpost.** With no projects, the panel says what to do and links to
  `/ajustes`. This is the cost the owner accepted: `T-012` put creation on `/` so the empty state
  would point at the next object rather than ask for progress against nothing, and a link is a
  weaker pointer than a form. The copy carries that weight and stays factual (`NFR-7`).
- **`/` keeps the per-row cycle.** `T-013`'s disclosure acts on the row it sits in and stays where
  it is; the owner's finding was about creation, not about it.
- `docs/project/design-handoff.md` — rewrite § Setup and Capture's "Projects on `/`" as projects on
  `/ajustes`, and record why the first-run reasoning was overridden rather than deleting it.
- The component moves rather than being rewritten: `ProjectCapture.astro` already carries the form
  and its client script, and `/ajustes` already renders a bounded panel after `T-012`.

## Out of Scope

- **The API, the rules, the contracts.** `POST /api/projects` does not change. If anything under
  `core/`, `adapters/` or `contracts/` needs to change, the move is not a move and that is a
  finding.
- **Editing or deleting a project.** Still not built, still not what this is.
- **`/p/:id`.** A project route would be another home for this and is a bigger question; the six
  routes stand.
- **The per-row action cycle**, and the `T-013` Low about a shelved project carrying an action.
- **Areas and the cap.** They are already on `/ajustes` and this task does not touch their forms.

## Acceptance Criteria

- [ ] WHEN `/` is rendered with at least one project, THE SYSTEM SHALL NOT render a project creation
      form anywhere on the page, and the portfolio panel SHALL contain no `<form>` other than the
      per-row action disclosures.
- [ ] WHEN `/` is rendered with no projects, THE SYSTEM SHALL state that plainly and link to
      `/ajustes`, with no debt, apology or encouragement language (`NFR-7`, `US-2`).
- [ ] WHEN `/ajustes` is rendered and at least one area exists, THE SYSTEM SHALL render the project
      creation form, and creating a project there SHALL return to a state where `/` shows it.
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
- Task-specific: with three projects, count the forms and fields inside the portfolio panel. Four
  forms and eighteen fields is what the owner rejected; the per-row disclosures are what should
  remain.

## Assumptions

- **`/ajustes` is the right home rather than a new route.** It already holds the cap and the areas,
  and it renders under "La estructura.". Labelled because § Navigation Map lists what `/ajustes`
  carries and projects are not in that list; the list is being extended, which is a handoff change
  and is in scope above.
- **The first-run loss is acceptable to the owner**, settled 2026-09-02 after seeing the measured
  panel. Recorded as an assumption because it reverses reasoning `T-012` wrote down, and a reversal
  that is not written looks like an oversight later.

## Risks

- **`/ajustes` inherits the length problem.** It will hold the cap, the area form, the area list and
  the project form. It is bounded and scrolls after `T-012`'s fix, and it is a screen visited
  occasionally rather than the daily landing — but if it becomes unreadable, the answer is the same
  question asked again, not more nesting.
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
