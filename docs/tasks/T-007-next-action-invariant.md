---
id: T-007
title: The next action made real — the invariant enforced, and the path it measures
status: done
profile: team
harness: 0.8.1
role: Backend Implementer
goal: Make the "exactly one open next action" invariant something the rules enforce rather than
  something the documents assert, and expose the progress a project has made against its open plan,
  so the portfolio row can draw a path that time alone cannot erase.
decisions: [D-002, D-003, D-009]
implements: [FR-6, NFR-7]
---

## Sources

- `docs/project/data-model.md` § NextAction, § Invariants — `createdAt`, `closedAt`, and the line
  "an active project must have exactly one `NextAction` with `closedAt` null"
- `docs/project/requirements.json` — `FR-6`, `FR-20`, `NFR-7` · `research.md` §7
- `docs/project/design-handoff.md` § The Project Row — what the marks mean and what may not decay
- `docs/tasks/T-006-first-loop-front.md` § Review — the two findings this closes, and the front that
  consumes the result · `docs/tasks/T-005-first-loop-back.md` § Scope — the contract this extends

## Scope

- `contracts/portfolio.ts` — `PortfolioNextAction` gains `createdAt`. `PortfolioProject` gains a
  count of progress logged since that moment. *Planner's naming, revisable by the implementer:*
  `progressSincePlan: number`.
- `core/rules/portfolio.ts` — assemble that count. It is **not** the 28-day window: an action open
  for forty days counts the entries of day thirty-five. The 28-day window stays exactly as it is for
  the progress/outstanding split and for the chart.
- `core/ports/store.ts` and `adapters/d1/store.ts` — read what that count needs per project. Count
  in SQL rather than returning rows; the CPU ceiling of `D-001` applies to every render.
- `core/rules/next-action.ts` — closing an active project's next action and opening its replacement
  become one operation, so no sequence of calls can leave an active project without a plan.
- `scripts/seed-local.mjs` — every active project seeded with exactly one open next action. Today it
  seeds four projects and two actions, which the invariant forbids.
- `src/pages/api/portfolio.ts` — map the new fields, nothing more.
- Entries of `kind: "reserve_spend"` are not progress and do not count (`FR-8`: a reserve spend is
  an event, not an advance).

## Out of Scope

- **The screen that writes or closes a next action.** This task makes the rule true; the interface
  for it is a later task, and until it exists the seed is the only writer.
- **The project row's rendering.** `T-006` owns it and consumes this. The cap of four marks is
  presentation and stays in `design-handoff.md` § The Project Row, not here.
- **`FR-20` calibration.** Exposing `createdAt` is what the ratio will later need; computing actual
  against estimate is its own task.
- **Weeks, commitments, reserves and objectives.** Their tables exist and stay untouched.
- **Identity.** Unchanged from `T-005`: the owner is seeded and the endpoints trust the local
  environment.
- **Backfilling history.** Projects whose current plan predates this change count from their
  existing `createdAt`; nothing is rewritten.

## Acceptance Criteria

- [x] WHEN the portfolio is read, THE SYSTEM SHALL expose for each active project the number of
      `progress` entries logged since its open next action was created.
- [x] WHEN a project's open next action was created more than 28 days ago, THE SYSTEM SHALL include
      entries logged before that window in the count, proving the count is not the window.
- [x] WHEN a project has `reserve_spend` entries, THE SYSTEM SHALL NOT count them as progress.
- [x] WHEN a caller closes the open next action of an active project, THE SYSTEM SHALL open its
      replacement in the same operation, and SHALL leave no state in which an active project has no
      open next action.
- [x] WHEN `npm run seed` completes, every active project SHALL have exactly one open next action,
      checkable by a query the seed prints or a test asserts.
- [x] The progress/outstanding split and the chart SHALL keep using the 28-day window, so `AC-G1`
      and the chart's 28/14 marks are unchanged.
- [x] `PortfolioNextAction.createdAt` is present and typed, and `npm run check:core` stays green.
- [x] All five gates stay green from a clean `npm ci`.

## Verification

- Baseline: the five gates of `quality-gates.md`, then `node scripts/harness-lint.mjs`.
- Final: the same, plus `node scripts/harness-status.mjs`.
- Task-specific: an integration test against local D1 seeding a project whose action opened 40 days
  ago with an entry at day 35, asserting the count includes it while `recentEntries` does not.
- Task-specific: `npm run db:reset && npm run seed`, then assert every active project has exactly
  one row in `next_actions` with `closed_at` null.

## Assumptions

