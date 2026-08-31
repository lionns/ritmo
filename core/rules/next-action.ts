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
): Promise<void> {
  const closed = await store.closeNextAction(actionId, closedAt);
  if (!closed) {
    throw new NextActionRuleError(`Next action ${actionId} does not exist or is already closed`);
  }
}
