import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { LOCAL_OWNER_ID } from "../../adapters/local-owner.ts";
import { applyMigrations, openDatabase } from "../../adapters/sqlite/database.ts";
import { SqliteStore } from "../../adapters/sqlite/store.ts";
import type { Area, Entry, NextAction, Owner, Project } from "../../core/model/entities.ts";
import { closeNextAction, createNextAction } from "../../core/rules/next-action.ts";
import type { CreateEntryErrorResponse, CreateEntryResponse } from "../../contracts/entries.ts";
import type { PortfolioResponse } from "../../contracts/portfolio.ts";
import { testApplication } from "./worker.ts";

let database: DatabaseSync;
let store: SqliteStore;
let fetchApplication: ReturnType<typeof testApplication>;
let temporaryDirectory: string;
let databaseSequence = 0;

describe("SqliteStore with the next-action rule", () => {
  beforeAll(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), "ritmo-integration-"));
  });

  beforeEach(async () => {
    database = openDatabase(join(temporaryDirectory, `${databaseSequence++}.sqlite`));
    store = new SqliteStore(database);
    fetchApplication = testApplication(store);
    await store.createOwner(owner);
    await store.createArea(area);
  });

  afterEach(() => database.close());
  afterAll(() => rmSync(temporaryDirectory, { recursive: true }));

  it("stores and reads a project and its sole open next action", async () => {
    await store.createOwner({ ...owner, id: "owner-2" });
    await expect(
      store.createProject({ ...project, id: "cross-owner-project", ownerId: "owner-2" }),
    ).rejects.toThrow();

    await store.createProject(project);
    await createNextAction(store, action);

    expect(await store.getOwner(owner.id)).toEqual(owner);
    expect(await store.getArea(area.id)).toEqual(area);
    expect(await store.readAreas([area.id])).toEqual([area]);
    expect(await store.getProject(project.id)).toEqual(project);
    expect(await store.getNextAction(action.id)).toEqual(action);
    await expect(
      createNextAction(store, { ...action, id: "action-2" }),
    ).rejects.toThrow(action.id);

    const replacement = { ...action, id: "action-2", createdAt: "2026-09-01T11:00:01.000Z" };
    await closeNextAction(
      store,
      action.id,
      "2026-09-01T11:00:00.000Z",
      replacement,
    );
    await expect(
      closeNextAction(
        store,
        action.id,
        "2026-09-01T11:00:00.500Z",
        { ...replacement, id: "action-3" },
      ),
    ).rejects.toThrow(action.id);

    expect((await store.getNextAction(action.id))?.closedAt).toBe("2026-09-01T11:00:00.000Z");
    expect(await store.findOpenNextAction(project.id)).toEqual(replacement);

    await store.createNextAction({
      ...action,
      id: "action-id-collision",
      createdAt: "2026-08-31T10:00:00.000Z",
      closedAt: "2026-08-31T10:30:00.000Z",
    });
    await expect(
      closeNextAction(store, replacement.id, "2026-09-01T12:00:00.000Z", {
        ...replacement,
        id: "action-id-collision",
        createdAt: "2026-09-01T12:00:01.000Z",
      }),
    ).rejects.toThrow();
    expect(await store.findOpenNextAction(project.id)).toEqual(replacement);

    const otherProject = { ...project, id: "project-other" };
    await store.createProject(otherProject);
    const mismatchedReplacement = {
      ...replacement,
      id: "action-mismatched-replacement",
      projectId: otherProject.id,
    };
    expect(
      await store.replaceNextAction(
        replacement.id,
        "2026-09-01T12:30:00.000Z",
        mismatchedReplacement,
      ),
    ).toBe(false);
    expect(await store.findOpenNextAction(project.id)).toEqual(replacement);
    expect(await store.getNextAction(mismatchedReplacement.id)).toBeNull();
  });

  it("drives POST entries and GET portfolio through the real D1 adapter", async () => {
    const quietProject: Project = { ...project, id: "project-quiet", title: "Quiet project" };
    const actionlessProject: Project = {
      ...project,
      id: "project-actionless",
      title: "Needs a next action",
    };
    const shelvedProject: Project = {
      ...project,
      id: "project-shelved",
      title: "Shelved project",
      state: "shelved",
    };
    await store.createProject(project);
    await store.createProject(quietProject);
    await store.createProject(actionlessProject);
    await store.createProject(shelvedProject);
    await createNextAction(store, action);
    await createNextAction(store, {
      ...action,
      id: "action-quiet",
      projectId: quietProject.id,
    });
    await store.createNextAction({
      ...action,
      id: "action-now-closed",
      projectId: actionlessProject.id,
      closedAt: "2026-09-01T11:00:00.000Z",
    });
    const createdResponse = await postEntry({
      projectId: project.id,
      what: "Stored without effort or note",
    });
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as CreateEntryResponse;
    expect(created.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);

    const portfolioResponse = await fetchWorker("/api/portfolio");
    expect(portfolioResponse.status).toBe(200);
    const portfolioText = await portfolioResponse.clone().text();
    expect(portfolioText.indexOf('"progress"')).toBeLessThan(
      portfolioText.indexOf('"outstanding"'),
    );
    const portfolio = (await portfolioResponse.json()) as PortfolioResponse;
    expect(portfolio.progress.map(({ id }) => id)).toEqual([project.id]);
    expect(portfolio.progress[0].recentEntries).toEqual([
      expect.objectContaining({
        id: created.id,
        what: "Stored without effort or note",
        effortMinutes: null,
        note: null,
      }),
    ]);
    expect(portfolio.progress[0].nextAction?.id).toBe(action.id);
    expect(portfolio.outstanding.map(({ id }) => id)).toEqual([
      actionlessProject.id,
      quietProject.id,
    ]);
    expect(
      portfolio.outstanding.find(({ id }) => id === actionlessProject.id)?.nextAction,
    ).toBeNull();
    expect(portfolio.outstanding.find(({ id }) => id === quietProject.id)?.nextAction?.id).toBe(
      "action-quiet",
    );
    expect(
      [...portfolio.progress, ...portfolio.outstanding].some(
        ({ id }) => id === shelvedProject.id,
      ),
    ).toBe(false);

    const countBeforeRejections = await entryCount();
    for (const projectId of ["missing-project", shelvedProject.id]) {
      const rejectedResponse = await postEntry({ projectId, what: "Must not be stored" });
      expect(rejectedResponse.status).toBeGreaterThanOrEqual(400);
      expect(rejectedResponse.status).toBeLessThan(500);
      const rejected = (await rejectedResponse.json()) as CreateEntryErrorResponse;
      expect(rejected.error).toContain(projectId);
      expect(await entryCount()).toBe(countBeforeRejections);
    }
  });

  it("counts progress since an old open plan without widening recent entries", async () => {
    const now = new Date();
    const daysAgo = (days: number) =>
      new Date(now.getTime() - days * 24 * 60 * 60 * 1_000).toISOString();
    const oldProject: Project = { ...project, id: "project-old-plan", title: "Old plan" };
    const oldAction: NextAction = {
      ...action,
      id: "action-old-plan",
      projectId: oldProject.id,
      createdAt: daysAgo(40),
    };
    const oldProgress: Entry = {
      id: "entry-old-progress",
      ownerId: owner.id,
      kind: "progress",
      projectId: oldProject.id,
      creditsObjectiveId: null,
      occurredAt: daysAgo(35),
      what: "Progress after the plan opened",
      effortMinutes: null,
      note: null,
    };
    const reserveSpend: Entry = {
      ...oldProgress,
      id: "entry-old-reserve",
      kind: "reserve_spend",
      occurredAt: daysAgo(34),
      what: "Reserve event after the plan opened",
    };
    await store.createProject(oldProject);
    await createNextAction(store, oldAction);
    await store.createEntry(oldProgress);
    await store.createEntry(reserveSpend);

    const response = await fetchWorker("/api/portfolio");
    expect(response.status).toBe(200);
    const portfolio = (await response.json()) as PortfolioResponse;
    const result = portfolio.outstanding.find(({ id }) => id === oldProject.id);

    expect(result?.recentEntries).toEqual([]);
    expect(result?.nextAction?.createdAt).toBe(oldAction.createdAt);
    expect(result?.progressSincePlan).toBe(1);
  });

  it("enforces foreign keys and one week per owner and start date", async () => {
    expect(database.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });

    database.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
      .run("week-1", owner.id, "2026-08-31");
    await expect(
      Promise.resolve().then(() =>
        database.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
          .run("week-2", owner.id, "2026-08-31"),
      ),
    ).rejects.toThrow();
    await expect(
      Promise.resolve().then(() =>
        database.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
          .run("orphan-week", "missing-owner", "2026-09-07"),
      ),
    ).rejects.toThrow();
  });

  it("records each real migration once", () => {
    applyMigrations(database);
    expect(database.prepare("SELECT name FROM _ritmo_migrations ORDER BY name").all()).toEqual([
      { name: "0001_initial_schema.sql" },
    ]);
  });
});

async function postEntry(body: Record<string, unknown>): Promise<Response> {
  return fetchWorker("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function fetchWorker(path: string, init?: RequestInit): Promise<Response> {
  return fetchApplication(new Request(`http://example.test${path}`, init));
}

async function entryCount(): Promise<number> {
  const row = database.prepare("SELECT COUNT(*) AS count FROM entries").get() as
    | { count: number }
    | undefined;
  return row?.count ?? 0;
}

const owner: Owner = { id: LOCAL_OWNER_ID, activeCap: 3, capRaises: [] };
const area: Area = {
  id: "area-1",
  ownerId: owner.id,
  name: "Studio",
  countsAgainstCap: true,
};

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

const action: NextAction = {
  id: "action-1",
  ownerId: owner.id,
  projectId: project.id,
  trigger: "When the baseline is green",
  act: "Implement the first slice",
  obstacle: null,
  estimateMinutes: 30,
  createdAt: "2026-09-01T10:00:00.000Z",
  closedAt: null,
};
