import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import { UlidGenerator } from "../../../adapters/ulid.ts";
import type { Clock } from "../../../core/ports/clock.ts";
import type { Store } from "../../../core/ports/store.ts";
import { NextActionRuleError } from "../../../core/rules/next-action.ts";
import {
  changeProjectState,
  createProjectWithinCap,
  ProjectRuleError,
  type ProjectCapResult,
} from "../../../core/rules/project.ts";
import type {
  CaptureErrorResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectMutationResponse,
  UpdateProjectStateRequest,
} from "../../../contracts/capture.ts";

const responseHeaders = { "Cache-Control": "no-store" };
const clock: Clock = { now: () => new Date() };

export async function handlePostProject(request: Request, injectedStore?: Store): Promise<Response> {
  const parsed = await parseCreateRequest(request);
  if (parsed instanceof Response) return parsed;
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) return errorResponse("Complete setup before creating a project", 409);
    const result = await createProjectWithinCap(store, clock, new UlidGenerator(), {
      ownerId: owner.id,
      areaId: parsed.areaId,
      title: parsed.title,
      trigger: parsed.trigger,
      act: parsed.act,
      obstacle: parsed.obstacle ?? null,
      estimateMinutes: parsed.estimateMinutes ?? null,
    });
    return Response.json(
      {
        ...toResponse(result),
        nextAction: {
          id: result.nextAction.id,
          projectId: result.nextAction.projectId,
          trigger: result.nextAction.trigger,
          act: result.nextAction.act,
          obstacle: result.nextAction.obstacle,
          estimateMinutes: result.nextAction.estimateMinutes,
          createdAt: result.nextAction.createdAt,
        },
      } satisfies CreateProjectResponse,
      { status: 201, headers: responseHeaders },
    );
  } catch (error) {
    return projectError(error, "Project could not be saved");
  }
}

export async function handlePatchProject(request: Request, injectedStore?: Store): Promise<Response> {
  const parsed = await parseStateRequest(request);
  if (parsed instanceof Response) return parsed;
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) return errorResponse("Complete setup first", 409);
    return Response.json(
      toResponse(await changeProjectState(store, owner.id, parsed.id, parsed.state)),
      { headers: responseHeaders },
    );
  } catch (error) {
    return projectError(error, "Project state could not be saved");
  }
}

export const POST: APIRoute = ({ request }) => handlePostProject(request);
export const PATCH: APIRoute = ({ request }) => handlePatchProject(request);

async function parseCreateRequest(request: Request): Promise<CreateProjectRequest | Response> {
  const body = await readObject(request);
  if (body instanceof Response) return body;
  const title = "title" in body ? body.title : undefined;
  const areaId = "areaId" in body ? body.areaId : undefined;
  if (typeof title !== "string" || title.trim() === "") return errorResponse("title must be a non-empty string", 400);
  if (typeof areaId !== "string" || areaId.trim() === "") return errorResponse("areaId must be a non-empty string", 400);
  const fields = parseNextActionFields(body);
  if (fields instanceof Response) return fields;
  return { title: title.trim(), areaId: areaId.trim(), ...fields };
}

async function parseStateRequest(request: Request): Promise<UpdateProjectStateRequest | Response> {
  const body = await readObject(request);
  if (body instanceof Response) return body;
  const id = "id" in body ? body.id : undefined;
  const state = "state" in body ? body.state : undefined;
  if (typeof id !== "string" || id.trim() === "") return errorResponse("id must be a non-empty string", 400);
  if (state !== "active" && state !== "shelved") return errorResponse("state must be active or shelved", 400);
  return { id: id.trim(), state };
}

async function readObject(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return errorResponse("Request body must be an object", 400);
    return body as Record<string, unknown>;
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }
}

function toResponse(result: ProjectCapResult): ProjectMutationResponse {
  return {
    project: {
      id: result.project.id,
      areaId: result.project.areaId,
      title: result.project.title,
      state: result.project.state,
    },
    activeCount: result.activeCount,
    activeCap: result.activeCap,
    countsAgainstCap: result.countsAgainstCap,
  };
}

function projectError(error: unknown, fallback: string): Response {
  if (error instanceof ProjectRuleError || error instanceof NextActionRuleError) {
    return errorResponse(error.message, 422);
  }
  console.error(JSON.stringify({
    message: fallback,
    error: error instanceof Error ? error.message : String(error),
  }));
  return errorResponse(fallback, 500);
}

function parseNextActionFields(
  body: Record<string, unknown>,
): Pick<CreateProjectRequest, "trigger" | "act" | "obstacle" | "estimateMinutes"> | Response {
  const trigger = "trigger" in body ? body.trigger : undefined;
  const act = "act" in body ? body.act : undefined;
  const obstacle = "obstacle" in body ? body.obstacle : undefined;
  const estimateMinutes = "estimateMinutes" in body ? body.estimateMinutes : undefined;
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
    trigger: trigger.trim(),
    act: act.trim(),
    ...(obstacle === undefined || obstacle.trim() === "" ? {} : { obstacle: obstacle.trim() }),
    ...(estimateMinutes === undefined ? {} : { estimateMinutes }),
  };
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error } satisfies CaptureErrorResponse, { status, headers: responseHeaders });
}
