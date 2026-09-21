import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Area, Entry, Owner, Project, Step } from "../../core/model/entities.ts";
import type { Store } from "../../core/ports/store.ts";
import {
  completeStep,
  markStepFor,
  readDayList,
  StepRuleError,
  unmarkStep,
  writeStep,
} from "../../core/rules/step.ts";

const clock = { now: () => new Date("2026-09-21T09:00:00.000Z") };

describe("writing a step", () => {
  it("trims the title and keeps the estimate optional", async () => {
    const store = new MemoryStore();
    await store.createProject(project);

    const written = await writeStep(store, clock, { next: () => "step-1" }, {
      ownerId: project.ownerId,
      projectId: project.id,
      title: "  Write the first paragraph  ",
      estimateMinutes: null,
    });

    assert.equal(written.title, "Write the first paragraph");
    assert.equal(written.estimateMinutes, null);
    assert.equal(written.markedFor, null, "a new step is not marked for anything");
    assert.deepEqual(await store.listOpenSteps(project.id), [written]);
  });

  it("refuses an empty title and a non-positive estimate", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    const fields = { ownerId: project.ownerId, projectId: project.id };

    await assert.rejects(
      writeStep(store, clock, { next: () => "step-x" }, { ...fields, title: "   ", estimateMinutes: null }),
      /title is required/,
    );
    await assert.rejects(
      writeStep(store, clock, { next: () => "step-x" }, { ...fields, title: "Something", estimateMinutes: 0 }),
      /positive integer/,
    );
    assert.deepEqual(await store.listOpenSteps(project.id), []);
  });
});

describe("the day list", () => {
  it("refuses to mark a step of a project that is not active, naming the project", async () => {
    const store = new MemoryStore();
    await store.createProject({ ...project, state: "shelved" });
    await store.createStep(step);

    await assert.rejects(
      markStepFor(store, step.id, owner.id, "2026-09-21"),
      (error: unknown) =>
        error instanceof StepRuleError && error.message.includes(project.id),
    );
    assert.equal((await store.getStep(step.id))?.markedFor, null);
  });

  it("moves an existing mark rather than holding two", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    await store.createStep(step);

    await markStepFor(store, step.id, owner.id, "2026-09-21");
    await markStepFor(store, step.id, owner.id, "2026-09-22");

    assert.equal((await store.getStep(step.id))?.markedFor, "2026-09-22");
    assert.deepEqual(await readDayList(store, owner.id, "2026-09-21"), []);
    assert.equal((await readDayList(store, owner.id, "2026-09-22")).length, 1);
  });

  it("returns none of yesterday's marks today, and counts nothing", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    await store.createStep(step);
    await markStepFor(store, step.id, owner.id, "2026-09-20");

    const today = await readDayList(store, owner.id, "2026-09-21");

    assert.deepEqual(today, [], "a mark that is not today's is not read");
    assert.equal((await store.getStep(step.id))?.doneAt, null, "and nothing was closed for it");
    assert.deepEqual(
      await store.listOpenSteps(project.id),
      [{ ...step, markedFor: "2026-09-20" }],
      "the step is simply back in the project's list",
    );
  });

  it("refuses an hour where a calendar date belongs", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    await store.createStep(step);

    await assert.rejects(
      markStepFor(store, step.id, owner.id, "2026-09-21T18:00:00.000Z"),
      /calendar date/,
    );
    await assert.rejects(readDayList(store, owner.id, "today"), /calendar date/);
  });

  it("lets the owner mark more steps in a day than the active cap, which is not about marks", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    assert.equal(owner.activeCap, 2);

    for (const id of ["step-1", "step-2", "step-3", "step-4", "step-5"]) {
      await store.createStep({ ...step, id });
      await markStepFor(store, id, owner.id, "2026-09-21");
    }

    assert.equal((await readDayList(store, owner.id, "2026-09-21")).length, 5);
  });

  it("unmarks without recording anything, and refuses a step already done", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    await store.createStep(step);
    await markStepFor(store, step.id, owner.id, "2026-09-21");

    await unmarkStep(store, step.id, owner.id);
    assert.deepEqual(await store.getStep(step.id), step);

    await completeStep(store, clock, step.id, owner.id);
    assert.equal((await store.getStep(step.id))?.doneAt, "2026-09-21T09:00:00.000Z");
    await assert.rejects(completeStep(store, clock, step.id, owner.id), /already done/);
    await assert.rejects(markStepFor(store, step.id, owner.id, "2026-09-22"), /already done/);
  });
});

