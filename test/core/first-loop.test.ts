import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  Area,
  Entry,
  NextAction,
  Owner,
  Project,
} from "../../core/model/entities.ts";
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
    assert.equal(portfolio.progress[1].nextAction, null);
    assert.deepEqual(portfolio.outstanding.map(({ project }) => project.id), [quietProject.id]);
    assert.equal(
      [...portfolio.progress, ...portfolio.outstanding].some(
        ({ project }) => project.id === shelvedProject.id,
      ),
      false,
    );
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
const actionFor = (projectId: string): NextAction => ({
  id: `action-${projectId}`,
  ownerId: owner.id,
  projectId,
  trigger: "When ready",
  act: "Move it",
  obstacle: null,
  estimateMinutes: null,
  createdAt: "2026-08-20T12:00:00.000Z",
  closedAt: null,
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
    const action = actionFor(project.id);
    store.actions.set(action.id, action);
  }
  return store;
}

class MemoryStore implements Store {
  readonly owners = new Map<string, Owner>();
  readonly areas = new Map<string, Area>();
  readonly projects = new Map<string, Project>();
  readonly actions = new Map<string, NextAction>();
  readonly entries = new Map<string, Entry>();

  async createOwner(value: Owner) { this.owners.set(value.id, value); }
  async getOwner(id: string) { return this.owners.get(id) ?? null; }
  async createArea(value: Area) { this.areas.set(value.id, value); }
  async getArea(id: string) { return this.areas.get(id) ?? null; }
  async readAreas(areaIds: string[]) {
    return [...this.areas.values()].filter((value) => areaIds.includes(value.id));
  }
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
    return [...this.actions.values()].find(
      (value) => value.projectId === projectId && value.closedAt === null,
    ) ?? null;
  }
  async readOpenNextActions(projectIds: string[]) {
    return [...this.actions.values()].filter(
      (value) => projectIds.includes(value.projectId) && value.closedAt === null,
    );
  }
  async closeNextAction(id: string, closedAt: string) {
    const value = this.actions.get(id);
    if (value === undefined || value.closedAt !== null) return false;
    this.actions.set(id, { ...value, closedAt });
    return true;
  }
  async createEntry(value: Entry) { this.entries.set(value.id, value); }
  async readRecentEntries(projectIds: string[], occurredSince: string) {
    return [...this.entries.values()]
      .filter(
        (value) => projectIds.includes(value.projectId) && value.occurredAt >= occurredSince,
      )
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}
