---
id: T-032
title: The week in the spec — the boundary, the commitment, and what a close proposes
status: ready
profile: team
harness: 0.9.0
role: Planner
goal: Settle the five things the week's requirements leave open — where a week begins, what a
  commitment is attached to, how the next week's targets are derived, what happens to a week the
  owner never closes, and whether a week rolls over by itself — and record them as a decision
  candidate the owner accepts before any of T-033…T-035 is started.
decisions: []
implements: [FR-7, FR-9, FR-10, FR-11, FR-12, FR-14, FR-19]
---

## Sources

- `docs/project/requirements.json` — `FR-7`…`FR-12`, `FR-14`, `FR-19`, and `NFR-8`, which
  constrains how any of it may be rendered
- `docs/project/research.md` — the findings the week's rules rest on. Read them before proposing
  a number; `NFR-10` requires a decision file naming any finding a behaviour overrides.
- `core/rules/step.ts` — `calendarDateOf`, the product's existing answer to "which day is it",
  which uses the machine's local calendar and not UTC
- `adapters/sqlite/store.ts:222` — `hasClosedWeek`, the one query against `weeks`, today always
  false, which is what keeps `FR-14`'s Monday restriction dormant
- `migrations/0001_initial_schema.sql` — the `weeks`, `commitments` and `tags` tables as declared
  and never used

## Scope

What the requirements already fix, and this task must **not** re-decide:

- The reserve is `ceil(0.30 x target)` with a minimum of 1 (`FR-7`)
- The capacity labels are light, normal, heavy, applied retroactively at close (`FR-9`)
- The close has three fields, two optional (`FR-11`)
- The pattern spans roughly eight weeks and records no duration (`FR-12`)
- Nothing rolls forward as debt, and the next week opens with no carried state (`FR-19`)

What is open, and what this task answers:

1. **Where a week begins.** `FR-14` says Monday. Local calendar or UTC, and what happens to an
   entry logged at 00:30 on Monday about Sunday's work.
2. **What a commitment is attached to** — a project, an area, or an objective — and how that
   squares with `FR-15`, where the fixed job's projects have their own quota and never compete
   for the active cap.
3. **How `FR-10` derives next week's targets from logged history.** The requirement names no
   window and no formula. Whatever is proposed is a starting value with no evidence behind it and
   must say so in the decision, as `core/rules/calibration.ts` does for its own two constants.
4. **A week the owner never closes.** Ritmo is used in a life that moves; a week will be missed.
   Whether it closes itself, stays open, or is closed retroactively — and what `FR-19` means for
   the week after it.
5. **Whether a new week opens by itself** or on the owner's action.

## Out of Scope

- Any code. This task changes `docs/` only.
- `FR-5` — crediting an objective in another area. It needs objectives on a screen first, which
  nothing plans yet.

## Acceptance Criteria

- [ ] Each of the five open questions has a written answer with the reasoning that produced it
- [ ] Every number introduced is labelled as a starting value with no evidence behind it, unless
      `research.md` supports it, in which case the finding is cited by section
- [ ] No answer contradicts `NFR-8`: no week attribution on the landing surface, never red, never
      accumulated across weeks, never the word "lost"
- [ ] `docs/project/requirements.json`, `data-model.md` and `design-handoff.md` state the same
      week, with no section left describing a week nobody decided
- [ ] The decision is proposed to the owner and **accepted by them** before it is written as
      `accepted`. A decision file is immutable once accepted; writing one before the owner has
      answered pre-empts a call that is theirs.

## Verification

- Baseline: `node scripts/harness-lint.mjs`
- Final: `node scripts/harness-lint.mjs && node scripts/harness-status.mjs`
- Task-specific: read back the five answers against `FR-7`…`FR-19` one at a time and confirm each
  requirement is either satisfied or explicitly deferred with a reason.

## Assumptions

- None. The open questions above are stated as questions precisely so they are not assumed.

## Risks

- The temptation here is to invent a formula for `FR-10` that sounds principled and has nothing
  behind it. A number that looks derived is worse than one labelled as a guess.
- T-033, T-034 and T-035 cannot honestly start until this lands. Planning them in detail first
  would be planning on sand.

## Outcome

Filled in as the task progresses; overwritten, not appended.

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- Severity · `file:line` · issue · impact · recommendation

## Validation

`team` only — required before `done`, and linted.

- Validated by:
- Date:
