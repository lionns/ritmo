import type { CreateEntryRequest } from "../../contracts/entries.ts";

export const EFFORT_MINUTE_OPTIONS = [10, 20, 45, 90] as const;

export type EffortMinuteOption = (typeof EFFORT_MINUTE_OPTIONS)[number];
export type OptimisticChartState = "empty" | "untimed" | "timed";

export interface OptimisticChartMark {
  height: number;
  state: Exclude<OptimisticChartState, "empty">;
}

export function isEffortMinuteOption(value: number): value is EffortMinuteOption {
  return EFFORT_MINUTE_OPTIONS.some((option) => option === value);
}

export function toggleEffortMinutes(
  selected: EffortMinuteOption | undefined,
  pressed: EffortMinuteOption,
): EffortMinuteOption | undefined {
  return selected === pressed ? undefined : pressed;
}

export function buildEntryRequest(
  projectId: string,
  what: string,
  effortMinutes: EffortMinuteOption | undefined,
): CreateEntryRequest {
  return {
    projectId,
    what,
    ...(effortMinutes === undefined ? {} : { effortMinutes }),
  };
}

/**
 * The client can confirm that something was logged, but it cannot reproduce the chart scale
 * without every day's minute total. Proportional height therefore arrives from SSR on next render.
 */
export function confirmOptimisticChartMark(
  currentHeight: number,
  currentState: OptimisticChartState,
  loggedMinutes: EffortMinuteOption | undefined,
): OptimisticChartMark {
  return {
    height: Math.max(12, currentHeight),
    state: currentState === "timed" || loggedMinutes !== undefined ? "timed" : "untimed",
  };
}
