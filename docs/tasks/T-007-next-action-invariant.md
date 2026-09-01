---
id: T-007
title: The next action made real — the invariant enforced, and the path it measures
status: review
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
- Final result: clean `npm ci`; unit 23/23, integration 4/4, isolation, typecheck, build and harness
  records green; reset plus two seeds each printed one open action for all three active projects.
- Decisions recorded: none.
- Follow-up: **back to the Backend Implementer, 2026-09-01.** Fix the Medium and the Low in § Review.
  Every gate is green today, so a red one means the fix broke something. Leave `src/components/` and
  `page-layout.test.ts` alone beyond what the contract forces — `T-006` owns them. The
  `reserve_spend` Low needs the owner to route it first. Then Reviewer, then validation.

## Review

- **Reviewer, `/code-review high`, 2026-09-01.** Independent — written by Codex, reviewed by Claude,
  as `agent-config.md` asks. Record verified rather than read: unit 23/23, integration 4/4, isolation
  and lint green here, and `db:reset` + two seeds each printed all three active projects at one open
  action. Scope held, and the plan's own risk is answered — the count is `COUNT()` in SQL.
- Medium · `adapters/d1/store.ts:205` · `replaceNextAction` drops the batch result, so the UPDATE's
  row count is never checked, and its `WHERE` binds `replacement.ownerId`/`projectId` rather than the
  identity of the action being closed · any caller passing a replacement on a different project gets
  a zero-row UPDATE and a successful INSERT — the original stays open *and* a second open action
  exists, on two different projects, so the `one_open_next_action_per_project` partial index cannot
  catch it. `batch()` is a transaction (verified against Cloudflare's D1 docs, not recalled), but a
  zero-row UPDATE is a successful no-op, not a failure, so nothing rolls back · bind the UPDATE on
  `id` alone and assert `results[0].meta.changes === 1`.
- Low · `core/rules/next-action.ts:45` · the replacement's `createdAt` is the one field the new
  metric depends on and the one field not validated · the natural caller shape `{ ...current, id }`
  copies the closed plan's `createdAt`, so a brand-new plan is born already counting every entry of
  the plan it replaced; the tests only escape it by overriding `createdAt` by hand each time ·
  reject a replacement whose `createdAt` precedes `closedAt`.
- Low · `core/rules/next-action.ts:33` · read-then-write across two round trips · two concurrent closes both pass the `closedAt !== null` check and the loser trips the partial index as a raw `D1_ERROR`, not `NextActionRuleError` — a 500 where a route would map 422 · closed by the Medium above.
- Low · `core/rules/portfolio.ts:62` · `progressSincePlan` excludes `reserve_spend`, but
  `readRecentEntries` has no `kind` filter and the split still counts rows from it · one reserve
  spend moves a quiet project into `En movimiento` and draws a filled mark while `progressSincePlan`
  stays 0 — two contradictory progress numbers in one payload, and `FR-8` says a reserve spend is an
  event, not an advance · pre-existing from `T-005`; this task is where "reserve spend is not
  progress" became a rule, so it needs routing rather than silence. AC left checked: the criterion is
  about the count, and the count is right.
- Low · `test/integration/d1-store.test.ts:96` · removing the `action-now-closed` setup leaves `actionlessProject` with no rows, so `expect(nextAction).toBeNull()` passes trivially · the only coverage that `readOpenNextActions` filters on `closed_at IS NULL` is gone — the distinction this task enforces · seed the closed row via `createNextAction`, as the collision test does.
- Low · `core/rules/portfolio.ts:40` · `readOpenNextActions` and `countProgressSinceOpenNextActions`
  scan `next_actions` with the same predicate on every render · one query returning the action plus
  its count drops a D1 round trip and removes the window where a replace landing between them pairs
  a new action with the old plan's count.
- Cleared on check: `batch` is atomic and ordered UPDATE-before-INSERT; the partial index prevents double-counting; `?? 0` covers a project with no open plan; `occurredAt` is clock-assigned, so the ISO comparison is sound.
- Assessment: changes requested. One Medium and five Low, none of them the metric itself, which is
  correct and proven by an integration test that counts outside the 28-day window. Not fixed here —
  the Reviewer does not write the Implementer's code, which is the whole point of the split.

## Validation

- Validated by:
- Date:
