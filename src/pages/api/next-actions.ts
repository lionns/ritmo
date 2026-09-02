import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import { UlidGenerator } from "../../../adapters/ulid.ts";
import type { Clock } from "../../../core/ports/clock.ts";
import type { Store } from "../../../core/ports/store.ts";
import {
  NextActionRuleError,
  writeNextAction,
} from "../../../core/rules/next-action.ts";
import type {
  NextActionErrorResponse,
  WriteNextActionRequest,
  WriteNextActionResponse,
} from "../../../contracts/next-actions.ts";

const responseHeaders = { "Cache-Control": "no-store" };
const clock: Clock = { now: () => new Date() };

export async function handlePostNextAction(
  request: Request,
  injectedStore?: Store,
): Promise<Response> {
  const parsed = await parseRequest(request);
  if (parsed instanceof Response) return parsed;
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) return errorResponse("Complete setup first", 409);
    const nextAction = await writeNextAction(store, clock, new UlidGenerator(), {
      ownerId: owner.id,
      projectId: parsed.projectId,
      currentActionId: parsed.currentActionId ?? null,
      trigger: parsed.trigger,
      act: parsed.act,
      obstacle: parsed.obstacle ?? null,
      estimateMinutes: parsed.estimateMinutes ?? null,
    });
    return Response.json(
      {
        nextAction: {
          id: nextAction.id,
          projectId: nextAction.projectId,
          trigger: nextAction.trigger,
          act: nextAction.act,
          obstacle: nextAction.obstacle,
          estimateMinutes: nextAction.estimateMinutes,
          createdAt: nextAction.createdAt,
        },
        replacedActionId: parsed.currentActionId ?? null,
      } satisfies WriteNextActionResponse,
      { status: 201, headers: responseHeaders },
    );
  } catch (error) {
    if (error instanceof NextActionRuleError) return errorResponse(error.message, 422);
    console.error(JSON.stringify({
      message: "next action request failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return errorResponse("Next action could not be saved", 500);
  }
}

export const POST: APIRoute = ({ request }) => handlePostNextAction(request);

async function parseRequest(request: Request): Promise<WriteNextActionRequest | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse("Request body must be an object", 400);
  }
  const value = body as Record<string, unknown>;
  const projectId = value.projectId;
  const currentActionId = value.currentActionId;
  const trigger = value.trigger;
  const act = value.act;
  const obstacle = value.obstacle;
  const estimateMinutes = value.estimateMinutes;
  if (typeof projectId !== "string" || projectId.trim() === "") {
    return errorResponse("projectId must be a non-empty string", 400);
  }
  if (
    currentActionId !== undefined &&
    (typeof currentActionId !== "string" || currentActionId.trim() === "")
  ) {
    return errorResponse("currentActionId must be a non-empty string", 400);
  }
  if (typeof trigger !== "string" || trigger.trim() === "") {
    return errorResponse("trigger must be a non-empty string", 400);
  }
  if (typeof act !== "string" || act.trim() === "") {
    return errorResponse("act must be a non-empty string", 400);
  }
  if (obstacle !== undefined && typeof obstacle !== "string") {
    return errorResponse("obstacle must be a string", 400);
  }
  if (
    estimateMinutes !== undefined &&
    (typeof estimateMinutes !== "number" ||
      !Number.isInteger(estimateMinutes) ||
      estimateMinutes <= 0)
  ) {
    return errorResponse("estimateMinutes must be a positive integer", 400);
  }
  return {
    projectId: projectId.trim(),
    ...(currentActionId === undefined ? {} : { currentActionId: currentActionId.trim() }),
    trigger: trigger.trim(),
    act: act.trim(),
    ...(obstacle === undefined || obstacle.trim() === "" ? {} : { obstacle: obstacle.trim() }),
    ...(estimateMinutes === undefined ? {} : { estimateMinutes }),
  };
}

function errorResponse(error: string, status: number): Response {
  return Response.json(
    { error } satisfies NextActionErrorResponse,
    { status, headers: responseHeaders },
  );
}
