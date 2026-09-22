import type { Area, Entry, Project, Step } from "../model/entities.ts";
import type { Store } from "../ports/store.ts";

/**
 * How far the project screen reads back. A page that renders years on every open contradicts
 * `NFR-2`'s fast first render, and no requirement asks for the whole log here. Twenty is the same
 * starting value `data-model.md` § Derived values picked for calibration, for the same reason:
 * bounded, and revisable on evidence rather than on taste.
 */
export const PROJECT_HISTORY_LIMIT = 20;

export interface DoneStep {
  step: Step;
  /** What was attributed to it (`D-027`). Zero means unknown, and the screen says nothing. */
  effortMinutes: number;
}

export interface ProjectDetail {
  project: Project;
  area: Area;
  /** Every open step, oldest first. The screen marks and completes from this list. */
  openSteps: Step[];
  recentEntries: Entry[];
  /** Closed steps, newest first, each with the effort attributed to it. */
  doneSteps: DoneStep[];
}

export class ProjectDetailRuleError extends Error {
  override readonly name = "ProjectDetailRuleError";
}

export async function readProjectDetail(
  store: Store,
  ownerId: string,
  projectId: string,
): Promise<ProjectDetail> {
  const project = await store.getProject(projectId);
  if (project === null || project.ownerId !== ownerId) {
    throw new ProjectDetailRuleError(`Project ${projectId} does not exist`);
  }
  const [area, openSteps, recentEntries, closed] = await Promise.all([
    store.getArea(project.areaId),
    store.listOpenSteps(project.id),
    store.readProjectEntries(project.id, PROJECT_HISTORY_LIMIT),
    store.readDoneSteps(project.id, PROJECT_HISTORY_LIMIT),
  ]);
  if (area === null) {
    throw new ProjectDetailRuleError(`Project ${project.id} has no area ${project.areaId}`);
  }
  // A step's actual is read one by one rather than joined: `readEffortForStep` is the single
  // definition of what a step took (`D-027`), and the list is bounded to twenty.
  const doneSteps = await Promise.all(
    closed.map(async (step) => ({ step, effortMinutes: await store.readEffortForStep(step.id) })),
  );
  return { project, area, openSteps, recentEntries, doneSteps };
}
