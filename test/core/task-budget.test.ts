import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { budgetContractProblems, enforcedBudgetKeys, taskBudgetSections } from "../../scripts/lib/harness.mjs";

test("task budget sections split at the first Outcome heading", () => {
  const text = ["---", "id: T-001", "---", "", "## Risks", "", "- None", "", "## Outcome", "", "- Changes:", "", "## Outcome", "ignored"].join("\n");

  const sections = taskBudgetSections(text);

  assert.equal(sections.plan, ["---", "id: T-001", "---", "", "## Risks", "", "- None", "", ""].join("\n"));
  assert.equal(sections.record, ["## Outcome", "", "- Changes:", "", "## Outcome", "ignored"].join("\n"));
});

test("a task without an Outcome heading is entirely plan", () => {
  const text = ["---", "id: T-001", "---", "", "## Risks", "", "- None"].join("\n");

  assert.deepEqual(taskBudgetSections(text), { plan: text, record: "" });
});

test("the budget contract reports missing and unenforced keys", () => {
  const budgets = {
    taskRecordLines: 60,
    traceBlockLines: 25,
    decisionFileLines: 40,
    journalEntryLines: 1,
    sddDocsTotalLines: 650,
  };

  assert.deepEqual(budgetContractProblems(budgets), [
    "missing `taskPlanLines`, which harness-lint enforces",
    "declares `journalEntryLines`, which harness-lint does not enforce",
  ]);
});

test("enforced budget keys are derived from readers across scripts", () => {
  const root = mkdtempSync(join(tmpdir(), "ritmo-budget-readers-"));
  try {
    mkdirSync(join(root, "scripts", "nested"), { recursive: true });
    writeFileSync(join(root, "scripts", "first.mjs"), "void budgets.alphaLines;\n");
    writeFileSync(join(root, "scripts", "nested", "second.ts"), "void budgets.betaLines;\n");
    writeFileSync(
      join(root, "scripts", "scanner.mjs"),
      "const budgetRead = /\\bbudgets\\.([A-Za-z_$][\\w$]*)/g;\n",
    );

    assert.deepEqual(enforcedBudgetKeys(root), ["alphaLines", "betaLines"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
