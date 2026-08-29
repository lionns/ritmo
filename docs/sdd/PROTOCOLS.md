# Protocols — Context, Budgets, Trace, Review

## Budgets

Enforced by `scripts/harness-lint.mjs`, not suggested. The limits themselves live in `harness.json`
under `budgets` — read them there, not from a copy here that can drift.

Exceeding a budget means the record is doing something it should not: pasting content that already
exists elsewhere, accumulating history that belongs in `git log`, or bundling several tasks into
one. Split the task or cut the prose. Raising a limit is a governance change.

## Context

- Load the smallest context set that can safely answer the task.
- Start from `STATUS.md`, `harness.json`, and the task file. Add more only when those leave a gap.
- Prefer paths, section names, task IDs, and decision IDs over copying content.
- Read sources directly when accuracy matters; summarize only stable facts and constraints.
- Never paste a full document into a task or trace. Quote a clause only when its exact wording is
  load-bearing for an acceptance criterion, a contract, or a governance rule.
- Do not rely on memory when a local source of truth exists.
- Treat missing context as a blocker when guessing would change product behavior, architecture,
  data, security, or governance.

Source priority: `STATUS.md` → task file → relevant project spec sections → referenced decisions →
directly affected source files → prior trace blocks for the same task → external references last.

### Anti-Hallucination

Every task names the sources that define its scope. Every assumption is labelled. Every claim about
project behavior cites a source, command result, or observation. If two sources conflict, stop and
escalate instead of choosing silently.

### Handoff

When handing work to another agent or session: what was read, what was concluded, what remains
uncertain, which files changed, which checks passed or failed, which source to read next. Short
enough to fit in the task file without duplicating the underlying documents.

## Trace

A trace is an operational record: enough evidence to explain and audit what happened, nothing more.
It never replaces the task, the review, or a decision.

- **`solo`**: one `## Trace` block at the bottom of the task file. Append one dated sub-entry per
  working round. Max 25 lines total — when it fills up, compress the older rounds into one line.
- **`team`**: one file per role per task, `docs/traces/<YYYY-MM-DD>_<task-id>_<role>.md`, using the
  same block structure. Same 25-line budget. The filename shape is linted, and a task past `ready`
  without one fails the final gate (D-013).

Required content is in `TEMPLATES.md` § Trace Block: sources read, actions, files changed, checks
run and their results, assumptions, blockers, decisions, follow-ups.

Rules: record failed checks as well as passing ones. Record only the command output needed to
explain a result. Distinguish observed facts from assumptions. Reference decision files by ID. Never
include secrets, credentials, or personal data. A trace is not approval for a governance change.

## Review

### Priorities, in severity order

1. Correctness bugs or broken acceptance criteria.
2. Security, privacy, data integrity, or compliance risk.
3. Regressions in existing behavior.
4. Missing or weak verification for changed behavior.
5. Maintainability issues that increase future delivery risk.
6. Documentation or decision gaps that could mislead future agents.

### Severity guide

- **Critical** — cannot ship: major failure, data loss, security exposure, or core functionality blocked.
- **High** — likely breaks important behavior, or significant operational, security, or user impact.
- **Medium** — a real defect, test gap, or maintainability risk to fix before completion.
- **Low** — minor, worth fixing for clarity or future maintenance.

### Inputs

Task file · relevant specs · changed files · implementer's verification results · baseline and final
check results · decisions that constrain the work.

### Output

Findings as `Severity · file:line · issue · impact · recommendation`, ordered by severity, written
into the task file's `## Review` section. Then open questions, verification notes, and a one-line
assessment.

### Rules

- Findings are actionable and grounded in evidence. No broad preference feedback without a concrete risk.
- Do not approve work that fails its acceptance criteria or has failing final checks, absent a
  human-approved exception.
- Agent review is not human validation; in `team` they are separate gates.
- If nothing is wrong, say so plainly and list residual verification gaps.
- Separate follow-up suggestions from required fixes.
