# Project Brief

## Objective

Ritmo is a single-user web application for keeping honest track of progress across every commitment
in one life — professional projects, work at a fixed job, study, personal objectives, people, and
trips — without becoming another calendar to fall behind on. It replaces scheduling with logging:
the daily act is recording what actually moved, and the system adapts the following week's targets
to the capacity the record shows. It works when the owner can open it after a bad week and still see
accumulated progress rather than accumulated debt, and therefore keeps opening it.

## Users

- **Primary:** the owner — one person carrying many simultaneous projects and long-horizon personal
  goals, with a fixed job that makes available time uneven and partly unpredictable. Has repeatedly
  built detailed plans, calendars, and meeting structures, and has repeatedly abandoned them once
  the gap between plan and reality became visible. Needs to see that work is advancing across a
  portfolio, and to decide what deserves attention on a day whose shape was not knowable in advance.
- **Secondary:** none. Ritmo is not multi-tenant and has no collaboration surface.

## Scope

### In Scope

- **Life portfolio.** Areas → objectives → projects, spanning professional, personal, study, and
  travel. One structure for all of them; no separate "work" and "life" modes. The fixed job is an
  area like any other, with **its own quota and no cap** — its hours are already bounded from
  outside, and it must never compete for the slots meant for everything else.
- **Objectives carry no target.** An objective stores a horizon, a type, and a short "why this is
  mine" — no target, no schedule, no reserve. Every target lives on a short-horizon project beneath
  it. An objective's state is derived: whether a live project sits under it, and when it was last
  touched. With nothing active under it for four weeks it reads as `dormant`, offering shelve or
  revive, in neutral language. This keeps the weeks-long evidence at the horizon it was tested on.
  (§10, §13, §15, §18)
- **Progress log.** The central write path: a timestamped entry against a project or objective —
  what happened, optional effort, optional note. Cheap enough to use in seconds. (`research.md` §3)
- **One entry, two goals.** An entry may additionally credit an objective in another area: work done
  in the fixed job on Docker, servers, or AI counts toward a learning objective. This is inter-goal
  facilitation, and it is the only mechanism in the design that creates time rather than spending
  it. (§11)
- **Next action per active project.** Exactly one, written in if–then form with an optional obstacle
  field. (§5, §6)
- **Flexible weekly commitments.** Frequency or volume over a week, expressed as `target + reserve`.
  The reserve is automatic — `ceil(0.30 × target)`, minimum 1 — and the adaptive proposal tunes it
  from how much of it gets spent. Spending a reserve is a recorded, unpunished event, never a
  silently decremented counter. Never a recurring clock slot. (§2, §8, §9)
- **Inferred capacity, labelled at close.** Capacity is inferred from the log and never blocks
  anything. The authoritative correction is a `light` / `normal` / `heavy` label applied
  retroactively at weekly close, when the week is known rather than guessed. No flow asks the owner
  to describe a bad day while having one. A week closed without a label still trains on inference.
  (§9, §17)
- **Adaptive weekly proposal.** Next week's targets derived from logged history, not from a target
  set once, and always editable. What was proposed is retained beside what the owner accepted: cutting
  the proposal week after week is the only evidence that the model reads capacity too high, and
  without it the system would look calibrated while it is not. Internal signal — never rendered as a
  comparison the owner has to answer for. (§9, §14)
- **Weekly close and review.** Three fields, two of them optional: the capacity label, what took the
  week, and a short written reflection. The week ends and the next opens clean, with no rollover of
  missed work as debt. (§16, §17)
- **Week attribution.** At close, one optional tap names what took the week, from tags the owner
  defines (work, leisure, the unexpected, people, health). **No hours, no percentages, no per-entry
  leisure logging.** The picture is the pattern across roughly eight weeks — "six of the last eight
  went the same way" — which the owner sees only because they named it. Its guardrails are in
  Constraints and are not optional. (§14, §15)
- **Portfolio and progress views.** Accumulated progress first, remaining second; consistency shown
  as a period ratio. (§4, §19)
- **Shelving, an active cap, and weekly rotation.** `Active` means the owner commits to touching it
  every week, so the cap is whatever fits a *bad* week, not an average one. Ritmo asks for that
  number at first setup rather than shipping a constant, then audits it against **stale rate** — the
  share of active projects with zero entries in a period. What is active can be changed **every
  Monday, at no cost, and is fixed within the week**: a seven-day commitment, not a permanent one,
  which is what keeps the shelf a queue instead of a graveyard while the cap still bites. Shelving is
  reversible, carries no penalty language, and shelved items stay visible in the portfolio. The
  first-run choice is presented without softening — seeing the real number of unfinished things is
  itself the information. (§11, §12)
- **Externally imposed deadlines.** A project may carry a hard date *only when the owner did not set
  it* — a wedding, a flight, a visa window. It orders priority and protects the project's slot. It
  never schedules hours and never generates a reminder. Self-imposed dates remain forbidden. (§1)
- **Objective typing.** An objective is `learning` or `outcome`, and is measured accordingly. (§18)
- **Full export.** The owner can download their entire database as a SQLite file at any time. This
  is the condition the privacy reversal rests on: the data lives on Cloudflare, but the owner always
  holds a complete copy, so losing account access never means losing the record. (`D-005`, FR-21)
- **Estimate calibration.** An estimate is captured on each next action — which is exactly the "next
  stretch" §10 says to decompose, so no subtask tree is needed. The actual is *derived* from the
  effort logged on that project while the action was open, rather than typed a second time, and the
  ratio comes back as a personal calibration signal, never as a failure. (§10)

### Out of Scope

