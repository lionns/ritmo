import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calendarDateOf, effectiveTimeZone, normalizeTimeZone, runtimeTimeZone } from "../../core/rules/step.ts";

describe("owner calendar zones", () => {
  it("keeps the date in the owner's calendar when the runtime is UTC", () => {
    const moment = new Date("2026-09-25T03:33:00.000Z");
    assert.equal(calendarDateOf(moment, "UTC"), "2026-09-25");
    assert.equal(calendarDateOf(moment, "America/Bogota"), "2026-09-24");
  });

  it("moves into tomorrow for a zone ahead of UTC", () => {
    assert.equal(calendarDateOf(new Date("2026-09-24T20:00:00.000Z"), "Asia/Tokyo"), "2026-09-25");
  });

  it("canonicalizes a browser zone and refuses an invalid or absent one", () => {
    assert.equal(normalizeTimeZone("America/Bogota"), "America/Bogota");
    assert.equal(normalizeTimeZone("Not/AZone"), null);
    assert.equal(normalizeTimeZone(undefined), null);
  });

  it("uses the runtime zone only while the owner has not supplied one", () => {
    assert.equal(effectiveTimeZone(null), runtimeTimeZone());
    assert.equal(effectiveTimeZone("Asia/Tokyo"), "Asia/Tokyo");
  });
});