const owner: Owner = { id: "owner-1", activeCap: 2, capRaises: [] };

const project: Project = {
  id: "project-1",
  ownerId: owner.id,
  areaId: "area-1",
  objectiveId: null,
  title: "Ship the skeleton",
  state: "active",
  externalDeadline: null,
  deadlineSource: null,
};

const step: Step = {
  id: "step-1",
  ownerId: owner.id,
  projectId: project.id,
  title: "Implement the first slice",
  estimateMinutes: 30,
  markedFor: null,
  createdAt: "2026-09-20T10:00:00.000Z",
  doneAt: null,
};

class MemoryStore implements Store {
  readonly projects = new Map<string, Project>();
  readonly steps = new Map<string, Step>();

  async createOwner(_value: Owner) { throw new Error("not used"); }
  async getOwner(_id: string) { return null; }
  async getOnlyOwner() { return null; }
  async updateOwnerCap(_id: string, _activeCap: number, _capRaises: Owner["capRaises"]) {
    throw new Error("not used");
  }
  async createArea(_value: Area) { throw new Error("not used"); }
  async getArea(_id: string) { return null; }
  async listAreas(_ownerId: string) { return []; }
  async readAreas(_areaIds: string[]) { return []; }
  async createProject(value: Project) { this.projects.set(value.id, value); }
  async createProjectWithStep(value: Project, step: Step) {
    this.projects.set(value.id, value);
    this.steps.set(step.id, step);
  }
  async getProject(id: string) { return this.projects.get(id) ?? null; }
  async listProjects(_ownerId: string) { return [...this.projects.values()]; }
  async listActiveProjects(_ownerId: string) {
    return [...this.projects.values()].filter((value) => value.state === "active");
  }
  async setProjectState(_id: string, _ownerId: string, _state: Project["state"]) {
    throw new Error("not used");
  }
  async hasClosedWeek(_ownerId: string) { return false; }
  async createStep(value: Step) { this.steps.set(value.id, value); }
  async getStep(id: string) { return this.steps.get(id) ?? null; }
  async listOpenSteps(projectId: string) {
    return [...this.steps.values()]
      .filter((value) => value.projectId === projectId && value.doneAt === null)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  async readStepsMarkedFor(ownerId: string, date: string) {
    return [...this.steps.values()].filter(
      (value) => value.ownerId === ownerId && value.markedFor === date && value.doneAt === null,
    );
  }
  async readOpenStepsWithProgress(projectIds: string[]) {
    return projectIds.flatMap((projectId) => {
      const steps = [...this.steps.values()]
        .filter((value) => value.projectId === projectId && value.doneAt === null)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      return steps.length === 0 ? [] : [{ projectId, steps, progressSincePlan: 0 }];
    });
  }
  async markStepFor(id: string, ownerId: string, date: string | null) {
    const value = this.steps.get(id);
    if (value === undefined || value.ownerId !== ownerId || value.doneAt !== null) return false;
    this.steps.set(id, { ...value, markedFor: date });
    return true;
  }
  async setStepDone(id: string, ownerId: string, doneAt: string) {
    const value = this.steps.get(id);
    if (value === undefined || value.ownerId !== ownerId || value.doneAt !== null) return false;
    this.steps.set(id, { ...value, doneAt });
    return true;
  }
  async createEntry(_value: Entry) { throw new Error("not used"); }
  async readRecentEntries(_projectIds: string[], _occurredSince: string) { return []; }
}
