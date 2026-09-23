import { vi } from "vitest";
// Business/API suite supplies an authenticated identity; auth transport has its own real tests.
vi.mock("../../adapters/http/session.ts", async importOriginal => ({
  ...await importOriginal<typeof import("../../adapters/http/session.ts")>(),
  currentOwnerId: () => "01K00000000000000000000001",
}));
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Store } from "../../core/ports/store.ts";
import type { StoreDriver, TestDatabase } from "./store-driver.ts";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { LOCAL_OWNER_ID } from "../../adapters/local-owner.ts";
import type { Area, Entry, Owner, Project, Step } from "../../core/model/entities.ts";
import { openWeek, closeWeek, readWeekEntries } from "../../core/rules/week.ts";
import { writeCommitment, spendReserve } from "../../core/rules/commitment.ts";
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
import type { ArchiveResponse } from "../../contracts/archive.ts";
import type { ProjectDetailResponse } from "../../contracts/project.ts";
import type { PortfolioResponse } from "../../contracts/portfolio.ts";
import { handlePatchProject } from "../../src/pages/api/projects.ts";
import { handlePostEntry } from "../../src/pages/api/entries.ts";
import { handleGetPortfolio } from "../../src/pages/api/portfolio.ts";
import { testApplication } from "./worker.ts";

