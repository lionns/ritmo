import type { NextAction } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { IdGen } from "../ports/id-gen.ts";
import type { Store } from "../ports/store.ts";

export interface NextActionFields {
  trigger: string;
  act: string;
  obstacle: string | null;
  estimateMinutes: number | null;
}

export interface WriteNextActionInput extends NextActionFields {
  ownerId: string;
  projectId: string;
  currentActionId: string | null;
}

export class NextActionRuleError extends Error {
  override readonly name = "NextActionRuleError";
}

export async function writeNextAction(
  store: Store,
  clock: Clock,
  ids: IdGen,
  input: WriteNextActionInput,
): Promise<NextAction> {
  const createdAt = clock.now().toISOString();
  const action = buildOpenNextAction(
    ids,
    input.ownerId,
    input.projectId,
    createdAt,
    input,
  );
  if (input.currentActionId === null) {
    await createNextAction(store, action);
  } else {
    await closeNextAction(store, input.currentActionId, createdAt, action);
  }
  return action;
}

export function buildOpenNextAction(
  ids: IdGen,
  ownerId: string,
  projectId: string,
  createdAt: string,
  fields: NextActionFields,
): NextAction {
  if (fields.trigger.trim() === "") {
    throw new NextActionRuleError("Next action trigger is required");
  }
  if (fields.act.trim() === "") {
    throw new NextActionRuleError("Next action act is required");
  }
  if (
    fields.estimateMinutes !== null &&
    (!Number.isInteger(fields.estimateMinutes) || fields.estimateMinutes <= 0)
  ) {
    throw new NextActionRuleError("Next action estimate must be a positive integer");
  }
  return {
    id: ids.next(),
    ownerId,
    projectId,
    trigger: fields.trigger,
    act: fields.act,
    obstacle: fields.obstacle,
    estimateMinutes: fields.estimateMinutes,
    createdAt,
    closedAt: null,
  };
}

export async function createNextAction(store: Store, action: NextAction): Promise<void> {
  const project = await store.getProject(action.projectId);
  if (project === null) {
    throw new NextActionRuleError(`Project ${action.projectId} does not exist`);
  }
  if (project.state !== "active") {
    throw new NextActionRuleError(`Project ${project.id} is not active`);
  }

  const openAction = await store.findOpenNextAction(project.id);
  if (openAction !== null) {
    throw new NextActionRuleError(
      `Project ${project.id} already has open next action ${openAction.id}`,
    );
  }

  await store.createNextAction(action);
}

export async function closeNextAction(
  store: Store,
  actionId: string,
  closedAt: string,
  replacement: NextAction,
): Promise<void> {
  const current = await store.getNextAction(actionId);
  if (current === null || current.closedAt !== null) {
    throw new NextActionRuleError(`Next action ${actionId} does not exist or is already closed`);
  }

  const project = await store.getProject(current.projectId);
  if (project === null) {
    throw new NextActionRuleError(`Project ${current.projectId} does not exist`);
  }
  if (project.state !== "active") {
    throw new NextActionRuleError(`Project ${project.id} is not active`);
  }
  if (replacement.id === current.id) {
    throw new NextActionRuleError(`Replacement next action must have a new id`);
  }
  if (
    replacement.projectId !== current.projectId ||
    replacement.ownerId !== current.ownerId
  ) {
    throw new NextActionRuleError(
      `Replacement next action must belong to project ${current.projectId}`,
    );
  }
  if (replacement.closedAt !== null) {
    throw new NextActionRuleError(`Replacement next action ${replacement.id} must be open`);
  }
  if (replacement.createdAt < closedAt) {
    throw new NextActionRuleError(
      `Replacement next action ${replacement.id} cannot open before ${closedAt}`,
    );
  }

  const replaced = await store.replaceNextAction(actionId, closedAt, replacement);
  if (!replaced) {
    throw new NextActionRuleError(`Next action ${actionId} is already closed`);
  }
}
