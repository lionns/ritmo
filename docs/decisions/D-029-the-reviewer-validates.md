# D-029 — The Reviewer validates, and what a finding may become

- Status: accepted
- Date: 2026-09-22
- Supersedes: none — replaces `D-010`'s validation clause; the rest of `D-010` stands
- Tasks: T-037 onward

## Context

`D-010` made the owner the named validator on every task. After thirty tasks they asked to stop
being a gate: waiting on them serialises everything, and the split's point was independence.

## Decision

**The Reviewer validates and closes tasks**, naming itself in `## Validation`. A review ends in one
of four outcomes:

1. **Return to the implementer** — a criterion is unmet, a gate fails, or something that worked
   broke, and the fix is in the task's own files. **One round**; a second time the Reviewer fixes
   it and records that it did.
2. **New task** — the finding is outside scope *and* load-bearing: data loss, exposure, a false
   promise in the spec, or something a later task needs. If a `ready` task covers it, add a
   criterion there instead.
3. **Recorded and closed** — hardening with no reachable failure, style, naming.
4. **Approve.**

**The owner still decides product direction and any number with no evidence behind it.**

## Consequences

- **The channel that caught every UX defect closes.** Every layout and reachability defect here was
  found by the owner looking at a screen, never by a gate or a review; `NFR-1` is a claim about what
  a person reaches, and the suite asserts only document order. The Reviewer hands over a short
  "you'll want to look at this" list, **without blocking the close**.
- A finding becomes a task only when the Reviewer can name what breaks and for whom.
- If open tasks grow while nothing ships, planning stops until something ships.

## References

- `D-010` · `docs/project/agent-config.md`
