# D-013 — Exact pins, a committed lockfile, and upgrades as their own task

- Status: accepted
- Date: 2026-08-31
- Supersedes: none
- Tasks: T-001

## Context

The owner asked for the latest stable version of everything. On the day `T-001` was planned that was
already impossible to take literally: `typescript@7.0.2` is the current `latest` and breaks
`astro check`, because `@astrojs/check@0.9.10` declares `typescript ^5.0.0 || ^6.0.0`. The harness
also gates every change on a green baseline, on a project touched in bursts — the case where a tree
that moves on its own costs an afternoon proving the failure was not yours.

## Decision

Dependencies are pinned to exact versions in `package.json`, `package-lock.json` is committed, and
every gate installs with `npm ci`, never `npm install`. Upgrading is its own task: run
`npm outdated`, raise the pins, run all five gates, commit the result. **Latest stable is the target
of that task, not a property of the manifest.**

## Consequences

- Latest stable stays the goal, but as a verified outcome rather than a hope. A version that fails a
  gate is not shipped, and the reason its pin did not move is recorded where the pin lives.
- A red baseline means the change sitting on it, because nothing else moved underneath.
- Bumps read in `git log` as a `package.json` diff instead of hiding inside the lockfile.
- Security fixes stop arriving on their own. Nothing here is reachable except by the owner
  (`D-004`), and the upgrade task is the mechanism — but the exposure window is now a decision
  rather than an accident, and it has to be run for that to mean anything.
- `D-012`'s claim that there are exactly five dev dependencies stays checkable against the manifest.

## References

- `docs/project/quality-gates.md` · `docs/tasks/T-001-skeleton-and-next-action.md` · `D-012`
