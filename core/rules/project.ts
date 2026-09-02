import type { Area, NextAction, Owner, Project } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { IdGen } from "../ports/id-gen.ts";
import type { Store } from "../ports/store.ts";
import {
  buildOpenNextAction,
  type NextActionFields,
} from "./next-action.ts";

export interface NewProject extends NextActionFields {
  ownerId: string;
  areaId: string;
  title: string;
}

export interface ProjectCapResult {
  project: Project;
  activeCount: number;
  activeCap: number;
  countsAgainstCap: boolean;
}

export interface ProjectCreationResult extends ProjectCapResult {
  nextAction: NextAction;
}

export class ProjectRuleError extends Error {
  override readonly name = "ProjectRuleError";
}

export async function createProjectWithinCap(
  store: Store,
  clock: Clock,
  ids: IdGen,
  input: NewProject,
): Promise<ProjectCreationResult> {
  const [owner, area, projects, areas] = await Promise.all([
    store.getOwner(input.ownerId),
    store.getArea(input.areaId),
    store.listProjects(input.ownerId),
    store.listAreas(input.ownerId),
  ]);
  if (owner === null) throw new ProjectRuleError(`Owner ${input.ownerId} does not exist`);
  if (area === null || area.ownerId !== input.ownerId) {
    throw new ProjectRuleError(`Area ${input.areaId} does not exist`);
  }

  const currentCount = countCappedActiveProjects(projects, areas);
  const state: Project["state"] =
    area.countsAgainstCap && currentCount >= owner.activeCap ? "shelved" : "active";
  const project: Project = {
    id: ids.next(),
    ownerId: input.ownerId,
    areaId: area.id,
    objectiveId: null,
    title: input.title,
    state,
    externalDeadline: null,
    deadlineSource: null,
  };
  const nextAction = buildOpenNextAction(
    ids,
    input.ownerId,
    project.id,
    clock.now().toISOString(),
    input,
  );
  await store.createProjectWithNextAction(project, nextAction);
  return {
    ...capResult(
      project,
      area,
      owner,
      currentCount + Number(area.countsAgainstCap && state === "active"),
    ),
    nextAction,
  };
}

export async function changeProjectState(
  store: Store,
  ownerId: string,
  projectId: string,
  state: Project["state"],
): Promise<ProjectCapResult> {
  const [owner, project, projects, areas] = await Promise.all([
    store.getOwner(ownerId),
    store.getProject(projectId),
    store.listProjects(ownerId),
    store.listAreas(ownerId),
  ]);
  if (owner === null) throw new ProjectRuleError(`Owner ${ownerId} does not exist`);
  if (project === null || project.ownerId !== ownerId) {
    throw new ProjectRuleError(`Project ${projectId} does not exist`);
  }
  const area = areas.find(({ id }) => id === project.areaId);
  if (area === undefined) throw new ProjectRuleError(`Area ${project.areaId} does not exist`);
  const currentCount = countCappedActiveProjects(projects, areas);
  if (project.state === state) return capResult(project, area, owner, currentCount);
  if (await store.hasClosedWeek(ownerId)) {
    throw new ProjectRuleError("Project state changes belong to a week boundary");
  }
  if (state === "active" && area.countsAgainstCap && currentCount >= owner.activeCap) {
    throw new ProjectRuleError(`${currentCount} of ${owner.activeCap} capped projects are active`);
  }

  await store.setProjectState(project.id, ownerId, state);
  const changed = { ...project, state };
  const activeCount = currentCount + (area.countsAgainstCap ? (state === "active" ? 1 : -1) : 0);
  return capResult(changed, area, owner, activeCount);
}

export async function updateActiveCap(
  store: Store,
  clock: Clock,
  ownerId: string,
  activeCap: number,
): Promise<Owner> {
  const [owner, projects, areas] = await Promise.all([
    store.getOwner(ownerId),
    store.listProjects(ownerId),
    store.listAreas(ownerId),
  ]);
  if (owner === null) throw new ProjectRuleError(`Owner ${ownerId} does not exist`);
  const activeCount = countCappedActiveProjects(projects, areas);
  if (activeCap < activeCount) {
    throw new ProjectRuleError(`${activeCount} capped projects are active`);
  }
  if (activeCap === owner.activeCap) return owner;

  const updated: Owner = {
    ...owner,
    activeCap,
    capRaises:
      activeCap > owner.activeCap
        ? [...owner.capRaises, { amount: activeCap - owner.activeCap, raisedAt: clock.now().toISOString().slice(0, 10) }]
        : owner.capRaises,
  };
  await store.updateOwnerCap(owner.id, updated.activeCap, updated.capRaises);
  return updated;
}

function countCappedActiveProjects(projects: Project[], areas: Area[]): number {
  const cappedAreaIds = new Set(areas.filter(({ countsAgainstCap }) => countsAgainstCap).map(({ id }) => id));
  return projects.filter(({ areaId, state }) => state === "active" && cappedAreaIds.has(areaId)).length;
}

function capResult(
  project: Project,
  area: Area,
  owner: Owner,
  activeCount: number,
): ProjectCapResult {
  return {
    project,
    activeCount,
    activeCap: owner.activeCap,
    countsAgainstCap: area.countsAgainstCap,
  };
}
