import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PortfolioEntry } from "../../contracts/portfolio.ts";
import {
  buildChartDays,
  CHART_RISE_DURATION_MS,
  CHART_STAGGER_MS,
  DESKTOP_CHART_DAYS,
  MOBILE_CHART_DAYS,
} from "../../src/components/molecules/hero-chart.ts";

describe("the portfolio hero chart", () => {
  it("builds 28 chronological marks and keeps empty, untimed and timed days distinct", () => {
    const days = buildChartDays(entries, new Date("2026-08-31T18:00:00.000Z"));

    assert.equal(days.length, DESKTOP_CHART_DAYS);
    assert.equal(days[0].date, "2026-08-04");
    assert.equal(days.at(-1)?.date, "2026-08-31");
    assert.deepEqual(
      days.slice(-4).map(({ date, state, height }) => ({ date, state, height })),
      [
        { date: "2026-08-28", state: "empty", height: 9 },
        { date: "2026-08-29", state: "timed", height: 12 },
        { date: "2026-08-30", state: "timed", height: 104 },
        { date: "2026-08-31", state: "untimed", height: 12 },
      ],
    );
    assert.equal(days.slice(-MOBILE_CHART_DAYS).length, MOBILE_CHART_DAYS);
    assert.equal(days.some(({ date }) => date === "2026-08-03"), false);
  });

  it("rejects a chart with no days", () => {
    assert.throws(() => buildChartDays([], new Date(), 0), /positive integer/);
  });

  it("finishes the 28-mark rise inside 400 milliseconds", () => {
    assert.equal(
      DESKTOP_CHART_DAYS * CHART_STAGGER_MS + CHART_RISE_DURATION_MS,
      388,
    );
  });
});

const entry = (
  id: string,
  occurredAt: string,
  effortMinutes: number | null,
): PortfolioEntry => ({
  id,
  kind: "progress",
  occurredAt,
  what: id,
  effortMinutes,
  note: null,
});

const entries = [
  entry("outside", "2026-08-03T12:00:00.000Z", 60),
  entry("zero", "2026-08-29T12:00:00.000Z", 0),
  entry("timed", "2026-08-30T12:00:00.000Z", 30),
  entry("untimed-a", "2026-08-31T10:00:00.000Z", null),
  entry("untimed-b", "2026-08-31T14:00:00.000Z", null),
];
