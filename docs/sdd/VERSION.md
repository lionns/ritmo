# Harness Version

Version: `0.8.0` · Status: `Operational` · Date: 2026-08-31

The active version and profile for a project live in its `harness.json`. This file is the changelog
and the versioning rules.

## Versioning Rules

- `MAJOR` — incompatible governance, workflow, role, or protocol changes.
- `MINOR` — backward-compatible additions to protocols, templates, roles, gates, or records.
- `PATCH` — clarifications, formatting, and fixes that restore already-documented behavior.

## Change Rules

- Changes to `docs/sdd/`, `harness.json`, or `scripts/` require explicit human approval, in both profiles.
- An accepted governance change gets a decision file in `docs/decisions/`.
- A change that alters harness behavior bumps the version and adds a changelog entry here.
- Tasks record the version they ran under, in their front-matter.
- A project may stay on an older version. `0.1.0` remains valid for projects that have not migrated.

## Changelog

### 0.8.0 — 2026-08-31

Task plans and execution records have separate limits. D-015.

- **Split task budgets.** `taskPlanLines` covers everything before the first `## Outcome`, while
  `taskRecordLines` covers that heading through EOF. A task without the heading is entirely plan.

### 0.7.1 — 2026-08-28

The `Stop` gate 0.5.0 announced had never run. D-029.

- **Malformed hook shape.** `.claude/settings.json` placed the command directly in the `Stop` array
  instead of inside a matcher group, which Claude Code discards without erroring. Any repo that ran
  `harness-init --claude` between 0.5.0 and 0.7.0 holds a gate that never fired: re-run it with
  `--force`, or wrap the command in `{"hooks": [ ... ]}` by hand. `--hooks` and
  `.githooks/pre-push` (D-027) were never affected, so records stayed enforced at push.
- **`PATCH` widened** to admit fixes that restore already-documented behavior (D-029). The old
  wording covered only non-behavioral edits, which left a restored gate with no version to ship in.

### 0.7.0 — 2026-08-27

The enforcement gate stops belonging to one agent. D-027.

- **`.githooks/pre-push`** (D-027). `harness-init --hooks` installs it and wires `core.hooksPath`
  when the target is a git repository. Git runs it for every agent and for a human using none, so
  the rules are enforced regardless of what is in the room. `core.hooksPath` is per clone, which
  makes CI the backstop rather than an extra.
- **`--claude`** now carries the `Stop` hook and the skills, renamed from `--hooks` in 0.5.0. A
  vendor layer is an accelerator that catches a broken record earlier; it holds no rule, and a test
  keeps it that way. Any future vendor gets its own flag on the same terms.

### 0.6.0 — 2026-08-27

`AGENTS.md` becomes the entry point, and the checks — plus the criteria that drive them — get rules
of their own. D-015, D-016, D-018, D-019, D-026.

- **`AGENTS.md`** (D-016). Holds the rules; `CLAUDE.md` is a three-line pointer, tested so it cannot
  grow a second rule set. The roles document is now `ROLES.md`, which frees the name.
- **Checks are protected** (D-015). Weakening, skipping, or narrowing one to reach green is a
  defect; a `done` task must name a task-specific check; the gate requires a check that exercises
  the change in composition, not only in isolation.
- **Forward traceability** (D-019). Tasks may declare `implements: [FR-1]`, linted for existence. A
  `done` task needs a non-empty `## Sources`. Unimplemented ids are reported, never failed.
- **Criteria grammar** (D-018). `WHEN <trigger> THE SYSTEM SHALL <observable result>`, documented
  and deliberately not linted.
- **Budget 600 → 650** (D-026), after deleting 26 lines of duplication to pay for it first.

### 0.5.0 — 2026-08-27

Moves enforcement off the agent's memory and into a hook. D-017.

- **Stop gate.** `harness-init --hooks` installs `.claude/settings.json`, a `Stop` hook running
  `harness-lint`, and three skills. A failing check blocks the turn and hands the report back, so a
  broken record is caught without the agent having read any rule that session.
