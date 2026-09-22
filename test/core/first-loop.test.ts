import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Area, Entry, Owner, Project, Step } from "../../core/model/entities.ts";
import type { Clock } from "../../core/ports/clock.ts";
import type { IdGen } from "../../core/ports/id-gen.ts";
import type { Store } from "../../core/ports/store.ts";
import { createProgressEntry } from "../../core/rules/entry.ts";
import { readPortfolio, RECENT_PROGRESS_DAYS } from "../../core/rules/portfolio.ts";

describe("the first portfolio loop", () => {
  it("puts recently moved projects before outstanding projects and excludes old entries", async () => {
    const store = populatedStore();
    const occurredSince =
      clock.now().getTime() - RECENT_PROGRESS_DAYS * 24 * 60 * 60 * 1_000;
    const justOutside: Entry = {
      ...entry,
      id: "entry-just-outside",
      occurredAt: new Date(occurredSince - 1).toISOString(),
    };
    const justInside: Entry = {
      ...entry,
      id: "entry-just-inside",
      occurredAt: new Date(occurredSince + 1).toISOString(),
    };
    store.entries.set(justOutside.id, justOutside);
    store.entries.set(justInside.id, justInside);
    store.entries.set(entry.id, entry);
    store.entries.set(actionlessEntry.id, actionlessEntry);

    const portfolio = await readPortfolio(store, clock, owner.id);

    assert.equal(RECENT_PROGRESS_DAYS, 28);
    assert.deepEqual(portfolio.progress.map(({ project }) => project.id), [
      activeProject.id,
      actionlessProject.id,
    ]);
    assert.deepEqual(portfolio.progress[0].recentEntries, [entry, justInside]);
    assert.equal(
      portfolio.progress[0].recentEntries.some(({ id }) => id === justOutside.id),
      false,
    );
    assert.deepEqual(portfolio.progress[1].openSteps, [], "no step, no plan open");
    assert.equal(portfolio.progress[0].progressSincePlan, 1);
    assert.equal(portfolio.progress[1].progressSincePlan, 0);
    assert.deepEqual(portfolio.outstanding.map(({ project }) => project.id), [quietProject.id]);
    assert.equal(
      [...portfolio.progress, ...portfolio.outstanding].some(
        ({ project }) => project.id === shelvedProject.id,
      ),
      false,
    );
    assert.deepEqual(portfolio.shelved.map(({ project }) => project.id), [
      shelvedProject.id,
    ]);
  });

  it("accepts an entry without effort or note and rejects missing or shelved projects", async () => {
    const store = populatedStore();
    const ids: IdGen = { next: () => "entry-new" };

    const created = await createProgressEntry(store, clock, ids, {
      ownerId: owner.id,
      projectId: activeProject.id,
      what: "Moved the first loop",
      effortMinutes: null,
      note: null,
    });

    assert.equal(created.effortMinutes, null);
    assert.equal(created.note, null);
    assert.deepEqual(store.entries.get(created.id), created);
    const count = store.entries.size;
    await assert.rejects(
      createProgressEntry(store, clock, ids, {
        ownerId: owner.id,
        projectId: "missing-project",
        what: "Should not write",
        effortMinutes: null,
        note: null,
      }),
      /Project missing-project/,
    );
    await assert.rejects(
      createProgressEntry(store, clock, ids, {
        ownerId: owner.id,
        projectId: shelvedProject.id,
        what: "Should not write",
        effortMinutes: null,
        note: null,
      }),
      new RegExp(`Project ${shelvedProject.id} is shelved`),
    );
    assert.equal(store.entries.size, count);
  });
});

const owner: Owner = { id: "owner-1", activeCap: 3, capRaises: [] };
const area: Area = {
  id: "area-1",
  ownerId: owner.id,
  name: "Studio",
  countsAgainstCap: true,
};
const projectBase: Project = {
  id: "project-base",
  ownerId: owner.id,
  areaId: area.id,
  objectiveId: null,
  title: "Base",
  state: "active",
  externalDeadline: null,
  deadlineSource: null,
  finishedAt: null,
};
const activeProject: Project = { ...projectBase, id: "project-active", title: "Active" };
const quietProject: Project = { ...projectBase, id: "project-quiet", title: "Quiet" };
const actionlessProject: Project = {
  ...projectBase,
  id: "project-actionless",
  title: "Needs a next action",
};
const shelvedProject: Project = {
  ...projectBase,
  id: "project-shelved",
  title: "Shelved",
  state: "shelved",
};
const stepFor = (projectId: string): Step => ({
  id: `step-${projectId}`,
  ownerId: owner.id,
  projectId,
  title: "Move it",
  estimateMinutes: null,
  markedFor: null,
  createdAt: "2026-08-20T12:00:00.000Z",
  doneAt: null,
});
const entry: Entry = {
  id: "entry-recent",
  ownerId: owner.id,
  kind: "progress",
  projectId: activeProject.id,
  creditsObjectiveId: null,
  occurredAt: "2026-08-30T12:00:00.000Z",
  what: "Moved it",
  effortMinutes: null,
  note: null,
  stepId: null,
};
const actionlessEntry: Entry = {
  ...entry,
  id: "entry-actionless",
  projectId: actionlessProject.id,
  occurredAt: "2026-08-29T12:00:00.000Z",
};
const clock: Clock = { now: () => new Date("2026-08-30T12:00:00.000Z") };