export function runStoreSuite(driver: StoreDriver) {
const openDatabase = driver.open;
afterAll(() => driver.cleanup());
let database: TestDatabase;
let store: Store;
let fetchApplication: ReturnType<typeof testApplication>;
let temporaryDirectory: string;
let databaseSequence = 0;

describe(`${driver.name} with the step rules`, () => {
  beforeAll(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), "ritmo-integration-"));
  });

  beforeEach(async () => {
    database = await openDatabase(join(temporaryDirectory, `${databaseSequence++}.sqlite`));
    store = database.store;
    fetchApplication = testApplication(store);
    await store.createOwner(owner);
    await store.createArea(area);
  });

  afterEach(() => database.close());
  afterAll(async () => { await driver.cleanup(); rmSync(temporaryDirectory, { recursive: true }); });


  it("starts from an empty database and captures setup, areas, projects, and progress", async () => {
    database.close();
    database = await openDatabase(join(temporaryDirectory, `${databaseSequence++}-empty.sqlite`));
    store = database.store;
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
      stepId: null,
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
    expect(await database.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });

    await database.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
      .run("week-1", owner.id, "2026-08-31");
    await expect(
      Promise.resolve().then(async () =>
        await database.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
          .run("week-2", owner.id, "2026-08-31"),
      ),
    ).rejects.toThrow();
    await expect(
      Promise.resolve().then(async () =>
        await database.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
          .run("orphan-week", "missing-owner", "2026-09-07"),
      ),
    ).rejects.toThrow();
  });

  it("records each real migration once", async () => {
    await database.migrate();
    expect(await database.prepare("SELECT name FROM _ritmo_migrations ORDER BY name").all()).toEqual([
      { name: "0001_initial_schema.sql" },
      { name: "0002_steps.sql" },
      { name: "0003_project_finished_at.sql" },
      { name: "0004_entry_step.sql" },
      { name: "0005_drop_next_actions.sql" },
      { name: "0006_commitment_unit.sql" },
      { name: "0007_auth_challenges.sql" },
    ]);
    expect(await database.prepare(
      "SELECT name FROM sqlite_master WHERE tbl_name = 'next_actions'",
    ).all()).toEqual([]);
    expect(await database.prepare("SELECT name FROM sqlite_master WHERE name = 'tags'").get())
      .toEqual({ name: "tags" });
  });

  it("wires API handlers through runtimeStore and RITMO_DB_PATH", async () => {
    const runtimePath = join(temporaryDirectory, `${databaseSequence++}-runtime.sqlite`);
    const seedDatabase = await openDatabase(runtimePath);
    const seedStore = seedDatabase.store;
    await seedStore.createOwner(owner);
    await seedStore.createArea(area);
    await seedStore.createProject(project);
    const restoreRuntime = await seedDatabase.configureRuntime();
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
      await restoreRuntime();
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
  const row = await database.prepare("SELECT COUNT(*) AS count FROM entries").get() as
    | { count: number }
    | undefined;
  return row?.count ?? 0;
}

describe("the steps routes and today's list in the portfolio", () => {
  let stepsDirectory: string;
  let stepsDatabase: TestDatabase;
  let stepsStore: Store;
  let stepsFetch: ReturnType<typeof testApplication>;
  let stepsSequence = 0;

  beforeAll(() => {
    stepsDirectory = mkdtempSync(join(tmpdir(), "ritmo-steps-"));
  });

  beforeEach(async () => {
    stepsDatabase = await openDatabase(join(stepsDirectory, `${stepsSequence++}.sqlite`));
    stepsStore = stepsDatabase.store;
    stepsFetch = testApplication(stepsStore);
    await stepsStore.createOwner(owner);
    await stepsStore.createArea(area);
    await stepsStore.createProject(project);
  });

  afterEach(() => stepsDatabase.close());
  afterAll(async () => { await driver.cleanup(); rmSync(stepsDirectory, { recursive: true }); });

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

describe("finishing a project through the API", () => {
  let finishDirectory: string;
  let finishDatabase: TestDatabase;
  let finishStore: Store;
  let finishFetch: ReturnType<typeof testApplication>;
  let finishSequence = 0;

  beforeAll(() => {
    finishDirectory = mkdtempSync(join(tmpdir(), "ritmo-finish-"));
  });

  beforeEach(async () => {
    finishDatabase = await openDatabase(join(finishDirectory, `${finishSequence++}.sqlite`));
    finishStore = finishDatabase.store;
    finishFetch = testApplication(finishStore);
    await finishStore.createOwner({ ...owner, activeCap: 1 });
    await finishStore.createArea(area);
    await finishStore.createProject(project);
  });

  afterEach(() => finishDatabase.close());
  afterAll(async () => { await driver.cleanup(); rmSync(finishDirectory, { recursive: true }); });

  function patch(body: unknown): Promise<Response> {
    return finishFetch(new Request("http://example.test/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
  }

  async function portfolio(): Promise<PortfolioResponse> {
    return (await (await finishFetch(
      new Request("http://example.test/api/portfolio"),
    )).json()) as PortfolioResponse;
  }

  it("frees the cap slot the same day and reports a lower activeCount", async () => {
    const before = await portfolio();
    expect(before.setupRequired).toBe(false);
    if (before.setupRequired) return;
    expect(before.activeCount).toBe(1);

    const response = await patch({ id: project.id, finished: true });
    expect(response.status).toBe(200);

    const after = await portfolio();
    if (after.setupRequired) return;
    expect(after.activeCount).toBe(0);
    // D-026: it leaves the landing at once. Neither group there was ever true of it.
    expect(after.progress).toEqual([]);
    expect(after.outstanding).toEqual([]);
    expect(after.shelved).toEqual([]);
    // And it is still there, reachable, which is what makes dropping it honest.
    expect((await finishStore.getProject(project.id))?.finishedAt).not.toBeNull();
    const archive = (await (await finishFetch(
      new Request("http://example.test/api/archive"),
    )).json()) as ArchiveResponse;
    expect(archive.finished.map(({ id }) => id)).toEqual([project.id]);
  });

  it("drops out of the portfolio once its week has passed", async () => {
    await patch({ id: project.id, finished: true });
    // Reach past the rules to age the row: no product flow can move a finish into the past.
    await finishDatabase
      .prepare("UPDATE projects SET finished_at = ? WHERE id = ?")
      .run("2026-01-05T10:00:00.000Z", project.id);

    const seen = await portfolio();
    if (seen.setupRequired) return;
    expect(seen.progress).toEqual([]);
    expect(seen.outstanding).toEqual([]);
    expect(seen.shelved).toEqual([]);
    expect(await finishStore.getProject(project.id)).not.toBeNull();
  });

  it("keeps a finished project reachable in the archive after its week, and undoes from there", async () => {
    await patch({ id: project.id, finished: true });
    await finishDatabase
      .prepare("UPDATE projects SET finished_at = ? WHERE id = ?")
      .run("2026-01-05T10:00:00.000Z", project.id);

    // Gone from the landing, still reachable — the whole reason this route exists.
    const landing = await portfolio();
    if (landing.setupRequired) return;
    expect(landing.progress).toEqual([]);

    const archive = (await (await finishFetch(
      new Request("http://example.test/api/archive"),
    )).json()) as ArchiveResponse;
    expect(archive.finished.map(({ id }) => id)).toEqual([project.id]);
    expect(archive.shelved).toEqual([]);

    await patch({ id: project.id, finished: false });
    const reopened = (await (await finishFetch(
      new Request("http://example.test/api/archive"),
    )).json()) as ArchiveResponse;
    expect(reopened.finished).toEqual([]);
    // Undo leaves it shelved, so it moves to the other group and back onto `/` (FR-17).
    expect(reopened.shelved.map(({ id }) => id)).toEqual([project.id]);
    const back = await portfolio();
    if (back.setupRequired) return;
    expect(back.shelved.map(({ id }) => id)).toEqual([project.id]);
  });

  it("serves one project with its steps, its history and today, and 404s an unknown id", async () => {
    await finishStore.createStep({
      id: "step-detail",
      ownerId: owner.id,
      projectId: project.id,
      title: "Escribir el primer párrafo",
      estimateMinutes: 25,
      markedFor: null,
      createdAt: "2026-09-01T10:00:00.000Z",
      doneAt: null,
    });
    await finishStore.createEntry({
      id: "entry-detail",
      ownerId: owner.id,
      kind: "progress",
      projectId: project.id,
      creditsObjectiveId: null,
      occurredAt: "2026-09-02T10:00:00.000Z",
      what: "Moví el primer tramo",
      effortMinutes: 30,
      note: null,
      stepId: null,
    });

    const response = await finishFetch(
      new Request(`http://example.test/api/project/${project.id}`),
    );
    expect(response.status).toBe(200);
    const detail = (await response.json()) as ProjectDetailResponse;
    expect(detail.title).toBe(project.title);
    expect(detail.openSteps.map(({ id }) => id)).toEqual(["step-detail"]);
    expect(detail.recentEntries.map(({ id }) => id)).toEqual(["entry-detail"]);
    expect(detail.progressSincePlan).toBe(1);
    expect(detail.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const missing = await finishFetch(
      new Request("http://example.test/api/project/no-such-project"),
    );
    expect(missing.status).toBe(404);
  });

  it("archives and activates a project, and refuses past the cap without changing anything", async () => {
    // The owner's cap is 1 here, and `project` holds the only slot.
    const second: Project = { ...project, id: "project-second", title: "Segundo", state: "shelved" };
    await finishStore.createProject(second);

    const archived = await patch({ id: project.id, state: "shelved" });
    expect(archived.status).toBe(200);
    const afterArchive = await portfolio();
    if (afterArchive.setupRequired) return;
    expect(afterArchive.progress.concat(afterArchive.outstanding).map(({ id }) => id)).toEqual([]);
    expect(afterArchive.shelved.map(({ id }) => id).sort()).toEqual([project.id, second.id].sort());

    // Reachable and whole while shelved, which is what FR-17 promises.
    const detail = (await (await finishFetch(
      new Request(`http://example.test/api/project/${project.id}`),
    )).json()) as ProjectDetailResponse;
    expect(detail.state).toBe("shelved");

    const back = await patch({ id: project.id, state: "active" });
    expect(back.status).toBe(200);

    // Now the single slot is taken again, so the second one cannot come back.
    const refused = await patch({ id: second.id, state: "active" });
    expect(refused.status).toBe(422);
    expect(((await refused.json()) as { error: string }).error).toContain("1 of 1");
    expect((await finishStore.getProject(second.id))?.state).toBe("shelved");
  });

  it("keeps a closed step in the history, with what it took when that is known", async () => {
    const today = calendarDateOf(new Date());
    await finishStore.createStep({
      id: "step-closing",
      ownerId: owner.id,
      projectId: project.id,
      title: "Verificar la réplica",
      estimateMinutes: 25,
      markedFor: today,
      createdAt: "2026-09-01T10:00:00.000Z",
      doneAt: null,
    });
    // Logged while it alone was marked, so D-027 attributes the effort to it.
    await finishFetch(new Request("http://example.test/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, what: "Moví la réplica", effortMinutes: 40 }),
    }));
    await finishFetch(new Request("http://example.test/api/steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "step-closing", done: true }),
    }));

    const detail = (await (await finishFetch(
      new Request(`http://example.test/api/project/${project.id}`),
    )).json()) as ProjectDetailResponse;

    // Closed, so it left the open list — and did NOT leave the product.
    expect(detail.openSteps).toEqual([]);
    const closed = detail.history.find((item) => item.kind === "step");
    expect(closed).toEqual(expect.objectContaining({
      id: "step-closing",
      title: "Verificar la réplica",
      estimateMinutes: 25,
      effortMinutes: 40,
    }));
    // The entry of the same day is there too, and both are ordered by when they happened.
    expect(detail.history.map(({ kind }) => kind)).toEqual(["step", "entry"]);
  });

  it("shows a closed step with no attributed effort as zero, for the screen to keep quiet about", async () => {
    await finishStore.createStep({
      id: "step-unknown",
      ownerId: owner.id,
      projectId: project.id,
      title: "Montar el entorno",
      estimateMinutes: 60,
      markedFor: null,
      createdAt: "2026-09-01T10:00:00.000Z",
      doneAt: null,
    });
    await finishFetch(new Request("http://example.test/api/steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "step-unknown", done: true }),
    }));

    const detail = (await (await finishFetch(
      new Request(`http://example.test/api/project/${project.id}`),
    )).json()) as ProjectDetailResponse;
    expect(detail.history).toEqual([expect.objectContaining({
      kind: "step",
      estimateMinutes: 60,
      effortMinutes: 0,
    })]);
  });

  it("marks a step from the project screen and the portfolio row shows it", async () => {
    await finishStore.createStep({
      id: "step-today",
      ownerId: owner.id,
      projectId: project.id,
      title: "Cerrar el tramo",
      estimateMinutes: null,
      markedFor: null,
      createdAt: "2026-09-01T10:00:00.000Z",
      doneAt: null,
    });
    const detail = (await (await finishFetch(
      new Request(`http://example.test/api/project/${project.id}`),
    )).json()) as ProjectDetailResponse;

    const marked = await finishFetch(new Request("http://example.test/api/steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "step-today", markedFor: detail.today }),
    }));
    expect(marked.status).toBe(200);

    // The screen and the landing must agree about the day (T-024 § Acceptance Criteria).
    const landing = await portfolio();
    if (landing.setupRequired) return;
    const row = [...landing.progress, ...landing.outstanding].find(({ id }) => id === project.id);
    expect(row?.openSteps.filter(({ markedFor }) => markedFor === landing.today))
      .toEqual([expect.objectContaining({ id: "step-today" })]);
  });

  it("undoes to shelved, and refuses a request carrying both state and finished", async () => {
    await patch({ id: project.id, finished: true });
    const undone = await patch({ id: project.id, finished: false });
    expect(undone.status).toBe(200);
    expect((await finishStore.getProject(project.id))?.state).toBe("shelved");
    expect((await finishStore.getProject(project.id))?.finishedAt).toBeNull();

    const both = await patch({ id: project.id, state: "active", finished: true });
    expect(both.status).toBe(400);
    expect((await finishStore.getProject(project.id))?.finishedAt).toBeNull();
  });
});

describe("attributing effort to a step as it is written", () => {
  let attrDirectory: string;
  let attrDatabase: TestDatabase;
  let attrStore: Store;
  let attrFetch: ReturnType<typeof testApplication>;
  let attrSequence = 0;

  beforeAll(() => {
    attrDirectory = mkdtempSync(join(tmpdir(), "ritmo-attr-"));
  });

  beforeEach(async () => {
    attrDatabase = await openDatabase(join(attrDirectory, `${attrSequence++}.sqlite`));
    attrStore = attrDatabase.store;
    attrFetch = testApplication(attrStore);
    await attrStore.createOwner(owner);
    await attrStore.createArea(area);
    await attrStore.createProject(project);
  });

  afterEach(() => attrDatabase.close());
  afterAll(async () => { await driver.cleanup(); rmSync(attrDirectory, { recursive: true }); });

  const today = () => calendarDateOf(new Date());

  async function step(id: string, projectId = project.id, markedFor: string | null = null) {
    await attrStore.createStep({
      id,
      ownerId: owner.id,
      projectId,
      title: `Paso ${id}`,
      estimateMinutes: 25,
      markedFor,
      createdAt: "2026-09-01T10:00:00.000Z",
      doneAt: null,
    });
  }

  async function log(effortMinutes: number | null = 20) {
    const response = await attrFetch(new Request("http://example.test/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, what: "Moví algo", effortMinutes }),
    }));
    expect(response.status).toBe(201);
    return ((await response.json()) as CreateEntryResponse).id;
  }

  async function stepIdOf(entryId: string): Promise<string | null> {
    const row = await attrDatabase.prepare("SELECT step_id FROM entries WHERE id = ?").get(entryId);
    return (row as unknown as { step_id: string | null }).step_id;
  }

  it("records the step when exactly one of this project's is marked today", async () => {
    await step("step-one", project.id, today());
    const entryId = await log(20);

    expect(await stepIdOf(entryId)).toBe("step-one");
    expect(await attrStore.readEffortForStep("step-one")).toBe(20);
  });

  it("records nothing when two are marked, and never splits the minutes", async () => {
    await step("step-a", project.id, today());
    await step("step-b", project.id, today());
    const entryId = await log(30);

    expect(await stepIdOf(entryId)).toBeNull();
    expect(await attrStore.readEffortForStep("step-a")).toBe(0);
    expect(await attrStore.readEffortForStep("step-b")).toBe(0);
  });

  it("records nothing when none is marked, and the entry still counts as progress", async () => {
    await step("step-unmarked");
    const entryId = await log(45);
    expect(await stepIdOf(entryId)).toBeNull();

    // The landing must not notice: attribution serves calibration, not the log (D-027).
    const portfolio = (await (await attrFetch(
      new Request("http://example.test/api/portfolio"),
    )).json()) as PortfolioResponse;
    if (portfolio.setupRequired) return;
    const row = portfolio.progress.find(({ id }) => id === project.id);
    expect(row?.recentEntries.map(({ id }) => id)).toEqual([entryId]);
  });

  it("ignores a step of another project marked the same day", async () => {
    const other: Project = { ...project, id: "project-other", title: "Otro" };
    await attrStore.createProject(other);
    await step("step-elsewhere", other.id, today());
    const entryId = await log(15);

    expect(await stepIdOf(entryId)).toBeNull();
    expect(await attrStore.readEffortForStep("step-elsewhere")).toBe(0);
  });

  it("reads zero for a step nothing points at", async () => {
    await step("step-lonely");
    expect(await attrStore.readEffortForStep("step-lonely")).toBe(0);
  });
});

describe("the 0002 carry-across, against a database written before it", () => {
  let upgradeDirectory: string;
  let legacyMigrations: string;
  let beforeDropMigrations: string;
  let beforeUnitMigrations: string;

  beforeAll(() => {
    upgradeDirectory = mkdtempSync(join(tmpdir(), "ritmo-upgrade-"));
    legacyMigrations = join(upgradeDirectory, "migrations");
    mkdirSync(legacyMigrations);
    copyFileSync(
      join(process.cwd(), "migrations", "0001_initial_schema.sql"),
      join(legacyMigrations, "0001_initial_schema.sql"),
    );
    beforeUnitMigrations = join(upgradeDirectory, "before-unit");
    mkdirSync(beforeUnitMigrations);
    for (const name of ["0001_initial_schema.sql", "0002_steps.sql", "0003_project_finished_at.sql",
      "0004_entry_step.sql", "0005_drop_next_actions.sql"]) {
      copyFileSync(join(process.cwd(), "migrations", name), join(beforeUnitMigrations, name));
    }
    beforeDropMigrations = join(upgradeDirectory, "before-drop");
    mkdirSync(beforeDropMigrations);
    for (const name of ["0001_initial_schema.sql", "0002_steps.sql",
      "0003_project_finished_at.sql", "0004_entry_step.sql"]) {
      copyFileSync(join(process.cwd(), "migrations", name), join(beforeDropMigrations, name));
    }
  });

  afterAll(async () => { await driver.cleanup(); rmSync(upgradeDirectory, { recursive: true }); });

  it("carries open actions across, then drops the retired table without changing surviving rows", async () => {
    // A database exactly as the owner's was before D-024: 0001 only, real next actions in it.
    // Written in SQL because T-021 deleted the rules that used to write them — the migration is
    // SQL, the fixture it upgrades is SQL, and nothing in the product can produce one any more.
    const legacy = await openDatabase(join(upgradeDirectory, "owner.sqlite"), legacyMigrations);
    // Owner, area and project go in as SQL too: the adapter writes today's columns, and this
    // database is deliberately yesterday's — it has neither `steps` nor `finished_at` yet.
    await legacy.exec(
      `INSERT INTO owners (id, active_cap, cap_raises)
         VALUES ('${owner.id}', ${owner.activeCap}, '[]');
       INSERT INTO areas (id, owner_id, name, counts_against_cap)
         VALUES ('${area.id}', '${owner.id}', '${area.name}', 1);
       INSERT INTO projects
         (id, owner_id, area_id, objective_id, title, state, external_deadline, deadline_source)
         VALUES ('${project.id}', '${owner.id}', '${area.id}', NULL, '${project.title}',
                 'active', NULL, NULL);`,
    );
    const insertAction = legacy.prepare(
      `INSERT INTO next_actions
        (id, owner_id, project_id, trigger, act, obstacle, estimate_minutes, created_at, closed_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    );
    await insertAction.run("action-1", owner.id, project.id, "When the baseline is green",
      "Implement the first slice", 30, "2026-09-01T10:00:00.000Z", "2026-09-02T09:00:00.000Z");
    await insertAction.run("action-2", owner.id, project.id, "When the outline is visible",
      "Draft section two", 30, "2026-09-02T10:00:00.000Z", null);
    expect(await legacy.prepare("SELECT COUNT(*) AS count FROM next_actions").get())
      .toEqual({ count: 2 });

    // First reach the schema immediately before T-031, retaining 0002's carry-across proof.
    await legacy.migrate(beforeDropMigrations);

    const steps = await legacy.prepare("SELECT * FROM steps ORDER BY id").all();
    expect(steps).toHaveLength(1);
    expect(await legacy.store.getStep("action-2")).toEqual({
      id: "action-2",
      ownerId: owner.id,
      projectId: project.id,
      title: "Draft section two",
      estimateMinutes: 30,
      markedFor: null,
      createdAt: "2026-09-02T10:00:00.000Z",
      doneAt: null,
    } satisfies Step);

    // Both old rows still exist before 0005; D-028 authorizes discarding them.
    expect(await legacy.prepare("SELECT COUNT(*) AS count FROM next_actions").get())
      .toEqual({ count: 2 });

    await legacy.exec(`
      INSERT INTO objectives (id, owner_id, area_id, title, type, why)
        VALUES ('objective', '${owner.id}', '${area.id}', 'Learn', 'learning', 'Practice');
      UPDATE projects SET objective_id = 'objective' WHERE id = '${project.id}';
      INSERT INTO tags (id, owner_id, label) VALUES ('tag', '${owner.id}', 'Travel');
      INSERT INTO weeks (id, owner_id, starts_on, tag_id)
        VALUES ('week', '${owner.id}', '2026-09-21', 'tag');
      INSERT INTO commitments (id, owner_id, project_id, week_id, target, reserve)
        VALUES ('commitment', '${owner.id}', '${project.id}', 'week', 2, 1);
      INSERT INTO entries (id, owner_id, kind, project_id, occurred_at, what,
        credits_objective_id, step_id, effort_minutes)
        VALUES ('entry', '${owner.id}', 'progress', '${project.id}',
          '2026-09-22T10:00:00.000Z', 'Drafted', 'objective', 'action-2', 20);
    `);
    const survivingTables = ["owners", "credentials", "areas", "objectives", "projects",
      "steps", "entries", "tags", "weeks", "commitments"];
    const rows = async () => Promise.all(survivingTables.map(async (table) =>
      await legacy.prepare(`SELECT * FROM ${table} ORDER BY id`).all()));
    const before = await rows();
    const tagSchema = await legacy.prepare("SELECT * FROM sqlite_master WHERE tbl_name = 'tags'").all();

    await legacy.migrate(beforeUnitMigrations);
    expect(await rows()).toEqual(before);
    expect(await legacy.prepare("SELECT * FROM sqlite_master WHERE tbl_name = 'tags'").all())
      .toEqual(tagSchema);
    expect(await legacy.prepare("SELECT name FROM sqlite_master WHERE tbl_name = 'next_actions'").all())
      .toEqual([]);
    expect(await legacy.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    const ledger = await legacy.prepare("SELECT * FROM _ritmo_migrations ORDER BY name").all();
    expect(ledger.filter((row) => row.name === "0005_drop_next_actions.sql")).toHaveLength(1);

    // A second apply changes neither rows nor migration timestamps.
    await legacy.migrate(beforeUnitMigrations);
    expect(await rows()).toEqual(before);
    expect(await legacy.prepare("SELECT * FROM _ritmo_migrations ORDER BY name").all()).toEqual(ledger);

    // T-033 cannot infer the unit of this synthetic legacy commitment. Failure is atomic.
    await expect(legacy.migrate()).rejects.toThrow(/NOT NULL/);
    expect(await rows()).toEqual(before);
    expect(await legacy.prepare("SELECT * FROM _ritmo_migrations ORDER BY name").all()).toEqual(ledger);
    legacy.close();
  });

  it("refuses an hour in marked_for, so FR-22 cannot be broken below the rules", async () => {
    const guarded = await openDatabase(join(upgradeDirectory, "guarded.sqlite"));
    await expect(guarded.exec(
        `INSERT INTO owners (id, active_cap, cap_raises) VALUES ('o', 1, '[]');
         INSERT INTO areas (id, owner_id, name, counts_against_cap) VALUES ('a', 'o', 'A', 1);
         INSERT INTO projects (id, owner_id, area_id, objective_id, title, state,
           external_deadline, deadline_source) VALUES ('p', 'o', 'a', NULL, 'P', 'active', NULL, NULL);
         INSERT INTO steps (id, owner_id, project_id, title, estimate_minutes, marked_for,
           created_at, done_at)
           VALUES ('s', 'o', 'p', 'T', NULL, '2026-09-21T18:00', '2026-09-21T09:00:00.000Z', NULL);`,
      )
    ).rejects.toThrow();
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
  finishedAt: null,
};

describe(`${driver.name} weeks and commitments`, () => {
  let directory: string;
  let db: TestDatabase;
  let weeks: Store;
  let sequence: number;
  let moment: Date;
  const clock = { now: () => new Date(moment.getTime()) };
  const ids = { next: () => `week-test-${++sequence}` };
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "ritmo-weeks-"));
    db = await openDatabase(join(directory, "test.sqlite"));
    weeks = db.store;
    sequence = 0;
    moment = new Date(2026, 8, 23, 12);
    await weeks.createOwner(owner);
    await weeks.createArea(area);
    await weeks.createProject(project);
  });
  afterEach(async () => { db.close(); await driver.cleanup(); rmSync(directory, { recursive: true }); });
  const fields = (weekId: string) => ({ ownerId: owner.id, projectId: project.id, weekId,
    target: 10, unit: "times" as const, proposedTarget: null });

  it("retains CHECK constraints, partial indexes and atomic project creation", async () => {
    const statements = [
      "UPDATE owners SET active_cap = 0",
      "UPDATE areas SET counts_against_cap = 2",
      "UPDATE projects SET state = 'invalid'",
      "UPDATE projects SET external_deadline = '2026-10-01', deadline_source = NULL",
    ];
    for (const sql of statements) await expect(db.exec(sql)).rejects.toThrow();
    const week = await openWeek(weeks, clock, ids, owner.id);
    const commitment = await writeCommitment(weeks, clock, ids, fields(week.id));
    for (const field of ["target = 0", "reserve = 0", "unit = 'hours'", "proposed_target = 0"]) {
      await expect(db.exec(`UPDATE commitments SET ${field}`)).rejects.toThrow();
    }
    expect(await weeks.listCommitments(week.id, owner.id)).toEqual([commitment]);
    const indexes = await db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY name").all();
    expect(indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "steps_open_by_project", sql: expect.stringContaining("WHERE done_at IS NULL") }),
      expect.objectContaining({ name: "steps_marked_by_day", sql: expect.stringContaining("WHERE marked_for IS NOT NULL") }),
      expect.objectContaining({ name: "projects_unfinished", sql: expect.stringContaining("WHERE finished_at IS NULL") }),
      expect.objectContaining({ name: "entries_by_step", sql: expect.stringContaining("WHERE step_id IS NOT NULL") }),
    ]));
    const invalidStep: Step = { id: "invalid-step", ownerId: owner.id, projectId: "atomic-project",
      title: "Step", estimateMinutes: -1, markedFor: null, createdAt: moment.toISOString(), doneAt: null };
    await expect(weeks.createProjectWithStep({ ...project, id: "atomic-project" }, invalidStep)).rejects.toThrow();
    expect(await weeks.getProject("atomic-project")).toBeNull();
    expect(await weeks.getStep("invalid-step")).toBeNull();
  });

  it("persists a commitment, edits in place, and reads reserve events without changing the reserve", async () => {
    const week = await openWeek(weeks, clock, ids, owner.id);
    const original = await writeCommitment(weeks, clock, ids, fields(week.id));
    const edited = await writeCommitment(weeks, clock, ids, { ...fields(week.id), target: 11, unit: "minutes", proposedTarget: 9 });
    expect(edited).toEqual({ ...original, target: 11, reserve: 4, unit: "minutes", proposedTarget: 9 });
    const event = await spendReserve(weeks, clock, ids, { ...fields(week.id), what: "Usé la reserva", note: "Una pausa" });
    expect(await readWeekEntries(weeks, week)).toEqual([event]);
    expect(await weeks.listCommitments(week.id, owner.id)).toEqual([edited]);
    db.close();
    db = await openDatabase(join(directory, "test.sqlite"));
    weeks = db.store;
    expect(await weeks.listCommitments(week.id, owner.id)).toEqual([edited]);
    expect(await readWeekEntries(weeks, week)).toEqual([event]);
  });

  it("closes missing work and opens an empty next week; concurrent opens preserve the first close", async () => {
    const old = await openWeek(weeks, clock, ids, owner.id);
    await writeCommitment(weeks, clock, ids, fields(old.id));
    moment = new Date(2026, 8, 28, 0, 30);
    const connection = await openDatabase(join(directory, "test.sqlite"));
    try {
      const [a, b] = await Promise.all([
        openWeek(weeks, clock, ids, owner.id), openWeek(connection.store, clock, ids, owner.id),
      ]);
      expect(a).toEqual(b);
      expect(await weeks.listCommitments(a.id, owner.id)).toEqual([]);
      const closed = await weeks.getWeek(old.id, owner.id);
      expect(closed).toEqual({ ...old, closedAt: moment.toISOString() });
      moment = new Date(2026, 8, 29, 12);
      await openWeek(weeks, clock, ids, owner.id);
      expect(await weeks.getWeek(old.id, owner.id)).toEqual(closed);
      expect(await weeks.hasClosedWeek(owner.id)).toBe(true);
      expect(await db.prepare("SELECT COUNT(*) AS n FROM weeks").get()).toEqual({ n: 2 });
    } finally { connection.close(); }
  });

  it("rolls back both rollover writes if the new week cannot be inserted", async () => {
    const old = await openWeek(weeks, clock, ids, owner.id);
    moment = new Date(2026, 8, 28, 12);
    await expect(openWeek(weeks, clock, { next: () => old.id }, owner.id)).rejects.toThrow();
    expect(await weeks.getWeek(old.id, owner.id)).toEqual(old);
    expect(await weeks.getWeekStartingOn(owner.id, "2026-09-28")).toBeNull();
  });

  it("freezes a close against later writes, and enforces ownership of weeks, projects and tags", async () => {
    const week = await openWeek(weeks, clock, ids, owner.id);
    const c = await writeCommitment(weeks, clock, ids, fields(week.id));
    await weeks.createOwner({ ...owner, id: "other" });
    await db.prepare("INSERT INTO tags (id, owner_id, label) VALUES ('foreign', 'other', 'Travel')").run();
    const input = { ownerId: owner.id, weekId: week.id, capacityLabel: "heavy" as const, tagId: null, reflection: "Fue suficiente" };
    await expect(closeWeek(weeks, clock, { ...input, tagId: "foreign" })).rejects.toThrow();
    expect((await weeks.getWeek(week.id, owner.id))?.closedAt).toBeNull();
    await expect(writeCommitment(weeks, clock, ids, { ...fields(week.id), ownerId: "other" })).rejects.toThrow();
    const otherWeek = await openWeek(weeks, clock, ids, "other");
    await expect(writeCommitment(weeks, clock, ids, { ...fields(otherWeek.id), ownerId: "other" })).rejects.toThrow();
    expect(await weeks.getWeek(week.id, "other")).toBeNull();
    expect(await weeks.listCommitments(week.id, "other")).toEqual([]);
    const closed = await closeWeek(weeks, clock, input);
    expect(closed.capacityLabel).toBe("heavy");
    expect(await weeks.writeCommitment({ ...c, target: 100 })).toBe(false);
    expect(await weeks.spendReserve({ id: "late-event", ownerId: owner.id, projectId: project.id,
      kind: "reserve_spend", occurredAt: moment.toISOString(), what: "Reserva", note: null,
      effortMinutes: null, creditsObjectiveId: null, stepId: null }, week.id)).toBe(false);
    expect(await closeWeek(weeks, clock, { ...input, capacityLabel: "light" })).toEqual(closed);
    expect(await weeks.listCommitments(week.id, owner.id)).toEqual([c]);
    await expect(spendReserve(weeks, clock, ids, { ...fields(week.id), what: "Reserva", note: null })).rejects.toThrow();
  });

  it("attributes entries at local midnight to the new week, including a Monday 00:30 entry", async () => {
    const old = await openWeek(weeks, clock, ids, owner.id);
    for (const [id, date] of [["sunday", new Date(2026, 8, 27, 23, 59)], ["monday", new Date(2026, 8, 28, 0, 0)], ["written-later", new Date(2026, 8, 28, 0, 30)]] as const) {
      await weeks.createEntry({ id, ownerId: owner.id, projectId: project.id, kind: "progress",
        occurredAt: date.toISOString(), what: "Avancé", effortMinutes: null, note: null,
        creditsObjectiveId: null, stepId: null });
    }
    moment = new Date(2026, 8, 28, 1);
    const next = await openWeek(weeks, clock, ids, owner.id);
    expect((await readWeekEntries(weeks, old)).map(e => e.id)).toEqual(["sunday"]);
    expect((await readWeekEntries(weeks, next)).map(e => e.id)).toEqual(["monday", "written-later"]);
  });

  it("allows Monday API rotation after a close and refuses Wednesday with the existing message", async () => {
    const week = await openWeek(weeks, clock, ids, owner.id);
    await closeWeek(weeks, clock, { ownerId: owner.id, weekId: week.id, capacityLabel: null, tagId: null, reflection: null });
    const app = testApplication(weeks);
    expect((await app(new Request("http://example.test/api/portfolio"))).status).toBe(200);
    expect((await app(new Request(`http://example.test/api/project/${project.id}`))).status).toBe(200);
    const response = await handlePatchProject(new Request("http://example.test/api/projects", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: project.id, state: "shelved" }),
    }), weeks, clock);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Project state changes belong to a week boundary" });
    moment = new Date(2026, 8, 28, 0, 30);
    for (const state of ["shelved", "active"] as const) {
      const monday = await handlePatchProject(new Request("http://example.test/api/projects", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, state }),
      }), weeks, clock);
      expect(monday.status).toBe(200);
      expect(await monday.json()).toMatchObject({ project: { id: project.id, state } });
      expect((await weeks.getProject(project.id))?.state).toBe(state);
    }
  });
});

}