- **Standalone, not a plugin.** Checked into the adopting repo, so it needs no install and reaches
  every teammate (D-024). The `hooks` object is format-identical to a plugin's, so converting later
  is a copy. Without `--hooks` the install is byte-identical to 0.4.0.

### 0.4.0 — 2026-08-27

Gives the harness a project inception phase. Architecture, design, and test strategy become accepted
decisions before task one, instead of prose an agent fills in and the next session trusts. D-020.

- **Foundation gate.** `harness.json` lists `foundation` topics; each needs one accepted decision
  carrying `- Foundation: <topic>`. `harness-lint` fails while any task is past `ready` and a topic
  is unsettled. An absent or empty list disables the gate, so 0.3.0 projects upgrade unchanged.
- **`harness-init --adopt`.** A brownfield install declares no topics and ships `T-001`, the task
  that records what the code already decides and then declares them.
- **Greenfield installs** declare the default seven, so the gate is on before the first task moves.

### 0.3.0 — 2026-08-27

Makes adoption one command and makes `done` a claim the tooling checks. D-012, D-013, D-014.

- **`templates/`** (D-012). Adopters copy pristine templates plus the `CLAUDE.md` entry point the
  harness needs to take effect. `docs/project/` is now this repo's own filled specification.
- **Closure integrity** (D-013). `harness-lint` rejects a `done` task with no journal line for its
  id, with an unchecked acceptance criterion, or with a `harness:` version this file never declared.
- **`team` is enforced** (D-013). A task past `ready` needs a trace file in `docs/traces/`, whose
  name shape and 25-line budget are linted; a `done` task needs a `## Validation` section naming a
  validator. Previously all of this lived only in prose.
- **`harness-init`** (D-014). `node scripts/harness-init.mjs <target> --project=<name>` installs the
  harness and leaves the result lint-clean. Refuses to overwrite without `--force`.

### 0.2.1 — 2026-08-26

Fixes path resolution in the enforcement scripts. No rule, budget, or record shape changes. D-011.

- **Canonical paths.** `harness-status` no longer exits 0 without generating when the repo path
  contains a symlink, and neither script fails on a path containing a space.
- **One line count.** `sddDocLines` uses the same `lineCount` as the budget checks; a trailing
  newline is no longer a line. Reported `docs/sdd/` totals drop by one per file.
- **Tests.** `npm test` covers the library, both renderers, and the `harness-lint` CLI contract.

### 0.2.0 — 2026-08-25

Reduces the records a project must produce, and makes what remains diffable. Decisions D-007…D-010.

- **Profiles** (D-007). `harness.json` selects `solo` (3 roles, inline trace, implicit validation) or
  `team` (7 roles, trace files, explicit validation gate). Both keep the baseline and final gates.
- **Decisions as files** (D-008). One `D-###-*.md` per decision with a generated index, replacing the
  monolithic `DECISION_LOG.md` that had reached 794 lines in a live project.
- **Enforced budgets** (D-009). Limits moved from prose into `harness.json` and `scripts/harness-lint.mjs`:
  task 120 lines, trace block 25, decision 40, journal entry 1, `docs/sdd/` total 600.
- **Generated `STATUS.md` + append-only `JOURNAL.md`** (D-010). Session start costs one file, not ten.
- **Consolidation.** The eleven `docs/sdd/` documents became five: `README`, `HARNESS`, `AGENTS`,
  `PROTOCOLS`, `TEMPLATES` (plus `VERSION`). 1,164 lines → 525.
- **`docs/plans/` → `docs/tasks/`.** Task state now lives only in front-matter.

### 0.1.0 — 2026-05-31

Initial reusable SDD harness: routing index, principles and flow, agent protocol and roles, task,
review, trace, context and workflow protocols, human validation gate, baseline and final gates,
decision log, project specification templates.
