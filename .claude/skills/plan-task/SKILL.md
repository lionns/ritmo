---
name: plan-task
description: Plan a new SDD harness task — sources, scope, testable acceptance criteria, verification, and the Definition of Ready. Use when creating a task file in docs/tasks/, breaking work down, or when asked to plan or scope work under the harness.
---

# Planning a task

Normative rules are `docs/sdd/HARNESS.md` § Definition of Ready and `TEMPLATES.md` § Task File.
Copy the template from there rather than inventing a shape.

- Read `STATUS.md` first for the next id and what is already in flight.
- `docs/project/` is the authority for scope and behavior. Do not invent requirements inside an
  implementation task; if a specification is missing, that is the task.
- The goal is one or two concrete sentences describing the outcome, not the activity.
- Name sources by path and section. Do not paste their content.
- Acceptance criteria must be checkable by someone who did not write the task. "Works correctly" is
  not a criterion; a command, an observable result, or a file state is.
- State scope and out-of-scope. Out-of-scope is where a task earns its size back.
- Name the baseline and final checks from `docs/project/quality-gates.md`.
- Label every assumption as an assumption and cite what it rests on.
- 120-line budget. Exceeding it means the task is really several tasks (`PROTOCOLS.md` § Budgets).

If this project declares `foundation` topics in `harness.json`, no task leaves `ready` until each
has an accepted decision (`HARNESS.md` § Inception). Settle those first.
