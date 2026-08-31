import assert from "node:assert/strict";
import { test } from "node:test";

import { taskBudgetSections } from "../../scripts/lib/harness.mjs";

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
