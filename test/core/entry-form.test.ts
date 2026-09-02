import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildEntryRequest,
  confirmOptimisticChartMark,
  EFFORT_MINUTE_OPTIONS,
  toggleEffortMinutes,
} from "../../src/lib/entry-form.ts";

describe("the log form minutes chips", () => {
  it("offers only the four canvas values", () => {
    assert.deepEqual(EFFORT_MINUTE_OPTIONS, [10, 20, 45, 90]);
  });

  it("keeps one value selected and deselects it when pressed again", () => {
    const first = toggleEffortMinutes(undefined, 10);
    assert.equal(first, 10);

    const replacement = toggleEffortMinutes(first, 45);
    assert.equal(replacement, 45);

    assert.equal(toggleEffortMinutes(replacement, 45), undefined);
  });

  it("omits effortMinutes until a chip is selected", () => {
    const untimed = buildEntryRequest("project-1", "Moví la estructura", undefined);
    assert.equal(Object.hasOwn(untimed, "effortMinutes"), false);

    assert.deepEqual(buildEntryRequest("project-1", "Moví la estructura", 20), {
      projectId: "project-1",
      what: "Moví la estructura",
      effortMinutes: 20,
    });
  });

  it("leaves proportional height to SSR and never erases a timed state", () => {
    assert.deepEqual(confirmOptimisticChartMark(9, "empty", undefined), {
      height: 12,
      state: "untimed",
    });
    assert.deepEqual(confirmOptimisticChartMark(12, "untimed", 45), {
      height: 12,
      state: "timed",
    });
    assert.deepEqual(confirmOptimisticChartMark(95, "timed", undefined), {
      height: 95,
      state: "timed",
    });
  });
});
