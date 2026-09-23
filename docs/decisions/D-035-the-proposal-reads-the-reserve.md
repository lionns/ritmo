# D-035 — The proposal reads the reserve, not the median

- Status: accepted
- Date: 2026-09-22
- Supersedes: D-030 (§2 only; everything else in it stands)
- Tasks: T-034

## Context

`D-030` §2 made `FR-10`'s proposal the median of what was achieved over the last four closed weeks.
A rule for the same requirement already existed in `data-model.md` § Derived values, **confirmed by
the owner on 2026-08-30** with its reasoning recorded. I wrote `D-030` without reading that section
and put my version to the owner as though nothing existed. Codex found the contradiction while
implementing `T-033` and refused to implement either.

## Decision

**The rule confirmed on 2026-08-30 stands, and `D-030` §2 is withdrawn.** Over the last two closed
weeks: reserve untouched in both proposes `target + 1`; exhausted in both proposes `target - 1`;
anything else repeats the target. Never below 1, always editable. It is the better rule, and not
only the older one:

- It reads **whether the reserve was needed**, which `FR-8` made an event precisely so it would
  carry meaning. The median reads volume and ignores the reserve entirely.
- It needs two closed weeks rather than four, so it works from the third week instead of proposing
  nothing for a month — and the owner has zero closed weeks today.
- Its reasoning is recorded, including why a percentage band was rejected: at `target = 3` the
  reserve is 1, so the fraction spent can only be 0 or 1 and the target would oscillate weekly.

## Consequences

- `FR-10` and `data-model.md` § Derived values agree again, and the marker warning against
  implementing either half comes out.
- `T-034` implements this rule. Nothing was built against the median, so nothing is undone.
- The four in `D-030` §2 was mine and had nothing behind it. This one was reasoned and confirmed.

## References

- `D-030` · `FR-8`, `FR-10` · `docs/project/data-model.md` § Derived values
