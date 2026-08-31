import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { D1Store } from "../../adapters/d1/store.ts";
import type { NextAction, Project } from "../../core/model/entities.ts";
import { closeNextAction, createNextAction } from "../../core/rules/next-action.ts";

describe("D1Store with the next-action rule", () => {
  const store = new D1Store(env.DB);

  beforeEach(async () => {
    await env.DB.prepare("INSERT INTO owners (id, active_cap) VALUES (?, ?)")
      .bind("owner-1", 3)
      .run();
    await env.DB.prepare(
      "INSERT INTO areas (id, owner_id, name, counts_against_cap) VALUES (?, ?, ?, ?)",
    )
      .bind("area-1", "owner-1", "Studio", 1)
      .run();
  });

  it("stores and reads a project and its sole open next action", async () => {
    await env.DB.prepare("INSERT INTO owners (id, active_cap) VALUES (?, ?)")
      .bind("owner-2", 3)
      .run();
    await expect(
      store.createProject({ ...project, id: "cross-owner-project", ownerId: "owner-2" }),
    ).rejects.toThrow();

    await store.createProject(project);
    await createNextAction(store, action);

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

  it("enforces foreign keys and one week per owner and start date", async () => {
    expect(await env.DB.prepare("PRAGMA foreign_keys").first("foreign_keys")).toBe(1);

    await env.DB.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
      .bind("week-1", "owner-1", "2026-08-31")
      .run();
    await expect(
      env.DB.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
        .bind("week-2", "owner-1", "2026-08-31")
        .run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare("INSERT INTO weeks (id, owner_id, starts_on) VALUES (?, ?, ?)")
        .bind("orphan-week", "missing-owner", "2026-09-07")
        .run(),
    ).rejects.toThrow();
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

const action: NextAction = {
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
