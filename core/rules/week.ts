import type { Week } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { IdGen } from "../ports/id-gen.ts";
import type { Store } from "../ports/store.ts";
import { calendarDateOf } from "./step.ts";

export class WeekRuleError extends Error {
  override readonly name = "WeekRuleError";
}

/** Calendar arithmetic, not seven 24-hour periods: a local week may cross a DST change. */
export function weekStartsOn(moment: Date): string {
  const monday = new Date(moment.getTime());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return calendarDateOf(monday);
}

export function weekBounds(startsOn: string): { startsAt: string; endsAt: string } {
  const start = new Date(`${startsOn}T00:00:00`);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 7);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

/** Reading does not create history. Call openWeek at the application boundary to roll over. */
export async function readCurrentWeek(store: Store, clock: Clock, ownerId: string): Promise<Week | null> {
  return store.getWeekStartingOn(ownerId, weekStartsOn(clock.now()));
}

export async function openWeek(store: Store, clock: Clock, ids: IdGen, ownerId: string): Promise<Week> {
  if (await store.getOwner(ownerId) === null) throw new WeekRuleError(`Owner ${ownerId} does not exist`);
  const now = clock.now();
  const week: Week = {
    id: ids.next(), ownerId, startsOn: weekStartsOn(now),
    capacityLabel: null, tagId: null, reflection: null, closedAt: null,
  };
  // The transaction closes only rows still open. Repeated or concurrent opens preserve the close.
  // Missing intervening weeks are not invented; the week being opened starts without commitments.
  return store.openWeek(week, now.toISOString());
}

export interface CloseWeekInput {
  ownerId: string;
  weekId: string;
  capacityLabel: Week["capacityLabel"];
  tagId: string | null;
  reflection: string | null;
}

export async function closeWeek(store: Store, clock: Clock, input: CloseWeekInput): Promise<Week> {
  if (input.capacityLabel !== null && !["light", "normal", "heavy"].includes(input.capacityLabel)) {
    throw new WeekRuleError("Capacity label must be light, normal or heavy");
  }
  const week = await store.getWeek(input.weekId, input.ownerId);
  if (week === null) throw new WeekRuleError(`Week ${input.weekId} does not exist`);
  if (week.closedAt !== null) return week;
  const now = clock.now();
  if (week.startsOn > weekStartsOn(now)) throw new WeekRuleError("Cannot close a future week");
  const closed: Week = {
    ...week, capacityLabel: input.capacityLabel, tagId: input.tagId,
    reflection: input.reflection, closedAt: now.toISOString(),
  };
  // The owner's label is the correction: inferred capacity is never a prerequisite or a veto.
  if (await store.closeWeek(closed)) return closed;
  const existing = await store.getWeek(week.id, week.ownerId);
  if (existing === null) throw new WeekRuleError(`Week ${week.id} does not exist`);
  return existing;
}

export async function readWeekEntries(store: Store, week: Week) {
  const { startsAt, endsAt } = weekBounds(week.startsOn);
  return store.readWeekEntries(week.ownerId, startsAt, endsAt);
}
