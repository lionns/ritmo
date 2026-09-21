## Trace

- 2026-09-21 — role: Frontend Implementer
  - read: `T-020` § Scope, `design-handoff.md` § The Project Row and § The Log Form, `D-024`,
    `contracts/portfolio.ts` and `contracts/steps.ts`, `core/rules/portfolio.ts:108`
  - did: `todaySteps` became `openSteps` carrying `markedFor`, and the response carries `today`;
    `progressSincePlan` re-anchored to the oldest open step, in the rule and a new port read;
    `StepFields` and `StepList` replace the two next-action components, deleted; the row draws
    today's steps as sentences; capture, `/api/projects` and `contracts/capture.ts` take one first
    step; the log form shows today; the seed writes steps
  - files: `contracts/**`, `core/{rules,ports}/**`, `adapters/sqlite/store.ts`, `src/**`
    (2 components new, 2 deleted, 4 changed), `scripts/seed-local.mjs`, `design-handoff.md`,
    four test files
  - checks: baseline unit 53/53, isolation, typecheck, build, integration 14/14, green before any
    edit; final identical counts, all green
  - probe: built and served on port 4399 against a seeded throwaway database. Unmarked, a step is
    absent from the row; marked for today it is one sentence; **marked for yesterday it disappears
    leaving no line, no count, no trace**. A project without a step is 400, `/registrar` shows
    "Hoy", and no checkbox or pending count appears in the served HTML
  - correction from that probe: the `D-024` note in `StepFields` was an HTML comment, so
    "Disparador" was served to the page. Moved into the frontmatter
  - incident: port 4321 already served the owner's real database from a running dev server, so the
    first probe read that instead of the throwaway. A GET only, nothing written — and it showed
    `0002` already applied there at 18:00:55, 4 open actions carried across, `next_actions` intact
  - result: every screen reads and writes steps. Open for owner validation; no blocker.
