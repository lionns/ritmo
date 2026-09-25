import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Area, Entry, Owner, Project, Step } from "../../core/model/entities.ts";
import type { Store } from "../../core/ports/store.ts";
import {
  changeProjectState,
  finishProject,
  unfinishProject,
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
    assert.equal(store.steps.size, 4, "every project is born with somewhere to start");
    assert.deepEqual(first.step, {
      id: "project-2",
      ownerId: owner.id,
      projectId: first.project.id,
      title: "Take the next step",
      estimateMinutes: null,
      markedFor: null,
      createdAt: "2026-09-02T10:00:00.000Z",
      doneAt: null,
    });
  });

  it("allows setup-time state changes only while they respect the cap and no week is closed", async () => {
    const clock = { now: () => new Date(2026, 8, 23, 12) };
    const store = populatedStore();
    store.projects.set("active", project("active", cappedArea.id, "active"));
    store.projects.set("shelved", project("shelved", cappedArea.id, "shelved"));

    const promoted = await changeProjectState(store, clock, owner.id, "shelved", "active");
    assert.equal(promoted.project.state, "active");
    assert.equal(promoted.activeCount, 2);

    store.projects.set("third", project("third", cappedArea.id, "shelved"));
    await assert.rejects(
      changeProjectState(store, clock, owner.id, "third", "active"),
      /2 of 2 capped projects are active/,
    );

    store.closedWeek = true;
    await assert.rejects(
      changeProjectState(store, clock, owner.id, "active", "shelved"),
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

const owner: Owner = { id: "owner-1", activeCap: 2, capRaises: [], timeZone: null };
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
    finishedAt: null,
  };
}

function newProject(areaId: string, title: string) {
  return {
    ownerId: owner.id,
    areaId,
    title,
    firstStep: { title: "Take the next step", estimateMinutes: null },
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
  async openWeek(): Promise<never> { throw new Error("Not used in this suite"); }
  async getWeek(): Promise<never> { throw new Error("Not used in this suite"); }
  async getWeekStartingOn(): Promise<never> { throw new Error("Not used in this suite"); }
  async closeWeek(): Promise<never> { throw new Error("Not used in this suite"); }
  async listCommitments(): Promise<never> { throw new Error("Not used in this suite"); }
  async writeCommitment(): Promise<never> { throw new Error("Not used in this suite"); }
  async spendReserve(): Promise<never> { throw new Error("Not used in this suite"); }
  async readWeekEntries(): Promise<never> { throw new Error("Not used in this suite"); }
  readonly owners = new Map<string, Owner>();
  readonly areas = new Map<string, Area>();
  readonly projects = new Map<string, Project>();
  readonly steps = new Map<string, Step>();
  closedWeek = false;

  async createOwner(value: Owner) { this.owners.set(value.id, value); }
  async getOwner(id: string) { return this.owners.get(id) ?? null; }
  async getOnlyOwner() { return [...this.owners.values()][0] ?? null; }
  async updateOwnerCap(id: string, activeCap: number, capRaises: Owner["capRaises"]) {
    const value = this.owners.get(id);
    if (value !== undefined) this.owners.set(id, { ...value, activeCap, capRaises });
  }
  async updateOwnerTimeZone(_id: string, _timeZone: string) { throw new Error("not used"); }
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
  async hasClosedWeek(_ownerId: string) { return this.closedWeek; }
  async createStep(_value: Step) { throw new Error("not used"); }
  async getStep(_id: string) { return null; }
  async listOpenSteps(_projectId: string) { return []; }
  async readStepsMarkedFor(_ownerId: string, _date: string) { return []; }
  async readOpenStepsWithProgress(_projectIds: string[]) { return []; }
  async markStepFor(_id: string, _ownerId: string, _date: string | null) { return false; }
  async setStepDone(_id: string, _ownerId: string, _doneAt: string) { return false; }
  async createEntry(_value: Entry) { throw new Error("not used"); }
  async readProjectEntries(_projectId: string, _limit: number) { return []; }
  async readCalibrationSamples(_ownerId: string, _limit: number) { return []; }
  async readDoneSteps(_projectId: string, _limit: number) { return []; }
  async readEffortForStep(_stepId: string) { return 0; }
  async readRecentEntries(_projectIds: string[], _occurredSince: string) { return []; }
}

describe("finishing a project", () => {
  const clock = { now: () => new Date("2026-09-23T10:00:00.000Z") };
  let sequence = 0;
  const ids = { next: () => `project-${++sequence}` };

  it("finishes on any day and frees the slot at once", async () => {
    const store = populatedStore();
    store.closedWeek = true; // a mid-week state change would be refused; finishing is not one
    const first = await createProjectWithinCap(store, clock, ids, newProject(cappedArea.id, "A"));
    await createProjectWithinCap(store, clock, ids, newProject(cappedArea.id, "B"));
    const full = await createProjectWithinCap(store, clock, ids, newProject(cappedArea.id, "C"));
    assert.equal(full.project.state, "shelved", "the cap was full before anything was finished");

    const finished = await finishProject(store, clock, owner.id, first.project.id);

    assert.equal(finished.project.finishedAt, "2026-09-23T10:00:00.000Z");
    assert.equal(finished.project.state, "active", "state records the commitment, not the outcome");
    assert.equal(finished.activeCount, 1, "the slot is free the same day");

    const afterwards = await createProjectWithinCap(store, clock, ids, newProject(cappedArea.id, "D"));
    assert.equal(afterwards.project.state, "active", "which is the whole point of freeing it");
  });

  it("undoes to shelved, never straight to active, and refuses twice", async () => {
    const store = populatedStore();
    const created = await createProjectWithinCap(store, clock, ids, newProject(cappedArea.id, "A"));
    await finishProject(store, clock, owner.id, created.project.id);

    await assert.rejects(
      finishProject(store, clock, owner.id, created.project.id),
      /already finished/,
    );

    const reopened = await unfinishProject(store, owner.id, created.project.id);
    assert.equal(reopened.project.finishedAt, null);
    assert.equal(reopened.project.state, "shelved", "Monday is when it can be active again");
    await assert.rejects(unfinishProject(store, owner.id, created.project.id), /not finished/);
  });

  it("refuses a state change on a finished project", async () => {
    const store = populatedStore();
    const created = await createProjectWithinCap(store, clock, ids, newProject(cappedArea.id, "A"));
    await finishProject(store, clock, owner.id, created.project.id);

    await assert.rejects(
      changeProjectState(store, clock, owner.id, created.project.id, "shelved"),
      /is finished/,
    );
  });
});


describe("Monday project rotation", () => {
  const at = (date: Date) => ({ now: () => date });

  it("allows both directions all Monday after a closed week, including after DST changes", async () => {
    for (const date of [new Date(2026, 8, 28, 0), new Date(2026, 8, 28, 23, 59),
      new Date(2026, 2, 9, 0), new Date(2026, 10, 2, 23, 59)]) {
      const store = populatedStore();
      store.closedWeek = true;
      store.projects.set("p", project("p", cappedArea.id, "active"));
      const shelved = await changeProjectState(store, at(date), owner.id, "p", "shelved");
      assert.equal(shelved.project.state, "shelved");
      assert.equal(shelved.activeCount, 0);
      const active = await changeProjectState(store, at(date), owner.id, "p", "active");
      assert.equal(active.project.state, "active");
      assert.equal(active.activeCount, 1);
    }
  });

  it("refuses both directions Tuesday through Sunday with the same message", async () => {
    for (const date of [new Date(2026, 8, 29, 0), new Date(2026, 8, 30, 12),
      new Date(2026, 9, 1, 12), new Date(2026, 9, 2, 12), new Date(2026, 9, 3, 12),
      new Date(2026, 9, 4, 23, 59)]) {
      for (const state of ["active", "shelved"] as const) {
        const store = populatedStore();
        store.closedWeek = true;
        store.projects.set("p", project("p", cappedArea.id, state));
        await assert.rejects(changeProjectState(store, at(date), owner.id, "p",
          state === "active" ? "shelved" : "active"),
        { message: "Project state changes belong to a week boundary" });
        assert.equal(store.projects.get("p")?.state, state);
        // A no-op is not a rotation and remains idempotent.
        assert.equal((await changeProjectState(store, at(date), owner.id, "p", state)).project.state, state);
      }
    }
  });

  it("rotates freely on every day before any week closes", async () => {
    for (let day = 21; day <= 27; day++) {
      const store = populatedStore();
      store.projects.set("p", project("p", cappedArea.id, "active"));
      const clock = at(new Date(2026, 8, day, 12));
      assert.equal((await changeProjectState(store, clock, owner.id, "p", "shelved")).project.state, "shelved");
      assert.equal((await changeProjectState(store, clock, owner.id, "p", "active")).project.state, "active");
    }
  });

  it("still enforces the active cap on Monday and exempts fixed-job projects", async () => {
    const store = populatedStore();
    store.closedWeek = true;
    const clock = at(new Date(2026, 8, 28, 12));
    for (const id of ["a", "b"]) store.projects.set(id, project(id, cappedArea.id, "active"));
    store.projects.set("c", project("c", cappedArea.id, "shelved"));
    store.projects.set("job", project("job", fixedArea.id, "shelved"));
    await assert.rejects(changeProjectState(store, clock, owner.id, "c", "active"), /2 of 2 capped projects are active/);
    assert.equal((await changeProjectState(store, clock, owner.id, "job", "active")).activeCount, 2);
    await changeProjectState(store, clock, owner.id, "a", "shelved");
    assert.equal((await changeProjectState(store, clock, owner.id, "c", "active")).activeCount, 2);
  });
});
