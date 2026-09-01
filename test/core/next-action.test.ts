import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Area, Entry, NextAction, Owner, Project } from "../../core/model/entities.ts";
import type { Store } from "../../core/ports/store.ts";
import { closeNextAction, createNextAction } from "../../core/rules/next-action.ts";

describe("the open next-action rule", () => {
  it("rejects a second open action and names the existing id", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    await createNextAction(store, firstAction);

    await assert.rejects(
      createNextAction(store, { ...firstAction, id: "action-2" }),
      /action-1/,
    );
  });

  it("keeps a closed action readable and accepts its replacement", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    await createNextAction(store, firstAction);
    const replacement = { ...firstAction, id: "action-2", createdAt: "2026-09-01T12:00:01.000Z" };
    await closeNextAction(
      store,
      firstAction.id,
      "2026-09-01T12:00:00.000Z",
      replacement,
    );

    assert.equal((await store.getNextAction(firstAction.id))?.closedAt, "2026-09-01T12:00:00.000Z");
    assert.deepEqual(await store.findOpenNextAction(project.id), replacement);
    await assert.rejects(
      closeNextAction(
        store,
        firstAction.id,
        "2026-09-01T12:00:02.000Z",
        { ...replacement, id: "action-3" },
      ),
      /action-1/,
    );
    assert.deepEqual(await store.findOpenNextAction(project.id), replacement);
  });

  it("rejects a replacement born before the action closes", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    await createNextAction(store, firstAction);

    await assert.rejects(
      closeNextAction(store, firstAction.id, "2026-09-01T12:00:00.000Z", {
        ...firstAction,
        id: "action-2",
      }),
      /cannot open before/,
    );
    assert.deepEqual(await store.findOpenNextAction(project.id), firstAction);
  });

  it("maps an atomic replace miss to a rule error", async () => {
    const store = new MemoryStore();
    await store.createProject(project);
    await createNextAction(store, firstAction);
    store.missNextReplace = true;

    await assert.rejects(
      closeNextAction(store, firstAction.id, "2026-09-01T12:00:00.000Z", {
        ...firstAction,
        id: "action-2",
        createdAt: "2026-09-01T12:00:01.000Z",
      }),
      /already closed/,
    );
    assert.deepEqual(await store.findOpenNextAction(project.id), firstAction);
  });
});

const project: Project = {
  id: "project-1",
  ownerId: "owner-1",
  areaId: "area-1",
  objectiveId: null,
  title: "Ship the skeleton",
  state: "active",
  externalDeadline: null,
  deadlineSource: null,
};

const firstAction: NextAction = {
  id: "action-1",
  ownerId: "owner-1",
  projectId: project.id,
  trigger: "When the baseline is green",
  act: "Implement the first slice",
  obstacle: null,
  estimateMinutes: 30,
  createdAt: "2026-09-01T10:00:00.000Z",
  closedAt: null,
};

class MemoryStore implements Store {
  readonly projects = new Map<string, Project>();
  readonly actions = new Map<string, NextAction>();
  missNextReplace = false;

  async createOwner(_value: Owner) { throw new Error("not used"); }
  async getOwner(_id: string) { return null; }
  async createArea(_value: Area) { throw new Error("not used"); }
  async getArea(_id: string) { return null; }
  async readAreas(_areaIds: string[]) { return []; }
  async createProject(value: Project) { this.projects.set(value.id, value); }
  async getProject(id: string) { return this.projects.get(id) ?? null; }
  async listActiveProjects(ownerId: string) {
    return [...this.projects.values()].filter(
      (value) => value.ownerId === ownerId && value.state === "active",
    );
  }
  async createNextAction(value: NextAction) { this.actions.set(value.id, value); }
  async getNextAction(id: string) { return this.actions.get(id) ?? null; }
  async findOpenNextAction(projectId: string) {
    return [...this.actions.values()].find((value) => value.projectId === projectId && value.closedAt === null) ?? null;
  }
  async readOpenNextActionsWithProgress(projectIds: string[]) {
    return [...this.actions.values()].filter(
      (value) => projectIds.includes(value.projectId) && value.closedAt === null,
    ).map((action) => ({ action, progressSincePlan: 0 }));
  }
  async replaceNextAction(id: string, closedAt: string, replacement: NextAction) {
    if (this.missNextReplace) {
      this.missNextReplace = false;
      return false;
    }
    const value = this.actions.get(id);
    if (value === undefined || value.closedAt !== null) return false;
    if (this.actions.has(replacement.id)) throw new Error("duplicate action");
    this.actions.set(id, { ...value, closedAt });
    this.actions.set(replacement.id, replacement);
    return true;
  }
  async createEntry(_value: Entry) { throw new Error("not used"); }
  async readRecentEntries(_projectIds: string[], _occurredSince: string) { return []; }
}
