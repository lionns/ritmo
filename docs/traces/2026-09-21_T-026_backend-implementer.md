## Trace

- 2026-09-21 — role: Backend Implementer
  - read: `D-027`, `data-model.md` § Derived values and § Step's `markedFor` note, `brief.md`
    § Estimate calibration, `FR-20`, `core/rules/entry.ts`, `core/rules/step.ts`
  - did: `0004_entry_step.sql` — one `ADD COLUMN` and a partial index; `Entry.stepId` through the
    model, row type, mapper and insert; `attributeToStep` in the entry rule, deciding at write
    time from the day's marks; `readEffortForStep` on the port and the adapter; the window rule
    corrected in `requirements.json`, `data-model.md` and `brief.md`
  - files: `migrations/0004_entry_step.sql`, `core/{model,ports,rules}/**`,
    `adapters/sqlite/store.ts`, `scripts/seed-local.mjs`, four test files, three specification
    documents
  - checks: baseline unit 51/51, isolation, typecheck, build, integration 18/18, green before any
    edit; final unit 51/51, isolation, typecheck 0 errors, build, integration 23/23
  - probe: seeded throwaway on 4418. With one step marked, two entries attributed to it and summed
    to 60 min; after marking a second step, the next entry attributed to **nothing** rather than
    splitting. That refusal is the decision, so it is the thing worth seeing run
  - found and fixed: `scripts/seed-local.mjs` marked steps with the **UTC** date while the product
    uses the local calendar. Seeding after 19:00 here marked them for tomorrow and the portfolio
    showed none for today. Mine, from `T-020`; the seed now computes the day the way
    `calendarDateOf` does
  - nothing reads a past mark: attribution runs against `readStepsMarkedFor(owner, today)` at the
    moment of writing, so `FR-22`'s expiry is untouched
  - result: a step can say what it took, or say nothing. Open for owner validation; no blocker.