function populatedStore(): MemoryStore {
  const store = new MemoryStore();
  store.owners.set(owner.id, owner);
  store.areas.set(area.id, area);
  for (const project of [activeProject, quietProject, actionlessProject, shelvedProject]) {
    store.projects.set(project.id, project);
  }
  for (const project of [activeProject, quietProject]) {
    const step = stepFor(project.id);
    store.steps.set(step.id, step);
  }
  return store;
}

class MemoryStore implements Store {
  readonly owners = new Map<string, Owner>();
  readonly areas = new Map<string, Area>();
  readonly projects = new Map<string, Project>();
  readonly steps = new Map<string, Step>();
  readonly entries = new Map<string, Entry>();

  async createOwner(value: Owner) { this.owners.set(value.id, value); }
  async getOwner(id: string) { return this.owners.get(id) ?? null; }
  async getOnlyOwner() {
    const owners = [...this.owners.values()];
    if (owners.length > 1) throw new Error("more than one owner");
    return owners[0] ?? null;
  }
  async updateOwnerCap(id: string, activeCap: number, capRaises: Owner["capRaises"]) {
    const value = this.owners.get(id);
    if (value !== undefined) this.owners.set(id, { ...value, activeCap, capRaises });
  }
  async createArea(value: Area) { this.areas.set(value.id, value); }
  async getArea(id: string) { return this.areas.get(id) ?? null; }
  async listAreas(ownerId: string) {
    return [...this.areas.values()].filter((value) => value.ownerId === ownerId);
  }
  async readAreas(areaIds: string[]) {
    return [...this.areas.values()].filter((value) => areaIds.includes(value.id));
  }
  async createProject(value: Project) { this.projects.set(value.id, value); }
  async createProjectWithStep(value: Project, step: Step) {
    this.projects.set(value.id, value);
    this.steps.set(step.id, step);
  }
  async getProject(id: string) { return this.projects.get(id) ?? null; }
  async listProjects(ownerId: string) {
    return [...this.projects.values()].filter((value) => value.ownerId === ownerId);
  }
  async listActiveProjects(ownerId: string) {
    return [...this.projects.values()].filter(
      (value) => value.ownerId === ownerId && value.state === "active",
    );
  }
  async setProjectFinishedAt(id: string, ownerId: string, finishedAt: string | null) {
    const value = this.projects.get(id);
    if (value === undefined || value.ownerId !== ownerId) return false;
    this.projects.set(id, { ...value, finishedAt });
    return true;
  }
  async setProjectState(id: string, ownerId: string, state: Project["state"]) {
    const value = this.projects.get(id);
    if (value !== undefined && value.ownerId === ownerId) {
      this.projects.set(id, { ...value, state });
    }
  }
  async hasClosedWeek(_ownerId: string) { return false; }
  async createStep(_value: Step) { throw new Error("not used"); }
  async getStep(_id: string) { return null; }
  async listOpenSteps(_projectId: string) { return []; }
  async readStepsMarkedFor(_ownerId: string, _date: string) { return []; }
  async readOpenStepsWithProgress(projectIds: string[]) {
    return projectIds.flatMap((projectId) => {
      const steps = [...this.steps.values()]
        .filter((value) => value.projectId === projectId && value.doneAt === null)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      if (steps.length === 0) return [];
      const openedAt = steps[0].createdAt;
      return [{
        projectId,
        steps,
        progressSincePlan: [...this.entries.values()].filter(
          (value) =>
            value.projectId === projectId &&
            value.kind === "progress" &&
            value.occurredAt >= openedAt,
        ).length,
      }];
    });
  }
  async markStepFor(_id: string, _ownerId: string, _date: string | null) { return false; }
  async setStepDone(_id: string, _ownerId: string, _doneAt: string) { return false; }
  async createEntry(value: Entry) { this.entries.set(value.id, value); }
  async readProjectEntries(projectId: string, limit: number) {
    return [...this.entries.values()]
      .filter((value) => value.projectId === projectId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, limit);
  }
  async readCalibrationSamples(_ownerId: string, _limit: number) { return []; }
  async readDoneSteps(_projectId: string, _limit: number) { return []; }
  async readEffortForStep(stepId: string) {
    return [...this.entries.values()]
      .filter((value) => value.stepId === stepId && value.kind === "progress")
      .reduce((total, value) => total + (value.effortMinutes ?? 0), 0);
  }
  async readRecentEntries(projectIds: string[], occurredSince: string) {
    return [...this.entries.values()]
      .filter(
        (value) => projectIds.includes(value.projectId) && value.occurredAt >= occurredSince,
      )
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}
