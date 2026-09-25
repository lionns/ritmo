## Trace
- 2026-09-24 — role: Backend Implementer
  - read: STATUS, harness, T-046, D-030, D-033, quality gates and FR-14/FR-22.
  - baseline: unit 67/67, integration 120/120 with `sqld`, core isolation, typecheck, Node/Worker
    builds and harness lint passed before implementation; working tree clean.
  - scope: add the browser's IANA zone to Owner; make calendar date/week arithmetic require it;
    preserve runtime-local behavior until browser capture; then verify UTC vs owner's zone.
  - changes: migration 0008 adds nullable `owners.time_zone`; setup and the authenticated refresh
    endpoint canonicalize browser zones; rules require explicit zones and resolve local week
    boundaries across DST. Regression tests separate a UTC runtime from Bogotá and Tokyo owners.
  - final local gates: `TZ=UTC npm test` 74/74, `npm test` 74/74, integration 120/120 with `sqld`,
    core isolation clean, typecheck 0 errors (3 existing hints), Node and Worker builds passed,
    harness lint clean.
  - deployed: Worker version `3d1920ae-32d4-4a0c-8eb0-39f6cad8e1f7`; HTTPS/HSTS, protected-route
    matrix, authenticated screens and full export comparison passed. The owner confirmed the export
    had been copied and verified on an external device before the live migration check.
  - 23:00 Bogotá production check: captured `America/Bogota`, confirmed `today = 2026-09-24`, marked
    an open step for that day, then reloaded portfolio and project screens; both retained it.
