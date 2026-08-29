# Agent Model Configuration

This file defines which AI model fills each SDD role. Copy this template into your project and fill in the model assignments.

Model assignment is project-specific configuration. Role definitions live in `docs/sdd/ROLES.md`.

---

## Active Configuration: Testing

| Role | Agent | Model | Notes |
|---|---|---|---|
| Planner | <!-- e.g. Claude Code --> | <!-- e.g. claude-sonnet-4-6 --> | |
| Frontend Implementer | <!-- e.g. Codex --> | <!-- model --> | |
| Backend Implementer | <!-- e.g. Codex --> | <!-- model --> | |
| Tester | <!-- e.g. Ollama --> | <!-- e.g. qwen2.5-coder --> | |
| Reviewer | <!-- e.g. Claude Code --> | <!-- e.g. claude-sonnet-4-6 --> | |
| Release Engineer | <!-- e.g. Ollama --> | <!-- e.g. qwen2.5-coder --> | |
| UX/Motion Designer | <!-- e.g. Ollama --> | <!-- e.g. qwen2.5-coder --> | |

---

## Target Configuration: Production

| Role | Agent | Model | Notes |
|---|---|---|---|
| Planner | <!-- agent --> | <!-- model --> | |
| Frontend Implementer | <!-- agent --> | <!-- model --> | |
| Backend Implementer | <!-- agent --> | <!-- model --> | |
| Tester | <!-- agent --> | <!-- model --> | |
| Reviewer | <!-- agent --> | <!-- model --> | |
| Release Engineer | <!-- agent --> | <!-- model --> | |
| UX/Motion Designer | <!-- agent --> | <!-- model --> | |

---

## Rationale for Assignments

<!-- Explain why each role got its model. Note any swaps from a default assignment and why. -->

---

## Known Risks

<!-- Document model limitations that affect review quality, design judgment, or mechanical execution. -->

---

## References

- `docs/sdd/ROLES.md` — role definitions
- `docs/project/quality-gates.md` — commands used by Tester and Release Engineer
- `docs/project/design-handoff.md` — primary source for UX/Motion Designer
- `docs/decisions/` — record model assignment decisions as their own file
