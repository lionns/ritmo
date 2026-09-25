import type { Step } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { IdGen } from "../ports/id-gen.ts";
import type { Store } from "../ports/store.ts";

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface StepFields {
  title: string;
  estimateMinutes: number | null;
}

export interface WriteStepInput extends StepFields {
  ownerId: string;
  projectId: string;
}

export class StepRuleError extends Error {
  override readonly name = "StepRuleError";
}

/**
 * The next stretch, never the whole project (research §10). No rule caps how many steps a project
 * carries: a list long enough to need one has already become the plan `brief.md` § Users says the
 * owner abandons, and that is a guardrail on what the interface renders, not on what the store
 * accepts.
 */
export function buildStep(
  ids: IdGen,
  ownerId: string,
  projectId: string,
  createdAt: string,
  fields: StepFields,
): Step {
  if (fields.title.trim() === "") {
    throw new StepRuleError("Step title is required");
  }
  if (
    fields.estimateMinutes !== null &&
    (!Number.isInteger(fields.estimateMinutes) || fields.estimateMinutes <= 0)
  ) {
    throw new StepRuleError("Step estimate must be a positive integer");
  }
  return {
    id: ids.next(),
    ownerId,
    projectId,
    title: fields.title.trim(),
    estimateMinutes: fields.estimateMinutes,
    markedFor: null,
    createdAt,
    doneAt: null,
  };
}

export async function writeStep(
  store: Store,
  clock: Clock,
  ids: IdGen,
  input: WriteStepInput,
): Promise<Step> {
  const step = buildStep(
    ids,
    input.ownerId,
    input.projectId,
    clock.now().toISOString(),
    input,
  );
  await requireActiveProject(store, input.projectId);
  await store.createStep(step);
  return step;
}

/**
 * FR-22: no hour, no duration, no condition, and no daily cap — `Owner.activeCap` is the only cap
 * there is, and it is on active projects rather than on marks. A step already marked for another
 * day moves; it never holds two.
 */
export async function markStepFor(
  store: Store,
  id: string,
  ownerId: string,
  date: string,
): Promise<void> {
  if (!CALENDAR_DATE.test(date)) {
    throw new StepRuleError(`Mark must be a calendar date, not ${date}`);
  }
  const step = await readOpenStep(store, id, ownerId);
  await requireActiveProject(store, step.projectId);
  if (!(await store.markStepFor(id, ownerId, date))) {
    throw new StepRuleError(`Step ${id} could not be marked`);
  }
}

/**
 * Unmarking is not an event and leaves no record — the same refusal to carry debt that
 * `data-model.md` § Data lifecycle applies to a day that turns (FR-22).
 */
export async function unmarkStep(store: Store, id: string, ownerId: string): Promise<void> {
  const step = await readOpenStep(store, id, ownerId);
  if (!(await store.markStepFor(step.id, ownerId, null))) {
    throw new StepRuleError(`Step ${id} could not be unmarked`);
  }
}

export async function completeStep(
  store: Store,
  clock: Clock,
  id: string,
  ownerId: string,
): Promise<void> {
  await readOpenStep(store, id, ownerId);
  if (!(await store.setStepDone(id, ownerId, clock.now().toISOString()))) {
    throw new StepRuleError(`Step ${id} is already done`);
  }
}

/**
 * The only read of `markedFor` there is. A mark for any other day is not history: nothing counts
 * it, nothing renders it, and no caller can ask for one (`data-model.md` § Data lifecycle).
 */
export async function readDayList(
  store: Store,
  ownerId: string,
  today: string,
): Promise<Step[]> {
  if (!CALENDAR_DATE.test(today)) {
    throw new StepRuleError(`A day list is read by calendar date, not ${today}`);
  }
  return store.readStepsMarkedFor(ownerId, today);
}

/** Today in the named calendar. Callers must make the owner's zone explicit. */
export function calendarDateOf(moment: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(moment);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (year === undefined || month === undefined || day === undefined) {
    throw new RangeError("Could not read the calendar date in the owner's time zone");
  }
  return `${year.padStart(4, "0")}-${month}-${day}`;
}

/** Validate and canonicalize a browser-supplied IANA time zone. */
export function normalizeTimeZone(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/** Before the browser has supplied a zone, preserve this runtime's existing calendar behavior. */
export function runtimeTimeZone(): string {
  const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZone) throw new Error("This runtime did not report a time zone");
  return timeZone;
}

export function effectiveTimeZone(timeZone: string | null): string {
  return timeZone ?? runtimeTimeZone();
}

async function readOpenStep(store: Store, id: string, ownerId: string): Promise<Step> {
  const step = await store.getStep(id);
  if (step === null || step.ownerId !== ownerId) {
    throw new StepRuleError(`Step ${id} does not exist`);
  }
  if (step.doneAt !== null) {
    throw new StepRuleError(`Step ${id} is already done`);
  }
  return step;
}

async function requireActiveProject(store: Store, projectId: string): Promise<void> {
  const project = await store.getProject(projectId);
  if (project === null) {
    throw new StepRuleError(`Project ${projectId} does not exist`);
  }
  if (project.state !== "active") {
    throw new StepRuleError(`Project ${project.id} is not active`);
  }
}
