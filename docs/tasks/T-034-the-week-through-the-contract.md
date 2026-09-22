---
id: T-034
title: The week through the contract — the close, the proposal, and the tag
status: ready
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Put the week behind contracts and API routes, including the one piece the model deliberately
  left out — deriving next week's targets from logged history and keeping what was proposed beside
  what the owner accepted, so the proposal can be judged later instead of trusted now.
decisions: []
implements: [FR-10, FR-11, FR-12]
---

## Sources

- **T-032's accepted decision** for the derivation in `FR-10`, and **T-033** for the model it
  reads. Neither can be worked around here.
- `contracts/portfolio.ts` and `contracts/capture.ts` — the shape contracts take in this repository
- `src/pages/api/project/[id].ts` — how a route validates, calls a rule, and answers
- `core/rules/calibration.ts` — the product's existing example of a signal with no evidence behind
  its constants, and of stating so in the file rather than in a commit message
- `migrations/0001_initial_schema.sql` — the `tags` table, which `FR-12` finally uses

## Scope

- `contracts/week.ts` — the week, its commitments, the close, and the proposal
- Routes for reading the current week, closing it, defining a tag, and spending a reserve
- `FR-10`'s derivation: next week's targets computed from logged history, returned as an
  **editable proposal**, with both the proposed value and the accepted value stored
- `FR-12`'s tag: one optional tag at close, from tags the owner defines, and the pattern across
  roughly eight weeks — **with no duration recorded anywhere**

## Out of Scope

- Any screen — T-035
- Suggesting a tag, ranking tags, or counting how often each appears in a way the owner sees as a
  score. `NFR-7` forbids the evaluative layer and `NFR-8` forbids the word "lost".

## Acceptance Criteria

- [ ] The close accepts three fields of which two are optional, and a week closed with only the
      capacity label is as complete as one closed with all three (`FR-11`, `NFR-8`)
- [ ] Next week's targets arrive as a proposal the owner can edit, and both numbers survive the
      edit — what was proposed and what was accepted (`FR-10`)
- [ ] The proposal is never presented as a target already set. A route that returns it says it is
      a proposal.
- [ ] A tag can be defined, attached at close, and read back across eight weeks, and **no duration
      is stored against it** (`FR-12`)
- [ ] Every route validates its input at the boundary and answers a bad request with a message a
      screen can show the owner, in the pattern `src/pages/api/` already uses

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, all green
- Task-specific: probe each route with `curl` against a throwaway `RITMO_DB_PATH` seeded with
  several weeks of entries, and read the proposal back by hand. A derivation that compiles and
  returns a plausible-looking number is exactly the kind of defect the gates cannot see.
- Task-specific: close a week with missing work and confirm the next week's proposal does not
  quietly include it. `FR-19` forbids debt; a derivation from history is the obvious place for
  debt to reappear wearing a different name.

## Assumptions

- T-032 answered how the derivation works. If it did not, this task stops rather than inventing
  one, per `NFR-10`.

## Risks

- `FR-10` is the requirement most likely to produce a number that looks authoritative and is not.
  Retaining the proposal beside the acceptance is the requirement's own defence against that, and
  is the part most likely to be dropped as an implementation detail. It is not one.

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
