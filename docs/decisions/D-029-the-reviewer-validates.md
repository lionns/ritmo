# D-029 — The Reviewer validates, and what a finding may become

- Status: accepted
- Date: 2026-09-22
- Supersedes: none — replaces `D-010`'s validation clause, which stands otherwise
- Tasks: T-037 onward

## Context

`D-010` made the owner the named validator on every task, without exception. After thirty tasks the
owner asked to stop being a gate: waiting on them serialises everything, and the point of the split
was independence between author and judge, not a queue.

## Decision

**The Reviewer validates and closes tasks.** Claude Code names itself in `## Validation`. A review
ends in exactly one of four outcomes:

1. **Return to the implementer** — a criterion is unmet, a gate fails, or the change broke
   something that worked, and the fix is in the files the task touched. **One round.** If the same
   thing returns wrong twice, the Reviewer fixes it and records that it did.
2. **New task** — the finding is outside this task's scope *and* load-bearing: data loss, exposure,
   a promise in the spec that is false, or something a later task depends on. If a `ready` task
   already covers it, add a criterion there instead.
3. **Recorded and closed** — hardening with no reachable failure path, style, naming, a nicer
   abstraction, anything with no concrete failure behind it. It lives in `## Review` and dies there.
4. **Approve.**

**The owner still decides product direction and any number with no evidence behind it.** Those are
decisions, not reviews, and no agent may take them.

## Consequences

- **The channel that caught every UX defect closes.** Every layout and reachability defect here was
  found by the owner looking at a screen — never by a gate, never by a review. `NFR-1` is a claim
  about what a person reaches; the suite can only assert document order. The Reviewer therefore
  hands over a short "you'll want to look at this" list for anything visible, **without blocking the
  close**. A notice, not a gate, and weaker than what it replaces.
- A finding becomes a task only when the Reviewer can name what breaks and for whom.
- If open tasks grow while nothing ships, planning stops until something ships.
- `D-010`'s split stands: whoever writes the code does not judge it.

## References

- `D-010` · `docs/project/agent-config.md` · `docs/sdd/ROLES.md` § Reviewer
