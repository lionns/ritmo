# Harness — Principles, Flow, Gates

Reusable Specification-Driven Development workflow. Project-agnostic: product, design, architecture,
and domain details belong in `docs/project/`.

## Principles

- Specifications are the source of truth for scope and behavior.
- Agents work from written tasks with explicit inputs, outputs, and acceptance criteria.
- Changes stay small enough to review and verify independently.
- Decisions that constrain future work are recorded when made, one file each.
- Reviews prioritize correctness, regressions, security, maintainability, and test coverage.
- Records are budgeted. A record that exceeds its budget is a defect, not a thorough job.
- Context is selected deliberately: enough evidence to avoid guessing, nothing more.

## Profiles

`harness.json` declares the active profile.

### `solo`

One person plus agents. Roles collapse to **Planner · Implementer · Reviewer**.

- The trace is a bounded block at the bottom of the task file, not a separate file.
- Human validation is implicit: accepting the change is the validation.
- Required records per task: the task file, and one line in `JOURNAL.md`.

### `team`

Multiple people or multiple agent families. All seven roles in `ROLES.md` apply.

- Traces are separate files in `docs/traces/`, one per role per task.
- Human validation is an explicit gate with a named validator.
- Required records per task: task file, trace, journal line, validation record.

Both profiles keep the baseline gate and the final acceptance gate. Those gates prevent building on
a broken tree and cost no documentation.

## Inception

`harness.json` lists the `foundation` topics a project settles before task one. Empty or absent
disables the gate. The default seven are the one-way doors — the choices expensive to reverse:

`runtime` · `data` · `boundaries` · `identity` · `deploy` · `tests` · `interface`

Each is settled by exactly one **accepted** decision carrying `- Foundation: <topic>`. A topic the
project does not have is deleted from the list, never recorded as not applicable. A topic the
evidence does not yet settle is an accepted decision *to defer*, carrying a `- Trigger:` line that
names what will force the choice: a deferral is a record, silence is not. Greenfield decides;
brownfield records what the code already does and cites the path proving it.

Nothing outside the list is settled up front — everything else is decided per task, on evidence,
which is what keeps inception from becoming a specification phase. `harness-lint` fails while any
task is past `ready` and a listed topic is unsettled, and only `accepted` counts, so the approval
moment lands where reversal is expensive.

## Flow

1. Settle the foundation if this project has not, then define or update the project specifications
   the work depends on.
2. Create a task file from `TEMPLATES.md` in `docs/tasks/`.
3. Confirm Definition of Ready.
4. Run the baseline checks from `docs/project/quality-gates.md`. Proceed only if green.
5. Implement only the approved scope.
6. Run the final checks. Verify against the task acceptance criteria.
7. Review using `PROTOCOLS.md` § Review.
8. Record the trace — inline in `solo`, separate file in `team`.
9. Record any new decision as its own file in `docs/decisions/`.
10. Validate (implicit in `solo`, explicit in `team`), set `status: done`, append the journal line.
11. Regenerate `STATUS.md`.

## Task States

`ready` · `doing` · `review` · `blocked` · `done` · `superseded`

The state lives in the task file front-matter and nowhere else. `STATUS.md` is generated from it.

## Definition of Ready

- The goal is one or two concrete sentences.
- Primary sources are named by path.
- Acceptance criteria are explicit and testable, in the grammar `TEMPLATES.md` gives.
- Scope and out-of-scope are identified.
- Baseline and final checks are named.
- Open questions are resolved, or recorded as labelled assumptions.
- The harness version and profile are recorded in the front-matter.

## Definition of Done

- The requested change is complete and acceptance criteria pass.
- Baseline checks were green before implementation, or an exception is recorded.
- Final checks are green after the change, or an exception is recorded.
- Validation is granted per the active profile.
- No unrelated changes were introduced.
- New decisions exist as files in `docs/decisions/` and are listed in its index.
- The trace exists per the active profile.
- Follow-up work is listed separately, not hidden in the implementation.
- The journal line is appended and `STATUS.md` is regenerated.

## Baseline Gate

Before new implementation, run the configured checks.

- All green → implementation may start.
- Any failure → implementation must not start. The task moves to `blocked`, unless the task is
  specifically to fix that baseline.
- The failure is recorded in the task's trace block.
- Reprioritizing is a human call; approving unrelated implementation on a red baseline is not.

## Final Acceptance Gate

`harness-lint` enforces the mechanical half of the Definition of Done: a `done` task must have a
journal line for its id, no unchecked acceptance criterion, a `harness:` version that `VERSION.md`
declares, and — under `team` — a trace file and a named validator (D-013).

Two kinds of check must both be green: the ones an agent iterates against, and at least one that
exercises the change together with what already exists. The first kind can be made to pass by
narrowing it, which is why the second is required and why weakening either is a defect.

A change cannot be accepted unless all configured checks pass, task-specific verification passes,
blocking review findings are resolved, the trace is complete, and required decisions are recorded.
If final checks fail the task stays `doing`, `review`, or `blocked` — never `done`.

## Human Validation Gate

In `solo`, accepting the change is the validation — there is no separate ceremony.

In `team` it is an explicit gate. Validation must be **stated**: silence, absence of objection, or
an agent review is not approval. The validator receives, in one message:

- Task ID and title, and a summary of what changed.
- Files changed.
- Baseline result, final check result, review result.
- Trace path, decisions recorded.
- Known risks and follow-up work.

## Exceptions

Allowed only with explicit human approval, recorded as a decision file or in the task trace block.
Typical cases: no automated tests exist yet; a known unrelated failure is temporarily accepted; an
environment issue blocks verification; the task is to establish the baseline itself.

An exception record states the skipped check, why, who approved it, and its expiry or follow-up
task. Standing exceptions also belong in `docs/project/quality-gates.md`.

## Change Discipline

- Prefer additive, localized changes.
- Preserve existing work; do not rewrite specifications unless the task says so.
- Do not invent product requirements inside implementation tasks.
- Escalate when sources of truth conflict or acceptance criteria are ambiguous.
