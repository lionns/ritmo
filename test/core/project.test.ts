import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Area, Entry, NextAction, Owner, Project } from "../../core/model/entities.ts";
import type { Store } from "../../core/ports/store.ts";
import {
  changeProjectState,
  createProjectWithinCap,
  updateActiveCap,
} from "../../core/rules/project.ts";

describe("the active project cap", () => {
  it("shelves capped overflow while keeping fixed-job projects active", async () => {
    const store = populatedStore();
    let sequence = 0;
    const ids = { next: () => `project-${++sequence}` };
    const clock = { now: () => new Date("2026-09-02T10:00:00.000Z") };

    const first = await createProjectWithinCap(
      store,
      clock,
      ids,
      newProject(cappedArea.id, "First"),
    );
    const second = await createProjectWithinCap(
      store,
      clock,
      ids,
      newProject(cappedArea.id, "Second"),
    );
    const overflow = await createProjectWithinCap(
      store,
      clock,
      ids,
      newProject(cappedArea.id, "Overflow"),
    );
    const fixedJob = await createProjectWithinCap(
      store,
      clock,
      ids,
      newProject(fixedArea.id, "Fixed job"),
    );

    assert.equal(first.project.state, "active");
    assert.equal(second.project.state, "active");
    assert.equal(overflow.project.state, "shelved");
    assert.equal(overflow.activeCount, 2);
    assert.equal(fixedJob.project.state, "active");
    assert.equal(fixedJob.activeCount, 2);
    assert.equal(fixedJob.countsAgainstCap, false);
    assert.equal(store.actions.size, 4);
    assert.deepEqual(first.nextAction, {
      id: "project-2",
      ownerId: owner.id,
      projectId: first.project.id,
      trigger: "When the project opens",
      act: "Take the next step",
      obstacle: null,
      estimateMinutes: null,
      createdAt: "2026-09-02T10:00:00.000Z",
      closedAt: null,
    });
  });

  it("allows setup-time state changes only while they respect the cap and no week is closed", async () => {
    const store = populatedStore();
    store.projects.set("active", project("active", cappedArea.id, "active"));
    store.projects.set("shelved", project("shelved", cappedArea.id, "shelved"));

    const promoted = await changeProjectState(store, owner.id, "shelved", "active");
    assert.equal(promoted.project.state, "active");
    assert.equal(promoted.activeCount, 2);

    store.projects.set("third", project("third", cappedArea.id, "shelved"));
    await assert.rejects(
      changeProjectState(store, owner.id, "third", "active"),
      /2 of 2 capped projects are active/,
    );

    store.closedWeek = true;
    await assert.rejects(
      changeProjectState(store, owner.id, "active", "shelved"),
      /week boundary/,
    );
  });

  it("records cap raises and refuses a cap below the active capped count", async () => {
    const store = populatedStore();
    store.projects.set("active-1", project("active-1", cappedArea.id, "active"));
    store.projects.set("active-2", project("active-2", cappedArea.id, "active"));
    const clock = { now: () => new Date("2026-09-02T12:00:00.000Z") };

    await assert.rejects(updateActiveCap(store, clock, owner.id, 1), /2 capped projects/);
    const raised = await updateActiveCap(store, clock, owner.id, 4);

    assert.equal(raised.activeCap, 4);
    assert.deepEqual(raised.capRaises, [{ amount: 2, raisedAt: "2026-09-02" }]);
    assert.deepEqual(await store.getOwner(owner.id), raised);
  });
});

const owner: Owner = { id: "owner-1", activeCap: 2, capRaises: [] };
const cappedArea: Area = {
  id: "area-capped",
  ownerId: owner.id,
  name: "Studio",
  countsAgainstCap: true,
};
const fixedArea: Area = {
  id: "area-fixed",
  ownerId: owner.id,
  name: "Day job",
  countsAgainstCap: false,
};

function project(id: string, areaId: string, state: Project["state"]): Project {
  return {
    id,
    ownerId: owner.id,
    areaId,
    objectiveId: null,
    title: id,
    state,
    externalDeadline: null,
    deadlineSource: null,
  };
}

function newProject(areaId: string, title: string) {
  return {
    ownerId: owner.id,
    areaId,
    title,
    trigger: "When the project opens",
    act: "Take the next step",
    obstacle: null,
    estimateMinutes: null,
  };
}

function populatedStore(): MemoryStore {
  const store = new MemoryStore();
  store.owners.set(owner.id, owner);
  store.areas.set(cappedArea.id, cappedArea);
  store.areas.set(fixedArea.id, fixedArea);
  return store;
}

class MemoryStore implements Store {
  readonly owners = new Map<string, Owner>();
  readonly areas = new Map<string, Area>();
  readonly projects = new Map<string, Project>();
  readonly actions = new Map<string, NextAction>();
  closedWeek = false;

  async createOwner(value: Owner) { this.owners.set(value.id, value); }
  async getOwner(id: string) { return this.owners.get(id) ?? null; }
  async getOnlyOwner() { return [...this.owners.values()][0] ?? null; }
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
  async createProjectWithNextAction(value: Project, action: NextAction) {
    this.projects.set(value.id, value);
    this.actions.set(action.id, action);
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
  async setProjectState(id: string, ownerId: string, state: Project["state"]) {
    const value = this.projects.get(id);
    if (value !== undefined && value.ownerId === ownerId) {
      this.projects.set(id, { ...value, state });
    }
  }
  async hasClosedWeek(_ownerId: string) { return this.closedWeek; }
  async createNextAction(_value: NextAction) { throw new Error("not used"); }
  async getNextAction(_id: string) { return null; }
  async findOpenNextAction(_projectId: string) { return null; }
  async readOpenNextActionsWithProgress(_projectIds: string[]) { return []; }
  async replaceNextAction(_id: string, _closedAt: string, _replacement: NextAction) {
    return false;
  }
  async createEntry(_value: Entry) { throw new Error("not used"); }
  async readRecentEntries(_projectIds: string[], _occurredSince: string) { return []; }
}
