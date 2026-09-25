---
id: T-046
title: The day is the owner's, not the server's
status: done
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

- [x] With the runtime in UTC and the owner in `America/Bogota`, at 03:33 UTC on the 25th "today" is
      the **24th**, and a step marked for the 24th appears on `/` and on its project screen
- [x] The same holds for a zone ahead of UTC — `Asia/Tokyo` at 20:00 UTC is already tomorrow
- [x] An entry written at 21:00 in Bogotá is attributed to the step marked for that Bogotá day
- [x] `weekStartsOn` and `isWeekStart` give the owner's Monday, and `weekBounds` covers the owner's
      Monday midnight to the next, including across a DST change in a zone that has one
- [x] The zone is captured without the owner doing anything, and the first screen after capture is
      already right
- [x] `calendarDateOf` cannot be called without a zone — the type forbids it
- [x] The unit suite passes under `TZ=UTC`, the runtime production actually has

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

- Changes: the owner record stores an optional IANA time zone, captured and refreshed from the
  browser; calendar-date, week-start and week-bound calculations use it, falling back to the
  runtime's existing zone until capture.
- Files: core owner/store and date rules, SQLite/libSQL adapters, setup and time-zone API, browser
  shell, integration/unit/manual fixtures, migration 0008, this task, trace and journal.
- Baseline result: unit 67/67, integration 120/120, core isolation, typecheck, Node/Worker builds,
  and harness lint passed before implementation.
- Final local result: `TZ=UTC npm test` 74/74; `npm test` 74/74; integration 120/120 with `sqld`;
  core isolation clean; typecheck 0 errors (3 existing hints); both builds passed; harness lint
  clean. One integration run without `sqld` skipped required libSQL/export cases and exposed old
  positional owner fixtures; those fixtures now name their columns. The complete integration gate
  then passed.
- Deployed result: Worker version `3d1920ae-32d4-4a0c-8eb0-39f6cad8e1f7` on
  `ritmo.cosmiqstudio.com`; HTTPS redirect/HSTS, protected-route matrix, authenticated screens and
  exported SQLite comparison passed. The owner confirmed the T-040 export was copied and verified
  on an external device before release checks.
- Task-specific result: at 23:00 Bogotá, the browser-zone endpoint stored `America/Bogota`; the
  portfolio returned `today = 2026-09-24`. A step marked for that day remained visible after fresh
  portfolio and project-screen requests; both screens returned 200.
- Decisions recorded: none; D-030 governs owner-local Mondays.
- Follow-up: none.

## Review

Reviewer: Claude Code, on work it did not write. **The implementer had marked this `done` and
validated it itself**; `D-029` gives validation to the Reviewer and `D-010` separates author from
judge. The work stands on its own — the record did not, and is corrected here.

- **The regression test discriminates, proven rather than assumed.** The new test imports helpers
  the old code lacks, so run as-is it would fail on the import and prove nothing. Isolated to
  `calendarDateOf` alone under `TZ=UTC`: the old code fails 3 of 4 — it returns **2026-09-25** at
  22:33 Bogotá, the exact production defect — and the new code passes all four, including one
  minute either side of Bogotá's midnight.
- **Weeks hold with the runtime in UTC.** Bogotá's week starts at 05:00 UTC; a Madrid week across
  the DST change measures 169 hours; and Sunday 22:00 in Bogotá is no longer Monday — under the old
  code it was, which would have opened `T-041`'s Monday exception at 7pm on Sunday.
- Production checked from the database, not the trace: `owners.time_zone = America/Bogota`,
  migration 0008 applied, and the owner's step marked for the 24th intact. `/api/time-zone` refuses
  401 without a session and the stored zone does not move.
- Low · `src/layouts/AppShell.astro` · every page view posts the zone, including before sign-in,
  where it is refused 401 and ignored. One request per view for one person; recorded, not returned.

Gates: `npm test` and **`TZ=UTC npm test`** 74/74, isolation, types, both builds, integration
120/120 with `sqld`. Approved.

## Validation

- Validated by: Claude Code, as Reviewer (`D-029`)
- Date: 2026-09-24
