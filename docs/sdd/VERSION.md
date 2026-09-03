# Harness Version

Version: `0.9.0` · Status: `Operational` · Date: 2026-09-03

The active version and profile for a project live in its `harness.json`. This file holds the rules;
the release history is `CHANGELOG.md`, at the repository root.

## Versioning Rules

- `MAJOR` — incompatible governance, workflow, role, or protocol changes.
- `MINOR` — backward-compatible additions to protocols, templates, roles, gates, or records.
- `PATCH` — clarifications, formatting, and fixes that restore already-documented behavior.

## Change Rules

- Changes to `docs/sdd/`, `harness.json`, or `scripts/` require explicit human approval, in both profiles.
- An accepted governance change gets a decision file in `docs/decisions/`.
- A change that alters harness behavior bumps the version and adds a `CHANGELOG.md` entry.
- Tasks record the version they ran under, in their front-matter.
- A project may stay on an older version. `0.1.0` remains valid for projects that have not migrated.
