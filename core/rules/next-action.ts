import type { NextAction } from "../model/entities.ts";
import type { Store } from "../ports/store.ts";

export class NextActionRuleError extends Error {
  override readonly name = "NextActionRuleError";
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

  await store.replaceNextAction(actionId, closedAt, replacement);
}
