## Trace

- 2026-09-02 — role: Backend Implementer
  - read: `STATUS.md`, `harness.json`, T-013, FR-6, next-action data model and invariant, design handoff, quality gates, D-019, D-021, current rules and UI
  - did: made project/action creation atomic; added the shared first/replacement action contract, API and form; documented the row cycle
  - files: store port/SQLite adapter; project/next-action rules; capture/action contracts/APIs; project capture/row components; design handoff; unit/integration tests
  - baseline: clean `npm ci`; unit 33/33, isolation, harness lint, typecheck 0, build, integration 7/7 — green; Node 26.8.1 warned against pin 24.20.0
  - iteration: integration fixtures first failed after action fields became required; a UI source assertion also matched nested inputs; both were corrected to bind the new behavior
  - checks: unit 36/36, integration 7/7, isolation, typecheck 0, build, `git diff --check` — green
  - composition: built server on throwaway SQLite refused missing action fields without a project, created and rendered the first action, replaced it, refused duplicate closure, and rendered the replacement
  - repair: an active actionless project accepted the same form and the portfolio stopped returning a null next action
  - atomicity: forced action-id collision rolled back project creation; forced replacement insert failure and duplicate closure preserved the existing open action
  - assumption: product-created shelved overflow also receives one open action because T-013 requires every product-created project to receive exactly one
  - blockers: no controllable browser was available; owner visual interaction remains open and owner data was never touched
  - decisions: none
  - follow-up: independent review and owner validation
