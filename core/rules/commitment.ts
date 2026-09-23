import type { Commitment, Entry, Week } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { IdGen } from "../ports/id-gen.ts";
import type { Store } from "../ports/store.ts";
import { weekStartsOn } from "./week.ts";

export class CommitmentRuleError extends Error {
  override readonly name = "CommitmentRuleError";
}

export interface WriteCommitmentInput {
  ownerId: string;
  projectId: string;
  weekId: string;
  target: number;
  unit: Commitment["unit"];
  proposedTarget: number | null;
}

export async function writeCommitment(
  store: Store, clock: Clock, ids: IdGen, input: WriteCommitmentInput,
): Promise<Commitment> {
  if (!Number.isSafeInteger(input.target) || input.target <= 0) {
    throw new CommitmentRuleError("Target must be a positive integer frequency or volume, never a clock slot");
  }
  if (input.unit !== "times" && input.unit !== "minutes") {
    throw new CommitmentRuleError("Commitment unit must be times or minutes");
  }
  if (input.proposedTarget !== null && (!Number.isSafeInteger(input.proposedTarget) || input.proposedTarget <= 0)) {
    throw new CommitmentRuleError("Proposed target must be a positive integer");
  }
  await requireOpenWeek(store, input.ownerId, input.weekId, clock.now());
  const project = await store.getProject(input.projectId);
  if (project === null || project.ownerId !== input.ownerId) {
    throw new CommitmentRuleError(`Project ${input.projectId} does not exist`);
  }
  const existing = (await store.listCommitments(input.weekId, input.ownerId))
    .find(({ projectId }) => projectId === input.projectId);
  const commitment: Commitment = {
    ...input, id: existing?.id ?? ids.next(), reserve: Math.max(1, Math.ceil(0.30 * input.target)),
  };
  if (!await store.writeCommitment(commitment)) throw new CommitmentRuleError("Week is already closed");
  // A concurrent writer may have created the single row first; return its persisted identity.
  return (await store.listCommitments(input.weekId, input.ownerId))
    .find(({ projectId }) => projectId === input.projectId)!;
}

export interface SpendReserveInput {
  ownerId: string;
  projectId: string;
  weekId: string;
  what: string;
  note: string | null;
}

export async function spendReserve(
  store: Store, clock: Clock, ids: IdGen, input: SpendReserveInput,
): Promise<Entry> {
  const now = clock.now();
  await requireOpenWeek(store, input.ownerId, input.weekId, now);
  if (input.what.trim() === "") throw new CommitmentRuleError("Reserve event description is required");
  const entry: Entry = {
    id: ids.next(), ownerId: input.ownerId, projectId: input.projectId,
    kind: "reserve_spend", occurredAt: now.toISOString(), what: input.what.trim(),
    note: input.note, creditsObjectiveId: null, effortMinutes: null, stepId: null,
  };
  if (!await store.spendReserve(entry, input.weekId)) {
    throw new CommitmentRuleError("An open week commitment is required to spend a reserve");
  }
  return entry;
}

async function requireOpenWeek(store: Store, ownerId: string, weekId: string, now: Date): Promise<Week> {
  const week = await store.getWeek(weekId, ownerId);
  if (week === null) throw new CommitmentRuleError(`Week ${weekId} does not exist`);
  if (week.closedAt !== null || week.startsOn !== weekStartsOn(now)) {
    throw new CommitmentRuleError("Commitments require the current open week");
  }
  return week;
}
