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

1. **Where a week begins** — answered above. What remains is what happens to an entry logged at
   00:30 on Monday about Sunday's work.
2. **What a commitment is attached to** — answered above: the project. What remains is `FR-15`,
   where the fixed job's projects have their own quota and never compete for the active cap.
3. **How `FR-10` derives next week's targets** — answered above. What remains is what the median
   does with fewer than 4 closed weeks, which is where the product is today.
4. **A week the owner never closes** — answered above: it closes itself, unlabelled.
5. **Whether a new week opens by itself** — answered by (4): it does, in the same movement.

## The owner's answers, 2026-09-22

Recorded verbatim in effect, before the decision is drafted. Each number here is a starting value
chosen by the Planner and accepted by the owner, not a value evidence produced — the decision must
say so, as `core/rules/calibration.ts` does for its own two constants.

1. **A week begins Monday on the local calendar**, matching `calendarDateOf` in
   `core/rules/step.ts`, so the product keeps one idea of what day it is.
2. **A commitment hangs off a project.** Each active project carries its own weekly target and
   reserve, which is the shape `commitments` already has in `0001_initial_schema.sql`. `FR-15`'s
   fixed-job quota still needs an answer inside this shape.
3. **The proposal is the median of what was achieved over the last 4 closed weeks.** The 4 is the
   Planner's number with nothing behind it.
4. **A week nobody closes closes itself on Monday, with no capacity label, no tag and no
   reflection**, and the next opens in the same movement. `NFR-8` already holds that a week closed
   without a tag is as complete as one with it, so nothing is left incomplete and nothing asks the
   owner to catch up — which is what `FR-19` forbids.
5. **A commitment is a frequency or a volume, chosen per commitment**, as `FR-7` says. The
   derivation in (3) must therefore work on both.

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
