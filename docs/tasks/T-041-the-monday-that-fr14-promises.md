---
id: T-041
title: The Monday FR-14 promises, and the message that already claims it
status: done
profile: team
harness: 0.9.0
role: Backend Implementer
goal: Make `changeProjectState` refuse only *within* a week and allow the rotation on Monday, so
  `FR-14`'s "changeable every Monday at no cost" is true, and so the message the screen already
  shows the owner stops promising something the rule does not do.
decisions: []
implements: [FR-14]
---

## Sources

- `docs/project/requirements.json` — `FR-14`: "changeable **every Monday at no cost** and fixed
  within the week". The first half has never been implemented.
- `core/rules/project.ts:175` — `if (await store.hasClosedWeek(ownerId)) throw`. Any closed week
  anywhere refuses every state change, on Monday as much as on Thursday.
- `src/components/molecules/ProjectMenu.astro:125` — already translates that refusal to "Lo activo
  se cambia los lunes. Esta semana ya está en marcha." **The copy is a promise the rule breaks.**
- `D-030` — a week starts Monday on the local calendar, via `calendarDateOf`
- `core/rules/week.ts` — `weekStartsOn`, which T-033 built and which is how "is it Monday" is
  answered without a platform global in `core/`
- Found by Codex while implementing T-033, which made the refusal reachable for the first time.

## Scope

- The Monday exception in `changeProjectState`, expressed through the week rules rather than a
  date comparison invented here
- Whatever the rule needs from the port to know the current week
- Unit tests for the three cases: Monday, mid-week, and no week ever closed

## Out of Scope

- The screen. `ProjectMenu.astro`'s copy becomes true by this change; if it still reads wrong
  afterwards, that is T-035's.
- Widening or narrowing the cap rules. `FR-15` and the active cap are untouched.

## Acceptance Criteria

- [x] On a Monday, an active project can be shelved and a shelved one activated, with a closed week
      in the database — the case `FR-14` guarantees and the product refuses today
- [x] On any other day of the week, the refusal stands and carries the same message the screen
      already translates
- [x] With no closed week, behaviour is unchanged — the product before any week exists still
      rotates freely
- [x] "Is it Monday" is answered by `core/rules/week.ts` on the local calendar, not by a second
      definition of the week living in `project.ts`
- [x] `npm run check:core` stays clean

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, all green
- Task-specific: run the unit tests under at least two timezones, one of them with DST, as T-033's
  week tests already do. A Monday that is only Monday in UTC is not a Monday.
- Task-specific: probe the API against a throwaway `RITMO_DB_PATH` holding a closed week, with the
  clock on a Monday and on a Wednesday, and read what the endpoint returns in each case.

## Assumptions

- `FR-14`'s "at no cost" means no penalty and no ceremony, not a separate confirmation step.

## Risks

- The rule currently refuses more than the requirement asks, which is the safe direction to be
  wrong in. Loosening it is the direction where a mistake lets the owner churn the active set
  mid-week — which is the behaviour `FR-14` exists to prevent.

## Outcome

- Changes: `week.ts` answers whether the local date starts the week using `weekStartsOn`;
  `changeProjectState` receives a Clock and allows Monday rotation after a closed week.
  The mutation handler passes the runtime clock and accepts an injected clock for verification.
- Files: core rules `project.ts`/`week.ts`, API `projects.ts`, core project tests, SQLite integration
  tests, task, trace, journal and generated STATUS (9 files).
- Baseline result: unit 63/63, integration 36/36, isolation, harness lint, typecheck, build green.
- Final result: unit 67/67, integration 36/36, isolation, typecheck, build, harness lint green;
  3 pre-existing typecheck hints. Full unit suite also passes under America/Bogota and
  America/New_York, including local midnight and Mondays following both DST transitions.
- API probe: runtimeStore used a throwaway RITMO_DB_PATH with a closed week. Monday archive
  and activate returned 200 with the persisted requested state; Wednesday archive returned
  422 and the unchanged “Project state changes belong to a week boundary” message.
- Decisions recorded: none. D-030's local Monday applies; no new Store query is necessary.
- Follow-up: independent Reviewer validation per D-029. No migration or live data changes.

## Review

Reviewer: Claude Code, on work it did not write.

- No findings. Three lines of rule, one helper, one signature threaded through the route; the
  smallest change that makes `FR-14` true.
- Note · `isWeekStart` delegates to `weekStartsOn` rather than comparing `getDay()`, so there is
  still one definition of the week and it stays on the local calendar. That was the criterion most
  likely to be met with a quick `=== 1` and it was not.
- Note · I verified the rule and the clock, not the screen. `ProjectMenu.astro:125`'s copy — "Lo
  activo se cambia los lunes" — is now true for the first time, and nobody has seen it be true.

Verified independently: five gates green (unit 67/67, integration 36/36, isolation, typecheck 0
errors, build, lint clean); `isWeekStart` correct across the whole of Monday from 00:00:01 to
23:59:59, on Sunday and Tuesday, and on the Monday after a DST change, in `America/Bogota`,
`Europe/Madrid` and `Pacific/Kiritimati`.

Approved.

## Validation

- Validated by: pending independent Reviewer (D-029).
- Date: pending
