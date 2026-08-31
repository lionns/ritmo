import type { Area, Entry, NextAction, Project } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { Store } from "../ports/store.ts";

export const RECENT_PROGRESS_DAYS = 14;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;

export interface PortfolioProject {
  project: Project;
  area: Area;
  recentEntries: Entry[];
  nextAction: NextAction;
}

export interface Portfolio {
  progress: PortfolioProject[];
  outstanding: PortfolioProject[];
}

export class PortfolioRuleError extends Error {
  override readonly name = "PortfolioRuleError";
}

export async function readPortfolio(
  store: Store,
  clock: Clock,
  ownerId: string,
): Promise<Portfolio> {
  const projects = await store.listActiveProjects(ownerId);
  const projectIds = projects.map(({ id }) => id);
  if (projectIds.length === 0) return { progress: [], outstanding: [] };

  const occurredSince = new Date(
    clock.now().getTime() - RECENT_PROGRESS_DAYS * DAY_MILLISECONDS,
  ).toISOString();
  const areaIds = [...new Set(projects.map(({ areaId }) => areaId))];
  const [entries, actions, areas] = await Promise.all([
    store.readRecentEntries(projectIds, occurredSince),
    store.readOpenNextActions(projectIds),
    Promise.all(areaIds.map((areaId) => store.getArea(areaId))),
  ]);

  const entriesByProject = groupEntries(entries);
  const actionsByProject = new Map(actions.map((action) => [action.projectId, action]));
  const areasById = new Map(
    areas.filter((area): area is Area => area !== null).map((area) => [area.id, area]),
  );
  const assembled = projects.map((project) =>
    assembleProject(project, entriesByProject, actionsByProject, areasById),
  );

  const progress = assembled
    .filter(({ recentEntries }) => recentEntries.length > 0)
    .sort((left, right) =>
      right.recentEntries[0].occurredAt.localeCompare(left.recentEntries[0].occurredAt),
    );
  const outstanding = assembled.filter(({ recentEntries }) => recentEntries.length === 0);
  return { progress, outstanding };
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
  actionsByProject: Map<string, NextAction>,
  areasById: Map<string, Area>,
): PortfolioProject {
  const area = areasById.get(project.areaId);
  if (area === undefined) {
    throw new PortfolioRuleError(`Active project ${project.id} has no area ${project.areaId}`);
  }
  const nextAction = actionsByProject.get(project.id);
  if (nextAction === undefined) {
    throw new PortfolioRuleError(`Active project ${project.id} has no open next action`);
  }
  return {
    project,
    area,
    recentEntries: entriesByProject.get(project.id) ?? [],
    nextAction,
  };
}