- **A calendar grid, time blocks, or start times.** Ritmo never asks when in the day something will
  happen. It integrates with no calendar and creates no events. (§1)
- **Consecutive-day streaks** and any counter a single miss can zero. (§7)
- **Points, badges, levels, leaderboards, or any extrinsic reward layer.** (§14)
- **Meeting or appointment management**, including the fixed job's meetings.
- **Multi-user features:** accounts for others, sharing, teams, permissions, comments. None are
  built. The data model must nonetheless keep them addable — see Constraints.
- **Time tracking as billing or timesheets.** Effort is logged for calibration only.
- **Task management for its own sake:** subtask trees, dependencies, Gantt charts, kanban boards.
- **Native mobile applications.** Web, responsive, in this phase.
- **Notifications that chase the owner** — push, email nags, or "you missed X" prompts. (§15)
- **Counting leisure hours.** Ritmo never records how long anything outside a project took, and never
  computes a gap between hours available and hours logged. Counting hours is where guilt lives; the
  week-attribution tag deliberately names a cause without quantifying it.
- **A people or relationships area with objectives of its own.** Time with friends matters, but a
  project for it would be heavier than the thing it tracks. The week-attribution tag covers it.
- **Any cap on the fixed-job area.** The owner does not choose how much work there is.
- **AI-generated plans presented as authority.** Any derived proposal is a proposal the owner edits.

## Constraints

- **Single user, on managed infrastructure — a recorded reversal.** The data is a full record of one
  person's life, and it now lives on Cloudflare rather than on infrastructure the owner controls.
  This constraint always permitted that "with an explicit decision"; `D-005` is that decision, taken
  for zero cost and zero recurring maintenance. What is ceded is control over access, not security:
  a VPS patched in uneven time would have been more exposed, not less. Cloudflare holds the keys and
  can technically read the data. The condition attached is that the owner is never locked in.
- **Web application, responsive.** Usable one-handed on a phone browser, because most logging will
  happen away from a desk.
- **Logging must cost seconds, not minutes.** Any flow that makes recording progress slower than
  planning it is a defect, not a feature.
- **Evidence-bound design.** A behavior that contradicts a rule in `research.md` requires a decision
  file that names the finding it overrides and why. Product intuition does not silently win.
- **Fast first render on a phone.** The portfolio must open quickly on a mobile browser. Offline
  reads are *not* required — narrowed when the interface was settled as server-rendered HTML
  (`D-007`), a loss taken deliberately: Ritmo does not work without a connection.
- **Built and maintained by one person with agent assistance**, in uneven time — which is itself an
  argument for a small surface area and a boring stack.
- **No third-party analytics or telemetry.**
- **Guardrails on week attribution.** The feature is the closest Ritmo comes to the guilt accounting
  the evidence rejects, so three rules bind it: it appears **only in the weekly close**, never on the
  landing surface · it is **never rendered in red and never accumulated as a debt across weeks** ·
  and the word "lost" is never used. A week closed without a tag is as complete as one with it.
- **Single owner today, extensible tomorrow.** *Owner's call, against the recommendation to close
  this permanently.* Sharing is not built, but the data model must not assume a single owner so
  deeply that adding a second party later means a migration: ownership is modelled explicitly even
  while there is exactly one owner. This buys optionality at the cost of complexity now, and it
  constrains the `identity` and `boundaries` foundation decisions — neither may assume one owner
  forever.

## Success Measures

- The owner logs progress in **at least 4 of any 6 consecutive weeks**, sustained past week 12 —
  the point where previous systems were abandoned.
- **Median time from opening the app to a saved progress entry is under 20 seconds.**
- After a week where a commitment was missed, the owner returns and logs again the following week in
  the large majority of cases — the "what the hell" collapse does not occur. (§7, §8)
- **Every active project has a current next action** at the end of each weekly close.
- Active projects stay at or under the WIP cap without the cap being raised to accommodate drift.
- At six months, the owner can point to objectives outside paid work — a trip, a course, a personal
  project — that measurably advanced, and to shelved ones shelved deliberately rather than dropped.
- The owner describes opening Ritmo as neutral-to-positive, not as an accounting of failure. Tracked
  by a one-question weekly check recorded in the review.

## Open Questions

Blocking task one — the foundation:

- **Deployment and data ownership.** Self-hosted, private cloud, or local-first with sync? Decides
  the `deploy`, `data`, and `identity` foundation topics and constrains the whole stack.
- **Stack.** Unsettled. `runtime`, `data`, `boundaries`, `identity`, `deploy`, `tests`, and
  `interface` are all open and must each be settled by an accepted decision before task one.

Still open, but not blocking:

- **Is an objective required between an area and a project?** The brief says areas → objectives →
  projects, but a fixed-job project such as a server migration has no objective above it. Surfaced by
  drawing the structure, not by writing it. Decides whether `Project.objectiveId` is nullable.
- **The reserve tuning band.** `research.md` §8 establishes that reserves work, not the ratio. The
  starting reserve is settled above; the spend range at which the adaptive proposal should move the
  target has not been chosen, and no value for it is assumed anywhere.
- **Is the estimate on a next action required or optional?** The field exists now; whether writing an
  action without one is allowed is a use question. §10 notes the benefit of decomposing fades on easy
  or distant work, which argues for optional.

Settled by the owner and recorded in Scope and Constraints above rather than in `docs/decisions/`:
objectives carry no target; capacity is inferred and labelled at close; reserves default to 30% of
target; the active cap is asked for at setup and audited by stale rate; sharing stays unbuilt but
must remain addable without a migration (2026-08-28). The estimate lives on the next action and the
actual is derived from its open window; the proposed target is retained beside the accepted one
(2026-08-29).
