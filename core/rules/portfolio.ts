import type { Area, Entry, Project, Step } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { Store } from "../ports/store.ts";

export const RECENT_PROGRESS_DAYS = 28;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;


export interface PortfolioProject {
  project: Project;
  area: Area;
  recentEntries: Entry[];
  /** Every open step, oldest first. What is marked for today is the subset the row renders. */
  openSteps: Step[];
  /**
   * Entries logged since the **oldest open step** was written — "since the current plan opened"
   * read against a list rather than a single action (`design-handoff.md` § The Project Row,
   * `D-024`). A project with no open steps has no plan open, and counts zero.
   */
  progressSincePlan: number;
}

export interface Portfolio {
  progress: PortfolioProject[];
  outstanding: PortfolioProject[];
  shelved: PortfolioProject[];
}

export class PortfolioRuleError extends Error {
  override readonly name = "PortfolioRuleError";
}

export async function readPortfolio(
  store: Store,
  clock: Clock,
  ownerId: string,
): Promise<Portfolio> {
  const projects = await store.listProjects(ownerId);
  const projectIds = projects.map(({ id }) => id);
  if (projectIds.length === 0) return { progress: [], outstanding: [], shelved: [] };

  const occurredSince = new Date(
    clock.now().getTime() - RECENT_PROGRESS_DAYS * DAY_MILLISECONDS,
  ).toISOString();
  const areaIds = [...new Set(projects.map(({ areaId }) => areaId))];
  const activeProjectIds = projects.filter(({ state }) => state === "active").map(({ id }) => id);
  const [entries, stepReads, areas] = await Promise.all([
    store.readRecentEntries(projectIds, occurredSince),
    store.readOpenStepsWithProgress(activeProjectIds),
    store.readAreas(areaIds),
  ]);

  const entriesByProject = groupEntries(entries);
  const areasById = new Map(areas.map((area) => [area.id, area]));
  const stepsByProject = new Map(stepReads.map((read) => [read.projectId, read.steps]));
  const progressByProject = new Map(
    stepReads.map(({ projectId, progressSincePlan }) => [projectId, progressSincePlan]),
  );
  const assembled = projects.map((project) =>
    assembleProject(
      project,
      entriesByProject,
      stepsByProject,
      areasById,
      progressByProject,
    ),
  );

  // A finished project enters no group (`D-026`). "En movimiento" claims it will move again and
  // "para cuando vuelvas" claims it will come back; neither is true of it, so the landing drops
  // it and `/p/:id` and `/archivo` are where it stays reachable.
  const live = assembled.filter(({ project }) => project.finishedAt === null);
  const active = live.filter(({ project }) => project.state === "active");
  const progress = active
    .filter(({ recentEntries }) => recentEntries.length > 0)
    .sort((left, right) =>
      right.recentEntries[0].occurredAt.localeCompare(left.recentEntries[0].occurredAt),
    );
  const outstanding = active.filter(({ recentEntries }) => recentEntries.length === 0);
  const shelved = live
    .filter(({ project }) => project.state === "shelved")
    .sort((left, right) => left.project.id.localeCompare(right.project.id));
  return { progress, outstanding, shelved };
}

function groupEntries(entries: Entry[]): Map<string, Entry[]> {
  const grouped = new Map<string, Entry[]>();
  for (const entry of entries) {
    const projectEntries = grouped.get(entry.projectId) ?? [];
    projectEntries.push(entry);
    grouped.set(entry.projectId, projectEntries);
  }
  for (const projectEntries of grouped.values()) {
    projectEntries.sort(
      (left, right) =>
        right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id),
    );
  }
  return grouped;
}

function assembleProject(
  project: Project,
  entriesByProject: Map<string, Entry[]>,
  stepsByProject: Map<string, Step[]>,
  areasById: Map<string, Area>,
  progressByProject: Map<string, number>,
): PortfolioProject {
  const area = areasById.get(project.areaId);
  if (area === undefined) {
    throw new PortfolioRuleError(`Project ${project.id} has no area ${project.areaId}`);
  }
  return {
    project,
    area,
    recentEntries: entriesByProject.get(project.id) ?? [],
    openSteps: stepsByProject.get(project.id) ?? [],
    progressSincePlan: progressByProject.get(project.id) ?? 0,
  };
}
