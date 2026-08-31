import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { D1Store } from "../../adapters/d1/store.ts";
import type { NextAction, Project } from "../../core/model/entities.ts";
import { createNextAction } from "../../core/rules/next-action.ts";

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
    await store.createProject(project);
    await createNextAction(store, action);

    expect(await store.getProject(project.id)).toEqual(project);
    expect(await store.getNextAction(action.id)).toEqual(action);
    await expect(
      createNextAction(store, { ...action, id: "action-2" }),
    ).rejects.toThrow(action.id);

    await store.closeNextAction(action.id, "2026-09-01T11:00:00.000Z");
    const replacement = { ...action, id: "action-2", createdAt: "2026-09-01T11:00:01.000Z" };
    await createNextAction(store, replacement);

    expect((await store.getNextAction(action.id))?.closedAt).toBe("2026-09-01T11:00:00.000Z");
    expect(await store.findOpenNextAction(project.id)).toEqual(replacement);
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
