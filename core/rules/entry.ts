import type { Entry } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { IdGen } from "../ports/id-gen.ts";
import type { Store } from "../ports/store.ts";

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

  const entry: Entry = {
    id: idGen.next(),
    ownerId: input.ownerId,
    kind: "progress",
    projectId: input.projectId,
    creditsObjectiveId: null,
    occurredAt: clock.now().toISOString(),
    what: input.what,
    effortMinutes: input.effortMinutes,
    note: input.note,
  };
  await store.createEntry(entry);
  return entry;
}
