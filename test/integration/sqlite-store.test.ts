import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { LOCAL_OWNER_ID } from "../../adapters/local-owner.ts";
import { applyMigrations, openDatabase } from "../../adapters/sqlite/database.ts";
import { closeRuntimeDatabase, SqliteStore } from "../../adapters/sqlite/store.ts";
import type { Area, Entry, NextAction, Owner, Project } from "../../core/model/entities.ts";
import { closeNextAction, createNextAction } from "../../core/rules/next-action.ts";
import type {
  CreateAreaResponse,
  CreateProjectResponse,
  ProjectMutationResponse,
  SettingsResponse,
  SetupResponse,
} from "../../contracts/capture.ts";
import type { CreateEntryErrorResponse, CreateEntryResponse } from "../../contracts/entries.ts";
import type {
  NextActionErrorResponse,
  WriteNextActionResponse,
} from "../../contracts/next-actions.ts";
import type { PortfolioResponse } from "../../contracts/portfolio.ts";
import { handlePostEntry } from "../../src/pages/api/entries.ts";
import { handleGetPortfolio } from "../../src/pages/api/portfolio.ts";
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

    const rolledBackProject = { ...project, id: "project-rolled-back" };
    await expect(
      store.createProjectWithNextAction(rolledBackProject, {
        ...action,
        id: "action-id-collision",
        projectId: rolledBackProject.id,
      }),
    ).rejects.toThrow();
    expect(await store.getProject(rolledBackProject.id)).toBeNull();
  });

  it("starts from an empty database and captures setup, areas, projects, and progress", async () => {
    database.close();
    database = openDatabase(join(temporaryDirectory, `${databaseSequence++}-empty.sqlite`));
    store = new SqliteStore(database);
    fetchApplication = testApplication(store);

    const emptyResponse = await fetchWorker("/api/portfolio");
    expect(emptyResponse.status).toBe(200);
    expect(await emptyResponse.json()).toEqual(expect.objectContaining({
      setupRequired: true,
      activeCap: null,
      areas: [],
      progress: [],
      outstanding: [],
      shelved: [],
    }));

    const setupResponse = await postJson("/api/setup", { activeCap: 2 });
    expect(setupResponse.status).toBe(201);
    const setup = (await setupResponse.json()) as SetupResponse;
    expect(setup.activeCap).toBe(2);
    expect(await store.getOnlyOwner()).toEqual({
      id: setup.ownerId,
      activeCap: 2,
      capRaises: [],
    });

    const cappedAreaResponse = await postJson("/api/areas", {
      name: "Studio",
      countsAgainstCap: true,
    });
    const fixedAreaResponse = await postJson("/api/areas", {
      name: "Trabajo fijo",
      countsAgainstCap: false,
    });
    expect(cappedAreaResponse.status).toBe(201);
    expect(fixedAreaResponse.status).toBe(201);
    const cappedArea = ((await cappedAreaResponse.json()) as CreateAreaResponse).area;
    const fixedArea = ((await fixedAreaResponse.json()) as CreateAreaResponse).area;

    const invalidProjectResponse = await postJson("/api/projects", {
      title: "No action",
      areaId: cappedArea.id,
    });
    expect(invalidProjectResponse.status).toBe(400);
    expect(await store.listProjects(setup.ownerId)).toEqual([]);

    const missingActResponse = await postJson("/api/projects", {
      title: "No act",
      areaId: cappedArea.id,
      trigger: "When the document opens",
    });
    expect(missingActResponse.status).toBe(400);
    expect(await store.listProjects(setup.ownerId)).toEqual([]);

    const first = await createProjectViaApi("First", cappedArea.id, {
      trigger: "When the document opens",
      act: "Write the first paragraph",
      obstacle: "The scope is too broad",
      estimateMinutes: 25,
    });
    const second = await createProjectViaApi("Second", cappedArea.id);
    const overflow = await createProjectViaApi("Overflow", cappedArea.id);
    const fixedJob = await createProjectViaApi("Fixed job", fixedArea.id);
    expect(first.project.state).toBe("active");
    expect(second.project.state).toBe("active");
    expect(overflow.project.state).toBe("shelved");
    expect(overflow.activeCount).toBe(2);
    expect(fixedJob.project.state).toBe("active");
    expect(fixedJob.activeCount).toBe(2);
    expect(first.nextAction).toEqual(expect.objectContaining({
      projectId: first.project.id,
      trigger: "When the document opens",
      act: "Write the first paragraph",
      obstacle: "The scope is too broad",
      estimateMinutes: 25,
    }));
    expect(second.nextAction.estimateMinutes).toBeNull();
    expect(await store.findOpenNextAction(first.project.id)).toEqual(
      expect.objectContaining({ id: first.nextAction.id }),
    );

    const portfolioBeforeEntry = (await (
      await fetchWorker("/api/portfolio")
    ).json()) as PortfolioResponse;
    expect(portfolioBeforeEntry.setupRequired).toBe(false);
    expect(portfolioBeforeEntry.activeCap).toBe(2);
    expect(portfolioBeforeEntry.activeCount).toBe(2);
    expect(portfolioBeforeEntry.shelved.map(({ id }) => id)).toEqual([
      overflow.project.id,
    ]);
    expect(
      portfolioBeforeEntry.outstanding.find(({ id }) => id === first.project.id)?.nextAction,
    ).toEqual(expect.objectContaining({
      trigger: "When the document opens",
      act: "Write the first paragraph",
    }));

    const replacementResponse = await postJson("/api/next-actions", {
      projectId: first.project.id,
      currentActionId: first.nextAction.id,
      trigger: "When the outline is visible",
      act: "Draft section two",
    });
    expect(replacementResponse.status).toBe(201);
    const replacement = (await replacementResponse.json()) as WriteNextActionResponse;
    expect(replacement.replacedActionId).toBe(first.nextAction.id);
    expect((await store.getNextAction(first.nextAction.id))?.closedAt).not.toBeNull();
    expect(await store.findOpenNextAction(first.project.id)).toEqual(
      expect.objectContaining({
        id: replacement.nextAction.id,
        trigger: "When the outline is visible",
        estimateMinutes: null,
      }),
    );

    const duplicateCloseResponse = await postJson("/api/next-actions", {
      projectId: first.project.id,
      currentActionId: first.nextAction.id,
      trigger: "When this should fail",
      act: "Do not replace the open action",
    });
    expect(duplicateCloseResponse.status).toBe(422);
    expect(((await duplicateCloseResponse.json()) as NextActionErrorResponse).error).toContain(
      first.nextAction.id,
    );
    expect((await store.findOpenNextAction(first.project.id))?.id).toBe(
      replacement.nextAction.id,
    );

    const settingsResponse = await fetchWorker("/api/settings");
    expect(settingsResponse.status).toBe(200);
    const settings = (await settingsResponse.json()) as SettingsResponse;
    expect(settings.areas).toEqual(expect.arrayContaining([cappedArea, fixedArea]));
    const raisedResponse = await patchJson("/api/settings", { activeCap: 3 });
    expect(raisedResponse.status).toBe(200);
    expect((await raisedResponse.json()) as SettingsResponse).toEqual(
      expect.objectContaining({
        activeCap: 3,
        capRaises: [{ amount: 1, raisedAt: expect.any(String) }],
      }),
    );
    const promotedResponse = await patchJson("/api/projects", {
      id: overflow.project.id,
      state: "active",
    });
    expect(promotedResponse.status).toBe(200);
    expect(((await promotedResponse.json()) as ProjectMutationResponse).project.state).toBe(
      "active",
    );

    const entryResponse = await postEntry({
      projectId: first.project.id,
      what: "Moved from a blank database",
    });
    expect(entryResponse.status).toBe(201);
    const portfolioAfterEntry = (await (
      await fetchWorker("/api/portfolio")
    ).json()) as PortfolioResponse;
    expect(portfolioAfterEntry.progress[0]).toEqual(expect.objectContaining({
      id: first.project.id,
      recentEntries: [expect.objectContaining({ what: "Moved from a blank database" })],
      nextAction: expect.objectContaining({ act: "Draft section two" }),
    }));
  });

  it("drives POST entries and GET portfolio through the real SQLite adapter", async () => {
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
    expect(portfolio.shelved.map(({ id }) => id)).toEqual([shelvedProject.id]);

    const repairedResponse = await postJson("/api/next-actions", {
      projectId: actionlessProject.id,
      trigger: "When the test is green",
      act: "Keep the repaired action",
      obstacle: "",
    });
    expect(repairedResponse.status).toBe(201);
    const repairedPortfolio = (await (
      await fetchWorker("/api/portfolio")
    ).json()) as PortfolioResponse;
    expect(
      repairedPortfolio.outstanding.find(({ id }) => id === actionlessProject.id)?.nextAction,
    ).toEqual(expect.objectContaining({
      trigger: "When the test is green",
      act: "Keep the repaired action",
      obstacle: null,
      estimateMinutes: null,
    }));

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

  it("wires API handlers through runtimeStore and RITMO_DB_PATH", async () => {
    const previousPath = process.env.RITMO_DB_PATH;
    const runtimePath = join(temporaryDirectory, `${databaseSequence++}-runtime.sqlite`);
    process.env.RITMO_DB_PATH = runtimePath;
    const seedDatabase = openDatabase(runtimePath);
    const seedStore = new SqliteStore(seedDatabase);
    await seedStore.createOwner(owner);
    await seedStore.createArea(area);
    await seedStore.createProject(project);
    seedDatabase.close();

    try {
      const createdResponse = await handlePostEntry(
        new Request("http://example.test/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, what: "Stored through runtime wiring" }),
        }),
      );
      expect(createdResponse.status).toBe(201);

      const portfolioResponse = await handleGetPortfolio();
      expect(portfolioResponse.status).toBe(200);
      const portfolio = (await portfolioResponse.json()) as PortfolioResponse;
      expect(portfolio.progress[0].recentEntries[0].what).toBe("Stored through runtime wiring");
    } finally {
      closeRuntimeDatabase();
      if (previousPath === undefined) delete process.env.RITMO_DB_PATH;
      else process.env.RITMO_DB_PATH = previousPath;
    }
  });
});

async function postEntry(body: Record<string, unknown>): Promise<Response> {
  return fetchWorker("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postJson(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetchWorker(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function patchJson(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetchWorker(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createProjectViaApi(
  title: string,
  areaId: string,
  actionFields: {
    trigger?: string;
    act?: string;
    obstacle?: string;
    estimateMinutes?: number;
  } = {},
): Promise<CreateProjectResponse> {
  const response = await postJson("/api/projects", {
    title,
    areaId,
    trigger: actionFields.trigger ?? "When the project opens",
    act: actionFields.act ?? "Take the next step",
    ...(actionFields.obstacle === undefined ? {} : { obstacle: actionFields.obstacle }),
    ...(actionFields.estimateMinutes === undefined
      ? {}
      : { estimateMinutes: actionFields.estimateMinutes }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<CreateProjectResponse>;
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
