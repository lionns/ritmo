## Trace

- 2026-08-31 — Frontend Implementer, rounds 1–3 (compressed) — built shell, portfolio, chart and
  form from task/handoff/D-008/D-009; moved presentation onto token utilities and vendored the four
  WOFF2 faces, so the build stopped needing the network; then two owner captures rejected
  width-only layouts, and desktop became a `100dvh` stage with fluid gaps, chart and cards, panel
  scroll last-resort only, dark glass denser, chart opacity off the legend. Decisions: compact keeps
  reading gaps and 56px targets; overflow thumb is thin `dim`, never accent. Unit 20/20, all gates.

- 2026-09-01 — role: Frontend Implementer, canvas-fidelity fix
  - read: the approved canvas itself — `L-Escritorio`/`L-Movil` pulled out of the artifact, since
    the markers the owner remembered are drawn there and appear in no written source
  - found: `design-handoff.md` never specified the project row, so no build from it could have had
    the markers; the row shipped as six blocks and four mono field labels instead of three elements
  - did: wrote § The Project Row into the handoff; rebuilt `ProjectCard` as marks, title and one
    sentence; extracted `src/lib/project-row.ts` so the sentence is tested as behavior, not source
  - decisions: owner settled marker meaning (a path, not a score), the cap of four filled marks,
    and the whole row as the prefilled link replacing the per-card call to action
  - checks: unit 22/22, isolation, typecheck, build, integration 3/3
  - probes: seeded `/` drew `●●●●○◇` capped down from more entries and `●○◇` on one advance;
    prefill selected the right project; POST returned 201 and moved the project to the top of
    `En movimiento` with a new filled mark. (The `●●●●◇` reading recorded earlier in this block
    predated the owner making the next-step mark unconditional; corrected 2026-09-01.)
  - blocker: the entry's *text* no longer renders on `/`, so `AC-5` needs the owner's reading;
    owner visual recheck and the real-phone `backdrop-filter` measurement still stand
