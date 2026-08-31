import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { D1Store } from "../../adapters/d1/store.ts";
import { LOCAL_OWNER_ID } from "../../adapters/local-owner.ts";
import type { Area, NextAction, Owner, Project } from "../../core/model/entities.ts";
import { closeNextAction, createNextAction } from "../../core/rules/next-action.ts";
import type { CreateEntryErrorResponse, CreateEntryResponse } from "../../contracts/entries.ts";
import type { PortfolioResponse } from "../../contracts/portfolio.ts";
import worker from "./worker.ts";

describe("D1Store with the next-action rule", () => {
  const store = new D1Store(env.DB);

  beforeEach(async () => {
    await store.createOwner(owner);
    await store.createArea(area);
  });

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

    await closeNextAction(store, action.id, "2026-09-01T11:00:00.000Z");
    await expect(
      closeNextAction(store, action.id, "2026-09-01T11:00:00.500Z"),
    ).rejects.toThrow(action.id);
    const replacement = { ...action, id: "action-2", createdAt: "2026-09-01T11:00:01.000Z" };
    await createNextAction(store, replacement);

    expect((await store.getNextAction(action.id))?.closedAt).toBe("2026-09-01T11:00:00.000Z");
    expect(await store.findOpenNextAction(project.id)).toEqual(replacement);
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
    await createNextAction(store, {
      ...action,
      id: "action-now-closed",
      projectId: actionlessProject.id,
    });
    await closeNextAction(store, "action-now-closed", "2026-09-01T11:00:00.000Z");

    const createdResponse = await postEntry({
      projectId: project.id,
      what: "Stored without effort or note",
    });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json<CreateEntryResponse>();
    expect(created.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);

    const portfolioResponse = await fetchWorker("/api/portfolio");
    expect(portfolioResponse.status).toBe(200);
    const portfolioText = await portfolioResponse.clone().text();
    expect(portfolioText.indexOf('"progress"')).toBeLessThan(
      portfolioText.indexOf('"outstanding"'),
    );
    const portfolio = await portfolioResponse.json<PortfolioResponse>();
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
      const rejected = await rejectedResponse.json<CreateEntryErrorResponse>();
      expect(rejected.error).toContain(projectId);
      expect(await entryCount()).toBe(countBeforeRejections);
    }
  });

  it("enforces foreign keys and one week per owner and start date", async () => {
    expect(await env.DB.prepare("PRAGMA foreign_keys").first("foreign_keys")).toBe(1);

    await env.DB.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
      .bind("week-1", owner.id, "2026-08-31")
      .run();
    await expect(
      env.DB.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
        .bind("week-2", owner.id, "2026-08-31")
        .run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
        .bind("orphan-week", "missing-owner", "2026-09-07")
        .run(),
    ).rejects.toThrow();
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
  return worker.fetch(new Request(`http://example.test${path}`, init));
}

async function entryCount(): Promise<number> {
  return (
    (await env.DB.prepare("SELECT COUNT(*) AS count FROM entries").first<number>("count")) ?? 0
  );
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
