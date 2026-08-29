# AGENTS.md

This project runs the SDD harness. Work from written tasks; leave the records the harness asks for.

## Read first, every session

1. `STATUS.md` — every task, decision, and journal entry, in one generated file.
2. `harness.json` — the active harness version, profile, and record budgets.
3. The assigned task file in `docs/tasks/`.

If those three answer the question, stop reading. `docs/sdd/README.md` is the routing index for
everything else — load a harness document only when the task needs it.

## Rules that bind every change

- Specifications in `docs/project/` are the authority for scope and behavior. Do not invent
  requirements inside an implementation task.
- No new implementation on a red baseline. Run the baseline checks in
  `docs/project/quality-gates.md` first; if they fail, the task is `blocked`, not started.
- A change is done only when the final checks in that same file are green. Never report `done`
  while a check fails.
- Keep changes inside the task's scope. No opportunistic refactors.
- Label assumptions as assumptions. Cite a file, command, or observation for claims about behavior.
- Record the trace the profile requires, append the journal line, and regenerate `STATUS.md`.

## Never edit by hand

`STATUS.md` and `docs/decisions/README.md` are generated. Run `node scripts/harness-status.mjs`.

## Governance

Changes to `docs/sdd/`, `harness.json`, or `scripts/` need explicit human approval, a decision file
in `docs/decisions/`, and a `VERSION.md` entry when behavior changes. Propose; do not apply.

## Commands

```sh
node scripts/harness-status.mjs   # regenerate STATUS.md and the decision index
node scripts/harness-lint.mjs     # enforce budgets, record shape, and closure integrity
```

`.githooks/pre-push` runs that linter before any push, for whichever agent is in the room. If
`.claude/` is also installed, it runs when a turn ends too. Neither holds a rule of its own.
