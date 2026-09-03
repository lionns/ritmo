## Trace

- 2026-09-03 — role: Frontend Implementer
  - read: `STATUS.md`, `harness.json`, T-015, quality gates, design handoff interaction/accessibility rules, six form statuses, API rejection strings, harness trace protocol
  - did: gave all six validating forms product-owned field errors and replaced both selects with one keyboard-driven ARIA listbox
  - files: form/listbox/error components, `src/lib/form-errors.ts`, `src/lib/listbox.ts`, global styles, design handoff, unit/layout tests, T-015 records
  - baseline: clean `npm ci`; unit 41/41, isolation, harness lint, typecheck 0 and build green; Node 26.8.1 warned against pin 24.20.0
  - checks: unit 49/49, isolation, typecheck 0, build, integration 7/7 and `git diff --check` green; backend scope diff empty
  - composition: throwaway seeded SQLite rendered two listboxes, seven options, zero selects and four `novalidate` forms across `/ajustes` and `/registrar`
  - round trip: project POST and entry POST returned 201 with the existing request keys; invalid cap remained a 400 mapped to its field
  - iteration: the first final lint failed only because this required trace did not yet exist; recorded here before rerunning it
  - browser: no browser instance was available after the required connection attempt, so keyboard/focus and measured 58/56px targets remain open
  - assumptions: none beyond T-015
  - blockers: browser-only acceptance and the required independent review/owner validation
  - decisions: none
  - follow-up: run both listboxes at 1440px and 390px, then review and owner validation
