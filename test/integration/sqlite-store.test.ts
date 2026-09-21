import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { LOCAL_OWNER_ID } from "../../adapters/local-owner.ts";
import { applyMigrations, openDatabase } from "../../adapters/sqlite/database.ts";
import { closeRuntimeDatabase, SqliteStore } from "../../adapters/sqlite/store.ts";
import type { Area, Entry, Owner, Project, Step } from "../../core/model/entities.ts";
import { calendarDateOf } from "../../core/rules/step.ts";
import type {
  CreateAreaResponse,
  CreateProjectResponse,
  ProjectMutationResponse,
  SettingsResponse,
  SetupResponse,
} from "../../contracts/capture.ts";
import type { CreateEntryErrorResponse, CreateEntryResponse } from "../../contracts/entries.ts";
import type { StepErrorResponse, StepResponse } from "../../contracts/steps.ts";
import type { PortfolioResponse } from "../../contracts/portfolio.ts";
import { handlePostEntry } from "../../src/pages/api/entries.ts";
import { handleGetPortfolio } from "../../src/pages/api/portfolio.ts";
import { testApplication } from "./worker.ts";

let database: DatabaseSync;
let store: SqliteStore;
let fetchApplication: ReturnType<typeof testApplication>;
let temporaryDirectory: string;
let databaseSequence = 0;

