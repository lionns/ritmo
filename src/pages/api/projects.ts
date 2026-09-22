import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import { UlidGenerator } from "../../../adapters/ulid.ts";
import type { Clock } from "../../../core/ports/clock.ts";
import type { Store } from "../../../core/ports/store.ts";
import { StepRuleError } from "../../../core/rules/step.ts";
import {
  changeProjectState,
  createProjectWithinCap,
  finishProject,
  unfinishProject,
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
      firstStep: {
        title: parsed.step,
        estimateMinutes: parsed.estimateMinutes ?? null,
      },
    });
    return Response.json(
      {
        ...toResponse(result),
        step: {
          id: result.step.id,
          projectId: result.step.projectId,
          title: result.step.title,
          estimateMinutes: result.step.estimateMinutes,
          markedFor: result.step.markedFor,
          createdAt: result.step.createdAt,
          doneAt: result.step.doneAt,
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
    const result = parsed.state !== undefined
      ? await changeProjectState(store, owner.id, parsed.id, parsed.state)
      : parsed.finished === true
        ? await finishProject(store, clock, owner.id, parsed.id)
        : await unfinishProject(store, owner.id, parsed.id);
    return Response.json(toResponse(result), { headers: responseHeaders });
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
  const step = "step" in body ? body.step : undefined;
  const estimateMinutes = "estimateMinutes" in body ? body.estimateMinutes : undefined;
  if (typeof step !== "string" || step.trim() === "") {
    return errorResponse("step must be a non-empty string", 400);
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
    title: title.trim(),
    areaId: areaId.trim(),
    step: step.trim(),
    ...(estimateMinutes === undefined ? {} : { estimateMinutes }),
  };
}

async function parseStateRequest(request: Request): Promise<UpdateProjectStateRequest | Response> {
  const body = await readObject(request);
  if (body instanceof Response) return body;
  const id = "id" in body ? body.id : undefined;
  const state = "state" in body ? body.state : undefined;
  const finished = "finished" in body ? body.finished : undefined;
  if (typeof id !== "string" || id.trim() === "") return errorResponse("id must be a non-empty string", 400);
  if ((state === undefined) === (finished === undefined)) {
    return errorResponse("send exactly one of state and finished", 400);
  }
  if (finished !== undefined) {
    if (typeof finished !== "boolean") return errorResponse("finished must be a boolean", 400);
    return { id: id.trim(), finished };
  }
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
      finishedAt: result.project.finishedAt,
    },
    activeCount: result.activeCount,
    activeCap: result.activeCap,
    countsAgainstCap: result.countsAgainstCap,
  };
}

function projectError(error: unknown, fallback: string): Response {
  if (error instanceof ProjectRuleError || error instanceof StepRuleError) {
    return errorResponse(error.message, 422);
  }
  console.error(JSON.stringify({
    message: fallback,
    error: error instanceof Error ? error.message : String(error),
  }));
  return errorResponse(fallback, 500);
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error } satisfies CaptureErrorResponse, { status, headers: responseHeaders });
}
