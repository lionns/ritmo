# D-018 — Node on the owner's machine, not V8 isolates on someone else's

- Status: accepted
- Date: 2026-09-02
- Supersedes: D-001
- Tasks: T-011
- Foundation: runtime

## Context

`D-001` put the server on the Workers runtime. The owner's requirement changed on 2026-09-02: not
to depend entirely on Cloudflare. The boundary `D-017` enforces means the runtime is reachable —
`core/`, `contracts/`, `src/components/` and `src/lib/` contain no platform reference at all, and
Cloudflare survives in seven files, none of them domain.

## Decision

The server runs on **Node**, on the pinned `24.20.0` line (`D-013`), on the owner's own machine.
TypeScript on both sides, types checked against `data-model.md` and shared across the boundary,
carries forward from `D-001` unchanged — only the host moves. No second language.

## Consequences

- **The 10 ms CPU ceiling is gone.** It was a Workers free-plan limit, and `D-001` said it "shapes
  the domain". Bounded windows (`AC-X3`) stay, because a log that grows forever still should not be
  summed forever — but the reason is now the data, not the platform. Any rule that was narrowed to
  fit 10 ms may be revisited on its merits.
- `node:` built-ins are fully available rather than partially, through a compatibility layer.
- Nothing restarts the process. The owner starts it to use it, which is the point (`D-020`).
- Returning to Workers stays an adapter swap rather than a rewrite, because the port does not move.
  That is what `D-017`'s boundary bought. Whether the D1 adapter file stays in the tree or is left
  to `git log` is `T-011`'s call, and does not change this.

## References

- `D-001` · `D-013` · `D-017` · `docs/project/architecture.md` § Layout
