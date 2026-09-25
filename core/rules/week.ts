import type { Week } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { IdGen } from "../ports/id-gen.ts";
import type { Store } from "../ports/store.ts";
import { calendarDateOf, effectiveTimeZone } from "./step.ts";

export class WeekRuleError extends Error {
  override readonly name = "WeekRuleError";
}

/** Calendar arithmetic, not seven 24-hour periods: a local week may cross a DST change. */
export function weekStartsOn(moment: Date, timeZone: string): string {
  const date = calendarDateOf(moment, timeZone);
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return shiftCalendarDate(date, -((weekday + 6) % 7));
}

/** FR-14 permits rotation throughout the local calendar day that starts the week. */
export function isWeekStart(moment: Date, timeZone: string): boolean {
  return calendarDateOf(moment, timeZone) === weekStartsOn(moment, timeZone);
}

export function weekBounds(startsOn: string, timeZone: string): { startsAt: string; endsAt: string } {
  const nextWeek = shiftCalendarDate(startsOn, 7);
  return {
    startsAt: instantAtLocalMidnight(startsOn, timeZone).toISOString(),
    endsAt: instantAtLocalMidnight(nextWeek, timeZone).toISOString(),
  };
}

/** Reading does not create history. Call openWeek at the application boundary to roll over. */
export async function readCurrentWeek(store: Store, clock: Clock, ownerId: string): Promise<Week | null> {
  const owner = await store.getOwner(ownerId);
  return store.getWeekStartingOn(ownerId, weekStartsOn(clock.now(), effectiveTimeZone(owner?.timeZone ?? null)));
}

export async function openWeek(store: Store, clock: Clock, ids: IdGen, ownerId: string): Promise<Week> {
  const owner = await store.getOwner(ownerId);
  if (owner === null) throw new WeekRuleError(`Owner ${ownerId} does not exist`);
  const now = clock.now();
  const week: Week = {
    id: ids.next(), ownerId, startsOn: weekStartsOn(now, effectiveTimeZone(owner.timeZone)),
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
  const owner = await store.getOwner(input.ownerId);
  if (owner === null) throw new WeekRuleError(`Owner ${input.ownerId} does not exist`);
  const now = clock.now();
  if (week.startsOn > weekStartsOn(now, effectiveTimeZone(owner.timeZone))) throw new WeekRuleError("Cannot close a future week");
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

export async function readWeekEntries(store: Store, week: Week, timeZone: string) {
  const { startsAt, endsAt } = weekBounds(week.startsOn, timeZone);
  return store.readWeekEntries(week.ownerId, startsAt, endsAt);
}

function shiftCalendarDate(date: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError(`Invalid calendar date: ${date}`);
  const value = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== date) {
    throw new RangeError(`Invalid calendar date: ${date}`);
  }
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function instantAtLocalMidnight(date: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const desired = utcMilliseconds(year, month - 1, day, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let candidate = desired;
  for (let attempt = 0; attempt < 5; attempt++) {
    const parts = formatter.formatToParts(new Date(candidate));
    const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const actual = utcMilliseconds(
      Number(fields.year), Number(fields.month) - 1, Number(fields.day),
      Number(fields.hour), Number(fields.minute), Number(fields.second),
    );
    const correction = desired - actual;
    if (correction === 0) return new Date(candidate);
    candidate += correction;
  }
  throw new RangeError(`Could not resolve midnight for ${date} in ${timeZone}`);
}

function utcMilliseconds(year: number, month: number, day: number, hour: number, minute: number, second: number): number {
  const value = new Date(0);
  value.setUTCFullYear(year, month, day);
  value.setUTCHours(hour, minute, second, 0);
  return value.getTime();
}
