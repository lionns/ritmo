---
name: close-task
description: Close an SDD harness task — final checks, acceptance criteria, outcome, trace, journal line, and regenerating STATUS.md. Use when a task in docs/tasks/ is finished, being marked done, or when asked to close, complete, or wrap up harness work.
---

# Closing a task

Normative rules are `docs/sdd/HARNESS.md` § Definition of Done and § Final Acceptance Gate. This is
the running order, not a second copy of them.

1. Final checks green. The command is in `docs/project/quality-gates.md`. If they fail, the task is
   not done — it stays `doing`, `review`, or `blocked`. Never report done while a check fails.
2. Every acceptance criterion in the task file is checked, or it is not done.
3. Fill `## Outcome` in place. Never append history; `git log --follow` on the task file is the
   history.
4. Record the trace — inline `## Trace` under `solo`, a file in `docs/traces/` under `team`. Shape
   and budget in `docs/sdd/PROTOCOLS.md` § Trace.
5. Any new decision exists as its own file in `docs/decisions/` (`TEMPLATES.md` § Decision File).
6. Set `status: done` in the front-matter. The state lives there and nowhere else.
7. Append one line to `JOURNAL.md`: seven pipe-separated fields, shape in `TEMPLATES.md`.
8. Regenerate with `node scripts/harness-status.mjs`. Never hand-edit `STATUS.md` or
   `docs/decisions/README.md`.
9. Run the check once more.

`harness-lint` enforces the mechanical half of this. If it rejects the close, the record is wrong —
fix the record, not the linter.
