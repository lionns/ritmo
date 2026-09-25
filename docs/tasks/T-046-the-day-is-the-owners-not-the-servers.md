---
id: T-046
title: The day is the owner's, not the server's
status: ready
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Make "today", the week's Monday and every day boundary follow the owner's own time zone rather
  than the runtime's, so a step marked for today is still marked for today at 8pm in Bogotá — which
  on Workers it is not, because Workers runs in UTC.
decisions: [D-030]
implements: [FR-22, FR-14]
---

## Sources

- **The defect, found in production on 2026-09-24 at 22:33 in Bogotá.** The step "Mejorar la UI"
  sits in the database with `marked_for = 2026-09-24`, written correctly that afternoon. At 19:00
  Bogotá it is 00:00 UTC, the server's "today" became 2026-09-25, and the mark vanished from every
  screen. **Every evening at 7pm the owner's day list empties.**
- `core/rules/step.ts:137` — `calendarDateOf(moment)` reads `getFullYear`, `getMonth`, `getDate`:
  the **runtime's** calendar. On the owner's laptop (`D-020`) that was Bogotá; on Workers (`D-033`)
  it is UTC. `D-030` wrote "Monday on the local calendar" meaning the owner's, and the move to
  Workers silently changed what "local" meant.
- Every caller inherits it: `src/pages/api/portfolio.ts:31` and `:54`,
  `src/pages/api/project/[id].ts:59`, `core/rules/entry.ts:61` (which step an entry's minutes go
  to), `core/rules/week.ts:15` and `:20` (the Monday), and `week.ts:18` `weekBounds`, which builds
  `new Date(`${startsOn}T00:00:00`)` — runtime-local midnight, so UTC midnight on Workers.
- `ProjectPanel.astro:242` sends back the date the server rendered, so a mark and its read always
  agree with each other and both disagree with the owner's clock.
- `scripts/check-core-isolation.mjs:67` — `Intl` is not a forbidden global, so the fix can live in
  `core/`.
- Why no gate caught it: the unit suite passes under `TZ=UTC` as well as under Bogotá, because every
  test computes its expectation with the same runtime calendar it is testing. No test ever put the
  runtime and the owner in different zones. `D-033` warned that green gates on Node stop proving
  production; this is that, unnoticed through two reviews.

## Scope

- The owner's IANA time zone stored on their account, **captured automatically from the browser**
  (`Intl.DateTimeFormat().resolvedOptions().timeZone`) — no new screen, no question asked
- `calendarDateOf(moment, timeZone)` with the zone **required**, so no caller can forget it, and
  every caller above passing the owner's zone
- `weekBounds` and anything else that turns a calendar date into an instant, doing it in the owner's
  zone rather than by constructing a runtime-local `Date`
- Until the zone is captured, the current behaviour — never a guessed zone

## Out of Scope

- A setting to choose a zone by hand. Travelling moves the day with you, which is what `D-030`
  already accepted; a picker is a later question if it ever becomes one.
- Rewriting existing rows. A mark is a calendar date and stays one.

## Acceptance Criteria

- [ ] With the runtime in UTC and the owner in `America/Bogota`, at 03:33 UTC on the 25th "today" is
      the **24th**, and a step marked for the 24th appears on `/` and on its project screen
- [ ] The same holds for a zone ahead of UTC — `Asia/Tokyo` at 20:00 UTC is already tomorrow
- [ ] An entry written at 21:00 in Bogotá is attributed to the step marked for that Bogotá day
- [ ] `weekStartsOn` and `isWeekStart` give the owner's Monday, and `weekBounds` covers the owner's
      Monday midnight to the next, including across a DST change in a zone that has one
- [ ] The zone is captured without the owner doing anything, and the first screen after capture is
      already right
- [ ] `calendarDateOf` cannot be called without a zone — the type forbids it
- [ ] The unit suite passes under `TZ=UTC`, the runtime production actually has

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, plus `TZ=UTC npm test` — and at least one test that fails on today's code
  because it sets the runtime and the owner apart. A fix whose tests would also have passed before
  it proves nothing.
- Task-specific: on the deployed Worker, after 19:00 Bogotá, mark a step for today and reload.
  That is the exact failure, and it only reproduces at the hour it happens.

## Assumptions

- The browser's reported zone is the owner's. Someone whose phone and laptop disagree gets the zone
  of whichever device spoke last, which is acceptable for a person rather than a fleet.

## Risks

- Date arithmetic in a named zone without a library is where off-by-one-hour defects live. DST
  boundaries are the test, not an afterthought.
- `T-043` reshapes the owner row for multiple accounts. Land this first: a time zone per account is
  exactly the shape `T-043` needs, and a second person in another country makes this bug worse.

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

- Validated by:
- Date:
