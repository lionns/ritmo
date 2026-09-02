# D-017 — `src/lib/` is front, and the check has to be able to say so

- Status: accepted
- Date: 2026-09-01
- Supersedes: D-009
- Tasks: T-009
- Foundation: boundaries

## Context

`D-009` named the front as "`.astro` routes and components", and `scripts/check-core-isolation.mjs`
mirrors that wording exactly. The project has since grown a third kind of front file: plain `.ts`
under `src/lib/`, presentation logic lifted out of components so `node --test` can reach it without
a DOM — `project-row.ts` in `T-006`, `entry-form.ts` in `T-008`. Neither the decision, nor the
check, nor `architecture.md` names that directory, so a file there may import an adapter and
`npm run check:core` still reports clean. Mutation-probed in the `T-008` review: the identical
import fails under `src/components/` and passes under `src/lib/`.

## Decision

Everything in `D-009` carries forward unchanged, plus: **`src/lib/` is front.** Plain `.ts` modules
under `src/` outside `pages/api/` may import `contracts/` and each other, and nothing else — the
same rule the templates already live under, stated for the front files that are not templates. A
rule the check cannot see is not a boundary, so `npm run check:core` is what makes it one.

## Consequences

- No page can reach data by routing through a helper, which is the hole `D-009` existed to close.
- Nothing about the two existing files changes: both already import only `contracts/` and each
  other. Verified before deciding — widening the rule leaves the baseline green.
- `D-009`'s citations now point at a superseded decision. Accepted as the cost: `TEMPLATES.md`
  makes an accepted decision immutable, so amending it in place was not available.
- The enforcement lands with `T-009`, not with this file. Until it does, `architecture.md` must not
  claim the row is enforced — that over-claim is the defect that produced this decision.

## References

- `D-009` · `docs/tasks/T-009-src-lib-outside-the-boundary.md`
- `docs/traces/2026-09-01_T-008_reviewer.md` — the probe, both directions
- `scripts/check-core-isolation.mjs:39` — `isFront`
