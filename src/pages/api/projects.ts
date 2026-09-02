import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import { UlidGenerator } from "../../../adapters/ulid.ts";
import type { Store } from "../../../core/ports/store.ts";
import {
  changeProjectState,
  createProjectWithinCap,
  ProjectRuleError,
  type ProjectCapResult,
} from "../../../core/rules/project.ts";
import type {
  CaptureErrorResponse,
  CreateProjectRequest,
  ProjectMutationResponse,
  UpdateProjectStateRequest,
} from "../../../contracts/capture.ts";

const responseHeaders = { "Cache-Control": "no-store" };

export async function handlePostProject(request: Request, injectedStore?: Store): Promise<Response> {
  const parsed = await parseCreateRequest(request);
  if (parsed instanceof Response) return parsed;
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) return errorResponse("Complete setup before creating a project", 409);
    const result = await createProjectWithinCap(store, new UlidGenerator(), {
      ownerId: owner.id,
      areaId: parsed.areaId,
      title: parsed.title,
    });
    return Response.json(toResponse(result), { status: 201, headers: responseHeaders });
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
  return { title: title.trim(), areaId: areaId.trim() };
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
  if (error instanceof ProjectRuleError) return errorResponse(error.message, 422);
  console.error(JSON.stringify({
    message: fallback,
    error: error instanceof Error ? error.message : String(error),
  }));
  return errorResponse(fallback, 500);
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error } satisfies CaptureErrorResponse, { status, headers: responseHeaders });
}
