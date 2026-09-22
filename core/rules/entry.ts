import type { Entry } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { IdGen } from "../ports/id-gen.ts";
import type { Store } from "../ports/store.ts";
import { calendarDateOf } from "./step.ts";

export interface NewProgressEntry {
  ownerId: string;
  projectId: string;
  what: string;
  effortMinutes: number | null;
  note: string | null;
}

export class EntryRuleError extends Error {
  override readonly name = "EntryRuleError";
}

export async function createProgressEntry(
  store: Store,
  clock: Clock,
  idGen: IdGen,
  input: NewProgressEntry,
): Promise<Entry> {
  const project = await store.getProject(input.projectId);
  if (project === null || project.ownerId !== input.ownerId) {
    throw new EntryRuleError(`Project ${input.projectId} does not exist`);
  }
  if (project.state === "shelved") {
    throw new EntryRuleError(`Project ${input.projectId} is shelved`);
  }

  const occurredAt = clock.now();
  const entry: Entry = {
    id: idGen.next(),
    ownerId: input.ownerId,
    kind: "progress",
    projectId: input.projectId,
    creditsObjectiveId: null,
    occurredAt: occurredAt.toISOString(),
    what: input.what,
    effortMinutes: input.effortMinutes,
    note: input.note,
    stepId: await attributeToStep(store, input, occurredAt),
  };
  await store.createEntry(entry);
  return entry;
}

/**
 * `D-027`: the step this effort belongs to is decided here, while the mark is alive, because
 * `FR-22` forbids reading a past one. Exactly one step of this project marked for today gives its
 * id; several or none give null. Splitting minutes across two marked steps would invent precision
 * the product does not have, and a lost sample is cheaper than a wrong one (§10).
 */
async function attributeToStep(
  store: Store,
  input: NewProgressEntry,
  occurredAt: Date,
): Promise<string | null> {
  const marked = await store.readStepsMarkedFor(input.ownerId, calendarDateOf(occurredAt));
  const mine = marked.filter((step) => step.projectId === input.projectId);
  return mine.length === 1 ? mine[0].id : null;
}
