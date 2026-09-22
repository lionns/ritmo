import type { Area, Owner, Project, Step } from "../model/entities.ts";
import type { Clock } from "../ports/clock.ts";
import type { IdGen } from "../ports/id-gen.ts";
import type { Store } from "../ports/store.ts";
import { buildStep, type StepFields } from "./step.ts";

export interface NewProject {
  ownerId: string;
  areaId: string;
  title: string;
  /** The first step. Kept in its own field: a project's title and a step's are both `title`. */
  firstStep: StepFields;
}

export interface ProjectCapResult {
  project: Project;
  activeCount: number;
  activeCap: number;
  countsAgainstCap: boolean;
}

export interface ProjectCreationResult extends ProjectCapResult {
  step: Step;
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
    finishedAt: null,
    id: ids.next(),
    ownerId: input.ownerId,
    areaId: area.id,
    objectiveId: null,
    title: input.title,
    state,
    externalDeadline: null,
    deadlineSource: null,
  };
  // A project is created with somewhere to start, and marked for nothing: creating it is not
  // deciding to work on it today (D-024, T-020 § Assumptions).
  const step = buildStep(
    ids,
    input.ownerId,
    project.id,
    clock.now().toISOString(),
    input.firstStep,
  );
  await store.createProjectWithStep(project, step);
  return {
    ...capResult(
      project,
      area,
      owner,
      currentCount + Number(area.countsAgainstCap && state === "active"),
    ),
    step,
  };
}

/**
 * Finishing is allowed on any day. `FR-14` fixes what is *active* within the week so the owner
 * stops churning their commitments; finishing records what happened, which is not a change of
 * plan and cannot wait for Monday without losing the moment (`D-025`).
 */
export async function finishProject(
  store: Store,
  clock: Clock,
  ownerId: string,
  id: string,
): Promise<ProjectCapResult> {
  const project = await readOwnedProject(store, ownerId, id);
  if (project.finishedAt !== null) {
    throw new ProjectRuleError(`Project ${id} is already finished`);
  }
  const finishedAt = clock.now().toISOString();
  if (!(await store.setProjectFinishedAt(id, ownerId, finishedAt))) {
    throw new ProjectRuleError(`Project ${id} could not be finished`);
  }
  return recount(store, ownerId, { ...project, finishedAt });
}

/**
 * Undoing returns the project to `shelved`, never straight to `active`: reopening the week's
 * fixed set is exactly what `FR-14` forbids. Monday is when it can become active again.
 */
export async function unfinishProject(
  store: Store,
  ownerId: string,
  id: string,
): Promise<ProjectCapResult> {
  const project = await readOwnedProject(store, ownerId, id);
  if (project.finishedAt === null) {
    throw new ProjectRuleError(`Project ${id} is not finished`);
  }
  if (!(await store.setProjectFinishedAt(id, ownerId, null))) {
    throw new ProjectRuleError(`Project ${id} could not be reopened`);
  }
  if (project.state !== "shelved") {
    await store.setProjectState(id, ownerId, "shelved");
  }
  return recount(store, ownerId, { ...project, finishedAt: null, state: "shelved" });
}

async function readOwnedProject(store: Store, ownerId: string, id: string): Promise<Project> {
  const project = await store.getProject(id);
  if (project === null || project.ownerId !== ownerId) {
    throw new ProjectRuleError(`Project ${id} does not exist`);
  }
  return project;
}

async function recount(
  store: Store,
  ownerId: string,
  project: Project,
): Promise<ProjectCapResult> {
  const [owner, area, projects, areas] = await Promise.all([
    store.getOwner(ownerId),
    store.getArea(project.areaId),
    store.listProjects(ownerId),
    store.listAreas(ownerId),
  ]);
  if (owner === null) throw new ProjectRuleError(`Owner ${ownerId} does not exist`);
  if (area === null) throw new ProjectRuleError(`Area ${project.areaId} does not exist`);
  const fresh = projects.map((value) => (value.id === project.id ? project : value));
  return capResult(project, area, owner, countCappedActiveProjects(fresh, areas));
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
  // A finished project's commitment is not the question any more: reopen it first (`D-025`).
  if (project.finishedAt !== null) {
    throw new ProjectRuleError(`Project ${projectId} is finished`);
  }
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

/**
 * A finished project is not carried, so it is not counted (`D-025`). The cap exists because too
 * many live goals are a resource problem (§11, §12); something that ended is not one of them.
 * Every reading of the cap goes through here, which is why the exclusion lives in one place.
 */
function countCappedActiveProjects(projects: Project[], areas: Area[]): number {
  const cappedAreaIds = new Set(areas.filter(({ countsAgainstCap }) => countsAgainstCap).map(({ id }) => id));
  return projects.filter(
    ({ areaId, state, finishedAt }) =>
      state === "active" && finishedAt === null && cappedAreaIds.has(areaId),
  ).length;
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