- **`T-006` consumes this and is not edited here.** The row keeps rendering `recentEntries.length`
  until `T-006` is updated to read the new count; that update belongs to `T-006`, which is still in
  `review`. Rests on `T-006` § Assumptions, which says the reverse of the same rule.
- **The 28-day window is right for recency and wrong for the path.** `AC-G1` orders by what moved
  recently, which is a recency question; the marks show a path, which is not. Rests on
  `design-handoff.md` § The Project Row and `research.md` §7.
- **Closing a plan without a replacement is not a real use case.** It follows from the owner's
  2026-09-01 reading of the invariant: without a task list, the next action is the only thing that
  says what to do, so a project without one is a project you cannot act on.

## Risks

- **The contract changes while `T-006` is in review.** Anything reading `PortfolioNextAction` must
  be re-checked; `T-006`'s gates have to be re-run after this lands, not before.
- **An old open plan can span a lot of entries.** Counting in SQL rather than returning rows is what
  keeps this inside the `D-001` ceiling; a `.length` on a returned array would pass the tests and
  fail in a year.
- **Making close-and-replace atomic changes an existing rule's signature.** `closeNextAction` has no
  caller today beyond tests, which is exactly why now is the cheap moment.

## Outcome

- Changes: portfolio exposes `createdAt` and SQL-counted `progressSincePlan`; next-action replacement
  is one D1 transaction; the representative seed satisfies and prints the invariant.
- Files: 11 implementation/test files, this task record, its trace and generated `STATUS.md`.
- Baseline result: clean `npm ci`; unit 23/23, isolation, harness lint, typecheck and build green.
- Final result: clean `npm ci`; unit 25/25, integration 4/4, isolation, typecheck, build and harness
  records green; reset plus two seeds each printed one open action for all three active projects.
- Decisions recorded: none.
- Follow-up: `T-006` switches the row's marks from `recentEntries.length` to `progressSincePlan`,
  which is what stops them decaying. One item stays open and is the owner's to route: the
  progress/outstanding split still counts `reserve_spend` rows, so a reserve spend moves a project
  into `En movimiento` while the count stays at zero (`FR-8`).

## Review

- **Round 1, `/code-review high`, 2026-09-01.** Independent — written by Codex, reviewed by Claude,
  as `agent-config.md` asks. One Medium and five Low; full text in `bc739f7`. Medium:
  `replaceNextAction` discarded the batch result and bound the *replacement's* owner and project in
  the closing `UPDATE`, so a cross-project replacement produced a zero-row close and a successful
  insert — two open actions on two projects, where the partial index cannot see them.
- **Round 2, 2026-09-01. All six resolved or routed; verified here, not read.**
- Medium · closed · the `INSERT` became `SELECT … WHERE changes() = 1` and the port returns a
  boolean the rule now raises on. Proven against real D1: the new integration case replays the
  cross-project close and gets `false`, the original still open, the replacement row absent.
- Low · `createdAt` not validated · closed · a replacement opening before the close is rejected, so
  a new plan can no longer inherit its predecessor's count. Unit-covered.
- Low · raw `D1_ERROR` on a concurrent close · closed by the same guard — the loser now gets
  `NextActionRuleError`, and the unique index is never reached. Fault-injected in the unit suite.
- Low · duplicate scan of `next_actions` · closed · one `readOpenNextActionsWithProgress` returns
  the action and its count together, removing the round trip and the window where the two disagreed.
  The two superseded port methods are gone, with no callers left behind.
- Low · integration assertion passing trivially · closed · the closed-action row is seeded again, so
  `readOpenNextActions` filtering on `closed_at IS NULL` is proven rather than assumed.
- Low · `reserve_spend` counted by the split but not by the count · **open, and correctly not
  coded** — it predates this task and the owner has it. Two progress numbers still disagree in one
  payload; `FR-8` is the reason it matters.
- Nit, no action asked · `next-action.ts:66` reports "already closed" for a replace miss whose real
  cause may be a mismatched replacement. Unreachable through the rule, which validates first.
- Nit, no action asked · `store.ts:234` — `WHERE changes() = 1` is correct only because both
  statements share one batch and one connection. The implementer's trace records retrieving that
  contract; a comment beside it would keep the next reader from splitting the batch.
- Verification re-run: unit 25/25, integration 4/4, isolation, typecheck, build, lint clean, and
  `db:reset` + two seeds each printing all three active projects at one open action.
- Assessment: **recommended for owner validation.** Nothing above a nit remains in the code. The one
  open item is a routing decision, not a defect, and it is yours.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-01
