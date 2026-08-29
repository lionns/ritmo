---
name: propose-governance-change
description: Propose a change to the SDD harness governance surface — docs/sdd/, harness.json, or the enforcement scripts. Use when a rule, budget, gate, template, profile, or lint rule would change. Propose; never apply without approval.
---

# Proposing a governance change

The governance surface is `docs/sdd/`, `harness.json`, and `scripts/`. Changing any of it needs
explicit human approval, a decision file, and a `VERSION.md` entry when behavior changes.
Normative rules: `docs/sdd/VERSION.md` § Change Rules.

**Propose; do not apply.** Present the change and wait. Approval for one change is not approval for
the next.

A proposal is:

1. A decision file in `docs/decisions/`, `Status: proposed`, 40-line budget, shape in
   `TEMPLATES.md` § Decision File. Context, decision, consequences — including what it costs.
2. A task file for the implementation, if the change is more than editing prose.
3. The version this would bump, per `VERSION.md` § Versioning Rules: MAJOR for incompatible
   governance or workflow changes, MINOR for backward-compatible additions, PATCH for
   clarifications.

Before proposing to add prose, check the `docs/sdd/` line budget. It is enforced. A rule that can
be a lint rule should be a lint rule instead: a check costs no context per session, prose costs it
every time it is read, and prose depends on the agent remembering.

Once accepted, set `Status: accepted` and regenerate the index. Decisions are immutable after that
— supersede with a new file rather than editing.
