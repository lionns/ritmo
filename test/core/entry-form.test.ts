import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildEntryRequest,
  confirmOptimisticChartMark,
  EFFORT_MINUTE_OPTIONS,
  toggleEffortMinutes,
} from "../../src/lib/entry-form.ts";

describe("the log form minutes chips", () => {
  it("offers only the four owner-settled values", () => {
    assert.deepEqual(EFFORT_MINUTE_OPTIONS, [15, 30, 60, 120]);
  });

  it("keeps one value selected and deselects it when pressed again", () => {
    const first = toggleEffortMinutes(undefined, 15);
    assert.equal(first, 15);

    const replacement = toggleEffortMinutes(first, 60);
    assert.equal(replacement, 60);

    assert.equal(toggleEffortMinutes(replacement, 60), undefined);
  });

  it("omits effortMinutes until a chip is selected", () => {
    const untimed = buildEntryRequest("project-1", "Moví la estructura", undefined);
    assert.equal(Object.hasOwn(untimed, "effortMinutes"), false);

    assert.deepEqual(buildEntryRequest("project-1", "Moví la estructura", 30), {
      projectId: "project-1",
      what: "Moví la estructura",
      effortMinutes: 30,
    });
  });

  it("leaves proportional height to SSR and never erases a timed state", () => {
    assert.deepEqual(confirmOptimisticChartMark(9, "empty", undefined), {
      height: 12,
      state: "untimed",
    });
    assert.deepEqual(confirmOptimisticChartMark(12, "untimed", 60), {
      height: 12,
      state: "timed",
    });
    assert.deepEqual(confirmOptimisticChartMark(95, "timed", undefined), {
      height: 95,
      state: "timed",
    });
  });
});
