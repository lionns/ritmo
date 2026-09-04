## Trace

- 2026-09-03 — role: Release Engineer
  - read: `T-016` § Scope, the upstream release `0.9.0` (`sdd-harness` f9b06e8), `harness.lock`,
    `JOURNAL.md:7`, the `decisions:` front-matter of all 14 remaining tasks
  - did: removed the two tasks, two decisions, three traces and the test this repository authored
    about the harness; copied `docs/sdd/`, the three scripts, `.claude/`, `.githooks/pre-push` and
    `CHANGELOG.md` from the release; wrote `harness.lock` filtered to the 15 paths present here;
    moved `harness.json` to `0.9.0`
  - checks: baseline unit 49/49, isolation, typecheck, build, integration 7/7, lint clean at
    648/650 before any edit; final unit 45/45, isolation, typecheck, build, integration 7/7, lint
    clean at 528/650
  - probe: the lock verifies silently over all 15 vendored files, so this copy is byte-identical to
    the release — the drift check passes because there is no drift, not because it is absent
  - result: `docs/tasks/`, `docs/decisions/` and `docs/traces/` hold no harness record. Open for
    owner validation; no blocker.
