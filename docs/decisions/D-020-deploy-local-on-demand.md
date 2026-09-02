# D-020 — No deploy: the owner starts it to use it

- Status: accepted
- Date: 2026-09-02
- Supersedes: D-005
- Tasks: T-011
- Foundation: deploy

## Context

`D-005` put Ritmo on Workers' free plan and rejected a VPS, a container and certificates as work
with no payoff for one user. That reasoning was sound and the conclusion still is — what changed on
2026-09-02 is the owner's requirement not to depend entirely on one vendor, and the observation
that a deploy has been blocking use for a week while nothing is deployed.

## Decision

**Ritmo runs on the owner's machine, started on demand.** No hosting, no domain, no certificates.
Docker was considered again and **deliberately deferred by the owner on 2026-09-02**: a Node app
with a SQLite file needs no container to run locally, and a Dockerfile written later loses nothing.
This is explicitly a stage, not an end state — hosting returns as its own decision.

## Consequences

- **`NFR-1` cannot be met while this holds, and that is the real cost.** It asks for a saved entry
  in under twenty seconds *on a phone*; `US-4`, the `R-Movil` artboard and every 390px target in
  `design-handoff.md` assume the phone is the primary surface. A laptop-local server has no phone.
  The design stays as drawn and the requirement stays unmet, recorded rather than quietly dropped.
- Auth leaves the critical path. Bound to localhost there is no network exposure, so `D-004` stands
  as written and unbuilt. **It becomes mandatory again the moment anything is exposed**, and no
  hosting decision may supersede this without saying so.
- The owner holds the only copy of the data, which is `D-019`'s backup consequence, not a separate
  one.
- Nothing is reachable when the machine is off. For a tool used deliberately, that is the design.

## References

- `D-005` · `D-004` · `D-019` · `docs/project/requirements.json` — `NFR-1`
