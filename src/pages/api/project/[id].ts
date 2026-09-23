import { currentOwnerId } from "../../../../adapters/http/session.ts";
import type { APIRoute } from "astro";

import { runtimeStore } from "../../../../adapters/runtime.ts";
import type { Clock } from "../../../../core/ports/clock.ts";
import type { Store } from "../../../../core/ports/store.ts";
import {
  readProjectDetail,
  ProjectDetailRuleError,
  type ProjectDetail,
} from "../../../../core/rules/project-detail.ts";
import { calendarDateOf } from "../../../../core/rules/step.ts";
import { readCalibration, type Calibration } from "../../../../core/rules/calibration.ts";
import type {
  ProjectDetailErrorResponse,
  ProjectDetailResponse,
  ProjectHistoryItem,
} from "../../../../contracts/project.ts";

const responseHeaders = { "Cache-Control": "no-store" };
const clock: Clock = { now: () => new Date() };

export async function handleGetProjectDetail(
  id: string,
  injectedStore?: Store,
): Promise<Response> {
  try {
    const store = injectedStore ?? await runtimeStore();
    const owner = await store.getOwner(currentOwnerId());
    if (owner === null) return errorResponse("Complete setup first", 409);
    const [detail, calibration] = await Promise.all([
      readProjectDetail(store, owner.id, id),
      readCalibration(store, owner.id),
    ]);
    return Response.json(toResponse(detail, calibration), { headers: responseHeaders });
  } catch (error) {
    // A project that does not exist is a 404, not a 500: the id came from a URL someone typed.
    if (error instanceof ProjectDetailRuleError) return errorResponse(error.message, 404);
    console.error(JSON.stringify({
      message: "project detail request failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return errorResponse("El proyecto no se pudo leer", 500);
  }
}

export const GET: APIRoute = ({ params }) => handleGetProjectDetail(params.id ?? "");

function toResponse(detail: ProjectDetail, calibration: Calibration | null): ProjectDetailResponse {
  const { project, area, openSteps, recentEntries } = detail;
  // Counted since the oldest open step was written — the anchor the portfolio row uses (`D-024`).
  const openedAt = openSteps[0]?.createdAt ?? null;
  return {
    id: project.id,
    title: project.title,
    areaName: area.name,
    state: project.state,
    finishedAt: project.finishedAt,
    today: calendarDateOf(clock.now()),
    openSteps: openSteps.map((step) => ({
      id: step.id,
      title: step.title,
      estimateMinutes: step.estimateMinutes,
      markedFor: step.markedFor,
      createdAt: step.createdAt,
    })),
    history: mergedHistory(detail),
    calibration,
    recentEntries: recentEntries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      occurredAt: entry.occurredAt,
      what: entry.what,
      effortMinutes: entry.effortMinutes,
      note: entry.note,
    })),
    progressSincePlan: openedAt === null
      ? 0
      : recentEntries.filter(
          (entry) => entry.kind === "progress" && entry.occurredAt >= openedAt,
        ).length,
  };
}

/**
 * Entries and closed steps in one time-ordered list, newest first. Merged here rather than in the
 * page so the order is decided once and can be asserted: a step closed and an entry written the
 * same day must read in the order they happened.
 */
function mergedHistory({ recentEntries, doneSteps }: ProjectDetail): ProjectHistoryItem[] {
  const items: ProjectHistoryItem[] = [
    ...recentEntries.map((entry): ProjectHistoryItem => ({
      kind: "entry",
      id: entry.id,
      at: entry.occurredAt,
      what: entry.what,
      effortMinutes: entry.effortMinutes,
    })),
    ...doneSteps.map(({ step, effortMinutes }): ProjectHistoryItem => ({
      kind: "step",
      id: step.id,
      at: step.doneAt ?? step.createdAt,
      title: step.title,
      estimateMinutes: step.estimateMinutes,
      effortMinutes,
    })),
  ];
  return items.sort((left, right) => right.at.localeCompare(left.at) || right.id.localeCompare(left.id));
}

function errorResponse(error: string, status: number): Response {
  return Response.json(
    { error } satisfies ProjectDetailErrorResponse,
    { status, headers: responseHeaders },
  );
}