describe("SqliteStore with the step rules", () => {
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

    const blankStepResponse = await postJson("/api/projects", {
      title: "Blank step",
      areaId: cappedArea.id,
      step: "   ",
    });
    expect(blankStepResponse.status).toBe(400);
    expect(await store.listProjects(setup.ownerId)).toEqual([]);

    const first = await createProjectViaApi("First", cappedArea.id, {
      step: "Write the first paragraph",
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
    expect(first.step).toEqual(expect.objectContaining({
      projectId: first.project.id,
      title: "Write the first paragraph",
      estimateMinutes: 25,
      markedFor: null,
      doneAt: null,
    }));
    expect(second.step.estimateMinutes).toBeNull();
    expect(await store.listOpenSteps(first.project.id)).toEqual([
      expect.objectContaining({ id: first.step.id }),
    ]);

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
      portfolioBeforeEntry.outstanding.find(({ id }) => id === first.project.id)?.openSteps,
    ).toEqual([expect.objectContaining({ title: "Write the first paragraph" })]);

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
      openSteps: [expect.objectContaining({ title: "Write the first paragraph" })],
    }));
  });

  it("drives POST entries and GET portfolio through the real SQLite adapter", async () => {
    const quietProject: Project = { ...project, id: "project-quiet", title: "Quiet project" };
    const stepless: Project = {
      ...project,
      id: "project-stepless",
      title: "Needs its next steps",
    };
    const shelvedProject: Project = {
      ...project,
      id: "project-shelved",
      title: "Shelved project",
      state: "shelved",
    };
    await store.createProject(project);
    await store.createProject(quietProject);
    await store.createProject(stepless);
    await store.createProject(shelvedProject);
    const openStep = (id: string, projectId: string): Step => ({
      id,
      ownerId: owner.id,
      projectId,
      title: "Take the next step",
      estimateMinutes: null,
      markedFor: null,
      createdAt: "2026-09-01T10:00:00.000Z",
      doneAt: null,
    });
    await store.createStep(openStep("step-first", project.id));
    await store.createStep(openStep("step-quiet", quietProject.id));
    // The stepless project carries one already done: a finished stretch is not an open plan.
    await store.createStep({
      ...openStep("step-done", stepless.id),
      doneAt: "2026-09-01T11:00:00.000Z",
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
    expect(portfolio.progress[0].openSteps.map(({ id }) => id)).toEqual(["step-first"]);
    // Ordered by project id, which the rename from "actionless" to "stepless" reversed.
    expect(portfolio.outstanding.map(({ id }) => id)).toEqual([
      quietProject.id,
      stepless.id,
    ]);
    expect(portfolio.outstanding.find(({ id }) => id === stepless.id)?.openSteps).toEqual([]);
    expect(
      portfolio.outstanding.find(({ id }) => id === quietProject.id)?.openSteps.map(({ id }) => id),
    ).toEqual(["step-quiet"]);
    expect(
      [...portfolio.progress, ...portfolio.outstanding].some(
        ({ id }) => id === shelvedProject.id,
      ),
    ).toBe(false);
    expect(portfolio.shelved.map(({ id }) => id)).toEqual([shelvedProject.id]);

    // A project whose stretch is finished gets its next one written through the steps route.
    const repairedResponse = await postJson("/api/steps", {
      projectId: stepless.id,
      title: "Write the next stretch",
    });
    expect(repairedResponse.status).toBe(201);
    const repairedPortfolio = (await (
      await fetchWorker("/api/portfolio")
    ).json()) as PortfolioResponse;
    expect(
      repairedPortfolio.outstanding.find(({ id }) => id === stepless.id)?.openSteps,
    ).toEqual([expect.objectContaining({
      title: "Write the next stretch",
      markedFor: null,
      estimateMinutes: null,
    })]);

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
    // D-024 moved the anchor: "since the current plan opened" is now the oldest OPEN step, not
    // the next action. The action still exists and is still returned; it no longer sets the count.
    const oldStep: Step = {
      id: "step-old-plan",
      ownerId: owner.id,
      projectId: oldProject.id,
      title: "The stretch that is still open",
      estimateMinutes: null,
      markedFor: null,
      createdAt: daysAgo(40),
      doneAt: null,
    };
    await store.createProject(oldProject);
    await store.createStep(oldStep);
    await store.createEntry(oldProgress);
    await store.createEntry(reserveSpend);

    const response = await fetchWorker("/api/portfolio");
    expect(response.status).toBe(200);
    const portfolio = (await response.json()) as PortfolioResponse;
    const result = portfolio.outstanding.find(({ id }) => id === oldProject.id);

    expect(result?.recentEntries).toEqual([]);
    expect(result?.openSteps.map(({ id }) => id)).toEqual([oldStep.id]);
    // One progress entry after the step opened; the reserve spend is not progress.
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
      { name: "0002_steps.sql" },
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
  stepFields: { step?: string; estimateMinutes?: number } = {},
): Promise<CreateProjectResponse> {
  const response = await postJson("/api/projects", {
    title,
    areaId,
    step: stepFields.step ?? "Take the next step",
    ...(stepFields.estimateMinutes === undefined
      ? {}
      : { estimateMinutes: stepFields.estimateMinutes }),
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

describe("the steps routes and today's list in the portfolio", () => {
  let stepsDirectory: string;
  let stepsDatabase: DatabaseSync;
  let stepsStore: SqliteStore;
  let stepsFetch: ReturnType<typeof testApplication>;
  let stepsSequence = 0;

  beforeAll(() => {
    stepsDirectory = mkdtempSync(join(tmpdir(), "ritmo-steps-"));
  });

  beforeEach(async () => {
    stepsDatabase = openDatabase(join(stepsDirectory, `${stepsSequence++}.sqlite`));
    stepsStore = new SqliteStore(stepsDatabase);
    stepsFetch = testApplication(stepsStore);
    await stepsStore.createOwner(owner);
    await stepsStore.createArea(area);
    await stepsStore.createProject(project);
  });

  afterEach(() => stepsDatabase.close());
  afterAll(() => rmSync(stepsDirectory, { recursive: true }));

  function call(path: string, init?: RequestInit): Promise<Response> {
    return stepsFetch(new Request(`http://example.test${path}`, init));
  }

  function send(path: string, method: string, body: unknown): Promise<Response> {
    return call(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function projectInPortfolio() {
    const portfolio = (await (await call("/api/portfolio")).json()) as PortfolioResponse;
    return [...portfolio.progress, ...portfolio.outstanding].find(({ id }) => id === project.id);
  }

  /** What the row actually draws: only the steps marked for today (FR-22). */
  async function markedForToday() {
    const today = calendarDateOf(new Date());
    const seen = await projectInPortfolio();
    return (seen?.openSteps ?? []).filter((step) => step.markedFor === today);
  }

  it("writes a step, marks it for today, and carries it in the portfolio", async () => {
    const written = await send("/api/steps", "POST", {
      projectId: project.id,
      title: "Draft the empty state",
    });
    expect(written.status).toBe(201);
    const { step } = (await written.json()) as StepResponse;
    expect(step.markedFor).toBeNull();
    expect(step.title).toBe("Draft the empty state");

    const today = calendarDateOf(new Date());
    const marked = await send("/api/steps", "PATCH", { id: step.id, markedFor: today });
    expect(marked.status).toBe(200);
    expect(((await marked.json()) as StepResponse).step.markedFor).toBe(today);

    expect(await markedForToday()).toEqual([
      {
        id: step.id,
        title: step.title,
        estimateMinutes: null,
        markedFor: today,
        createdAt: step.createdAt,
      },
    ]);
  });

  it("reads none of yesterday's marks, and puts no count in their place", async () => {
    const yesterday = calendarDateOf(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const { step } = (await (await send("/api/steps", "POST", {
      projectId: project.id,
      title: "Yesterday's intention",
    })).json()) as StepResponse;
    await send("/api/steps", "PATCH", { id: step.id, markedFor: yesterday });

    expect(await markedForToday()).toEqual([]);
    const seen = await projectInPortfolio();
    expect(seen?.openSteps).toHaveLength(1);
    // The step is not closed, not counted and not carried: it is simply back in the project.
    expect((await stepsStore.getStep(step.id))?.doneAt).toBeNull();
    expect(await stepsStore.listOpenSteps(project.id)).toHaveLength(1);
  });

  it("refuses a blank title, an hour where a date belongs, and a shelved project", async () => {
    const blank = await send("/api/steps", "POST", { projectId: project.id, title: "   " });
    expect(blank.status).toBe(400);
    expect(((await blank.json()) as StepErrorResponse).error).toContain("title");

    const { step } = (await (await send("/api/steps", "POST", {
      projectId: project.id,
      title: "Real step",
    })).json()) as StepResponse;

    const hour = await send("/api/steps", "PATCH", {
      id: step.id,
      markedFor: "2026-09-21T18:00:00.000Z",
    });
    expect(hour.status).toBe(422);
    expect((await stepsStore.getStep(step.id))?.markedFor).toBeNull();

    await stepsStore.setProjectState(project.id, owner.id, "shelved");
    const shelved = await send("/api/steps", "PATCH", {
      id: step.id,
      markedFor: calendarDateOf(new Date()),
    });
    expect(shelved.status).toBe(422);
    expect(((await shelved.json()) as StepErrorResponse).error).toContain(project.id);
    expect((await stepsStore.getStep(step.id))?.markedFor).toBeNull();
  });

  it("completes a step, which drops it out of today without closing anything else", async () => {
    const today = calendarDateOf(new Date());
    const { step } = (await (await send("/api/steps", "POST", {
      projectId: project.id,
      title: "Finish the migration",
    })).json()) as StepResponse;
    await send("/api/steps", "PATCH", { id: step.id, markedFor: today });

    const done = await send("/api/steps", "PATCH", { id: step.id, done: true });
    expect(done.status).toBe(200);
    expect(((await done.json()) as StepResponse).step.doneAt).not.toBeNull();
    expect(await markedForToday()).toEqual([]);
    expect((await projectInPortfolio())?.openSteps).toEqual([]);
    expect(await stepsStore.listOpenSteps(project.id)).toEqual([]);
  });

});

describe("the 0002 carry-across, against a database written before it", () => {
  let upgradeDirectory: string;
  let legacyMigrations: string;

  beforeAll(() => {
    upgradeDirectory = mkdtempSync(join(tmpdir(), "ritmo-upgrade-"));
    legacyMigrations = join(upgradeDirectory, "migrations");
    mkdirSync(legacyMigrations);
    copyFileSync(
      join(process.cwd(), "migrations", "0001_initial_schema.sql"),
      join(legacyMigrations, "0001_initial_schema.sql"),
    );
  });

  afterAll(() => rmSync(upgradeDirectory, { recursive: true }));

  it("carries every open action across, leaves the closed ones, and touches nothing else", async () => {
    // A database exactly as the owner's was before D-024: 0001 only, real next actions in it.
    // Written in SQL because T-021 deleted the rules that used to write them — the migration is
    // SQL, the fixture it upgrades is SQL, and nothing in the product can produce one any more.
    const legacy = openDatabase(join(upgradeDirectory, "owner.sqlite"), legacyMigrations);
    const legacyStore = new SqliteStore(legacy);
    await legacyStore.createOwner(owner);
    await legacyStore.createArea(area);
    await legacyStore.createProject(project);
    const insertAction = legacy.prepare(
      `INSERT INTO next_actions
        (id, owner_id, project_id, trigger, act, obstacle, estimate_minutes, created_at, closed_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    );
    insertAction.run("action-1", owner.id, project.id, "When the baseline is green",
      "Implement the first slice", 30, "2026-09-01T10:00:00.000Z", "2026-09-02T09:00:00.000Z");
    insertAction.run("action-2", owner.id, project.id, "When the outline is visible",
      "Draft section two", 30, "2026-09-02T10:00:00.000Z", null);
    expect(legacy.prepare("SELECT COUNT(*) AS count FROM next_actions").get())
      .toEqual({ count: 2 });

    // Opening the app again is what applies 0002 — there is no separate command.
    applyMigrations(legacy);

    const steps = legacy.prepare("SELECT * FROM steps ORDER BY id").all();
    expect(steps).toHaveLength(1);
    expect(await new SqliteStore(legacy).getStep("action-2")).toEqual({
      id: "action-2",
      ownerId: owner.id,
      projectId: project.id,
      title: "Draft section two",
      estimateMinutes: 30,
      markedFor: null,
      createdAt: "2026-09-02T10:00:00.000Z",
      doneAt: null,
    } satisfies Step);

    // The closed one stays where it is, and so does the table: T-021 removed every reader of
    // `next_actions`, not the rows. Nothing the product can do will touch them again.
    expect(legacy.prepare("SELECT COUNT(*) AS count FROM next_actions").get())
      .toEqual({ count: 2 });

    // And the ledger makes a second open a no-op rather than a second copy.
    applyMigrations(legacy);
    expect(legacy.prepare("SELECT COUNT(*) AS count FROM steps").get()).toEqual({ count: 1 });

    legacy.close();
  });

  it("refuses an hour in marked_for, so FR-22 cannot be broken below the rules", () => {
    const guarded = openDatabase(join(upgradeDirectory, "guarded.sqlite"));
    expect(() =>
      guarded.exec(
        `INSERT INTO owners (id, active_cap, cap_raises) VALUES ('o', 1, '[]');
         INSERT INTO areas (id, owner_id, name, counts_against_cap) VALUES ('a', 'o', 'A', 1);
         INSERT INTO projects (id, owner_id, area_id, objective_id, title, state,
           external_deadline, deadline_source) VALUES ('p', 'o', 'a', NULL, 'P', 'active', NULL, NULL);
         INSERT INTO steps (id, owner_id, project_id, title, estimate_minutes, marked_for,
           created_at, done_at)
           VALUES ('s', 'o', 'p', 'T', NULL, '2026-09-21T18:00', '2026-09-21T09:00:00.000Z', NULL);`,
      )
    ).toThrow();
    guarded.close();
  });
});

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

