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

- **Life portfolio.** Areas → objectives → projects, spanning professional, personal, study,
  relationships, and travel. One structure for all of them; no separate "work" and "life" modes.
- **Objectives carry no target.** An objective stores a horizon, a type, and a short "why this is
  mine" — no target, no schedule, no reserve. Every target lives on a short-horizon project beneath
  it. An objective's state is derived: whether a live project sits under it, and when it was last
  touched. With nothing active under it for four weeks it reads as `dormant`, offering shelve or
  revive, in neutral language. This keeps the weeks-long evidence at the horizon it was tested on.
  (§10, §13, §15, §18)
- **Progress log.** The central write path: a timestamped entry against a project or objective —
  what happened, optional effort, optional note. Cheap enough to use in seconds. (`research.md` §3)
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
  set once. (§9)
- **Weekly close and review.** A short written reflection; the week ends and the next opens clean,
  with no rollover of missed work as debt. (§16, §17)
- **Portfolio and progress views.** Accumulated progress first, remaining second; consistency shown
  as a period ratio. (§4, §19)
- **Shelving and an active cap.** `Active` means the owner commits to touching it every week, so
  the cap is whatever fits a *bad* week, not an average one. Ritmo asks for that number at first
  setup rather than shipping a constant, then audits it against **stale rate** — the share of active
  projects with zero entries in a period. Shelving is reversible, carries no penalty language, and
  shelved items stay visible in the portfolio. (§11, §12)
- **Objective typing.** An objective is `learning` or `outcome`, and is measured accordingly. (§18)
- **Estimate calibration.** Estimated vs. actual captured on decomposed work and fed back as a
  personal calibration signal. (§10)

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
- **AI-generated plans presented as authority.** Any derived proposal is a proposal the owner edits.

## Constraints

- **Single user, self-hosted or privately deployed.** The data is a full record of one person's life;
  it does not leave infrastructure the owner controls without an explicit decision.
- **Web application, responsive.** Usable one-handed on a phone browser, because most logging will
  happen away from a desk.
- **Logging must cost seconds, not minutes.** Any flow that makes recording progress slower than
  planning it is a defect, not a feature.
- **Evidence-bound design.** A behavior that contradicts a rule in `research.md` requires a decision
  file that names the finding it overrides and why. Product intuition does not silently win.
- **Offline-tolerant reads at minimum**; the portfolio must open without a round trip being fast.
- **Built and maintained by one person with agent assistance**, in uneven time — which is itself an
  argument for a small surface area and a boring stack.
- **No third-party analytics or telemetry.**
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

- **The reserve tuning band.** `research.md` §8 establishes that reserves work, not the ratio. The
  starting reserve is settled above; the spend range at which the adaptive proposal should move the
  target has not been chosen, and no value for it is assumed anywhere.
- **Do estimates get captured on every decomposed item, or only where the owner asks?** §10 says
  decomposition helps and that its benefit fades on easy or distant items; where the line sits is
  a use question, not a design-time one.

Settled by the owner on 2026-08-28, recorded in Scope and Constraints above rather than in
`docs/decisions/`: objectives carry no target; capacity is inferred and labelled at close; reserves
default to 30% of target; the active cap is asked for at setup and audited by stale rate; and
sharing stays unbuilt but must remain addable without a migration.
