import type { PortfolioEntry } from "../../../contracts/portfolio.ts";

export type ChartDayState = "empty" | "untimed" | "timed";

export interface ChartDay {
  date: string;
  entries: number;
  minutes: number;
  state: ChartDayState;
  height: number;
}

export const DESKTOP_CHART_DAYS = 28;
export const MOBILE_CHART_DAYS = 14;
export const CHART_RISE_DURATION_MS = 220;
export const CHART_STAGGER_MS = 6;

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;
const EMPTY_HEIGHT = 9;
const UNTIMED_HEIGHT = 12;
const TIMED_RANGE = 92;

export function buildChartDays(
  entries: PortfolioEntry[],
  now: Date,
  dayCount = DESKTOP_CHART_DAYS,
): ChartDay[] {
  if (!Number.isInteger(dayCount) || dayCount < 1) {
    throw new RangeError("dayCount must be a positive integer");
  }

  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const entriesByDate = new Map<string, PortfolioEntry[]>();
  for (const entry of entries) {
    const date = entry.occurredAt.slice(0, 10);
    const values = entriesByDate.get(date) ?? [];
    values.push(entry);
    entriesByDate.set(date, values);
  }

  const rawDays = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(end - (dayCount - index - 1) * DAY_MILLISECONDS)
      .toISOString()
      .slice(0, 10);
    const dateEntries = entriesByDate.get(date) ?? [];
    const timedEntries = dateEntries.filter(({ effortMinutes }) => effortMinutes !== null);
    const state: ChartDayState =
      dateEntries.length === 0 ? "empty" : timedEntries.length === 0 ? "untimed" : "timed";
    return {
      date,
      entries: dateEntries.length,
      minutes: timedEntries.reduce((total, entry) => total + (entry.effortMinutes ?? 0), 0),
      state,
    };
  });
  const maximumMinutes = Math.max(1, ...rawDays.map(({ minutes }) => minutes));

  return rawDays.map((day) => ({
    ...day,
    height:
      day.state === "empty"
        ? EMPTY_HEIGHT
        : day.state === "untimed"
          ? UNTIMED_HEIGHT
          : Math.max(UNTIMED_HEIGHT, Math.round(UNTIMED_HEIGHT + day.minutes / maximumMinutes * TIMED_RANGE)),
  }));
}
