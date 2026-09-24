---
id: T-045
title: The screens learn there are others — sign-in, redeeming, and issuing
status: ready
profile: team
harness: 0.9.0
role: Frontend Implementer
goal: Give the three surfaces multiple accounts need — a sign-in that does not know who is coming,
  a page that turns an invitation into an account, and somewhere to issue one — without a single
  screen in the product starting to feel like it has an audience.
decisions: [D-037]
implements: [FR-24, FR-25, NFR-7]
---

## Sources

- **The design, approved by the owner before any markup is written.** The canvas at
  `https://claude.ai/artifact/DWF9g1gc1EaZuAMBTjs3tJ` holds every approved artboard; none of these
  three is drawn. Draw them, get them approved, then build — the last five screens each cost a
  round of rework when that order was reversed.
- `D-037` — "`NFR-7` must survive company. Nothing may aggregate, rank or compare across people.
  The reason Ritmo works is that nobody is watching."
- `src/pages/entrar.astro` and `src/components/organisms/AuthPanel.astro` — what exists today,
  built for exactly one person
- `docs/project/design-handoff.md` — tokens, the 390px target, and the rules for state and motion

## Scope

- `/entrar`, reworked for a page that does not know who is arriving — no name, no avatar, no hint
  about which accounts exist
- Redeeming an invitation: choose a password, register a passkey, arrive signed in
- Issuing an invitation from `/ajustes`: create a link, copy it, see the ones still open, revoke
  one. Visible only to whoever may issue.
- The copy throughout, which still says "una sola persona" in places

## Out of Scope

- Any hint that other people exist: no member lists, no counts, no "last seen", nothing that turns
  a private tool into a room with people in it (`NFR-7`, `FR-25`).
- Profiles, display names or avatars. An account is a way in, not an identity to present.
- Changing what any existing screen shows. They are already per-account; they do not learn.

## Acceptance Criteria

- [ ] `/entrar` reveals nothing about which accounts exist — the same page and the same message
      whether an account is there or not
- [ ] An invitation link leads to an account in one pass: password, passkey, signed in
- [ ] Issuing, copying and revoking a link all work from `/ajustes`, and the control is absent for
      an account that may not issue
- [ ] **A link is never shown where it can be read over a shoulder and never left on screen after
      it is copied** — it is a credential
- [ ] No screen anywhere shows a count of accounts, a name that is not yours, or any comparison
- [ ] Every new surface matches the approved artboard at 390px and at desktop width, checked by
      screenshot against the board
- [ ] Two taps from opening to a saved entry still holds for a signed-in account (`NFR-1`)

## Verification

- Baseline: `npm test && npm run check:core && npm run typecheck && npm run build && npm run test:integration`
- Final: the same five, all green
- Task-specific: **screenshot each new screen against the approved board**, at 390px and 1456px.
  Layout and reachability defects pass the entire suite; this repository has shipped several, and
  every one was caught by a person looking at the screen.
- Task-specific: redeem a real invitation end to end in a browser, on a phone-sized viewport,
  including registering the passkey. That is the surface and it cannot be checked from a terminal.

## Assumptions

- The owner is available to approve the artboards before implementation starts. If not, the task
  waits; it does not guess.

## Risks

- This is where Ritmo could quietly become social. Every affordance that makes other people
  visible is one `NFR-7` forbids, and none of them will look like a violation on its own.

## Outcome

Filled in as the task progresses; overwritten, not appended.

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- Severity · `file:line` · issue · impact · recommendation

## Validation

- Validated by:
- Date:
