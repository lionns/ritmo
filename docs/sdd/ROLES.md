# Roles — Responsibilities, Rules, Escalation

## Universal Rules

- Read the assigned task and its named sources before changing files.
- Follow `PROTOCOLS.md` for context selection, tracing, and review.
- Treat project specifications as the authority for behavior and scope.
- Keep changes limited to the task. Avoid opportunistic refactors.
- Prefer existing project patterns over new conventions.
- Label assumptions as assumptions. Claims about behavior cite a file, command, or observation.
- Verify with the strongest practical check available.
- Do not start implementation on a red baseline unless the task is to fix it.
- Do not present a change as done while final checks fail.
- Deleting, skipping, relaxing, or narrowing a check to reach green is a defect, not a fix. A check
  that is genuinely wrong is changed by a decision, never by an edit made to get past it.
- Report blockers early, with evidence.
- Record the trace required by the active profile.

## Roles

In `solo`, only the first three exist; the others are hats the same agent wears, not separate roles.

| Role | Owns | Outputs |
|---|---|---|
| **Planner** | Turning specs into scoped tasks: sequencing, dependencies, acceptance criteria, surfacing unresolved questions before implementation | Task files in `docs/tasks/`, decision candidates |
| **Implementer** | Building the change: correctness, input validation, data integrity, stable contracts, reuse of established patterns, interaction and error states | Code changes, contract or deviation notes, verification results |
| **Reviewer** | Judging completed work for correctness and risk; confirming the change matches scope and respects acceptance criteria | Ordered findings with file references, open questions, approval or requested changes |
| Tester (`team`) | Focused checks for assigned behavior: success, failure, boundary, regression. Distinguishes product gaps from defects | Test changes, reproducible defect reports, residual risk notes |
| Release Engineer (`team`) | Delivery readiness: checks passed, config, build, migration, rollback | Release readiness notes, deployment verification |
| UX/Motion Designer (`team`) | Visual hierarchy, layout, state, motion, accessibility, responsive risk | Design handoff updates, interaction notes, UX findings |

In `team`, the Implementer role splits into **Frontend Implementer** and **Backend Implementer**
with the same responsibilities scoped to their side of the contract.

## Escalation

Escalate when acceptance criteria conflict with sources; required context is missing and no safe
assumption exists; the task would require broad or destructive changes; a dependency, permission, or
environment issue blocks verification; or the work exposes a security, privacy, data-integrity, or
compliance concern.

An escalation states the blocking issue, the evidence, the options considered, and a recommended
next action.

## Controlled Self-Improvement

Agents may propose harness improvements. They may not apply them without explicit human approval —
in **both** profiles. Governance surface: everything in `docs/sdd/`, `harness.json`, and `scripts/`.

A proposal states: affected document or script · current limitation · proposed change · expected
benefit · risk or tradeoff. On approval it becomes a decision file and, if it changes harness
behavior, a `VERSION.md` entry.

## Communication

Be concise, specific, factual. Reference files and checks directly. Separate facts from assumptions.
Do not hide incomplete work behind vague status.
