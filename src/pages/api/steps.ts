import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import { UlidGenerator } from "../../../adapters/ulid.ts";
import type { Clock } from "../../../core/ports/clock.ts";
import type { Store } from "../../../core/ports/store.ts";
import type { Step } from "../../../core/model/entities.ts";
import {
  completeStep,
  markStepFor,
  StepRuleError,
  unmarkStep,
  writeStep,
} from "../../../core/rules/step.ts";
import type {
  StepErrorResponse,
  StepResponse,
  UpdateStepRequest,
  WriteStepRequest,
} from "../../../contracts/steps.ts";

const responseHeaders = { "Cache-Control": "no-store" };
const clock: Clock = { now: () => new Date() };

export async function handlePostStep(request: Request, injectedStore?: Store): Promise<Response> {
  const parsed = await parseWriteRequest(request);
  if (parsed instanceof Response) return parsed;
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) return errorResponse("Complete setup before writing a step", 409);
    const step = await writeStep(store, clock, new UlidGenerator(), {
      ownerId: owner.id,
      projectId: parsed.projectId,
      title: parsed.title,
      estimateMinutes: parsed.estimateMinutes ?? null,
    });
    return Response.json(toResponse(step), { status: 201, headers: responseHeaders });
  } catch (error) {
    return stepError(error, "Step could not be saved");
  }
}

export async function handlePatchStep(request: Request, injectedStore?: Store): Promise<Response> {
  const parsed = await parseUpdateRequest(request);
  if (parsed instanceof Response) return parsed;
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) return errorResponse("Complete setup before marking a step", 409);

    if (parsed.done === true) {
      await completeStep(store, clock, parsed.id, owner.id);
    } else if (parsed.markedFor === null) {
      await unmarkStep(store, parsed.id, owner.id);
    } else if (parsed.markedFor !== undefined) {
      await markStepFor(store, parsed.id, owner.id, parsed.markedFor);
    }

    const step = await store.getStep(parsed.id);
    if (step === null) return errorResponse(`Step ${parsed.id} does not exist`, 422);
    return Response.json(toResponse(step), { headers: responseHeaders });
  } catch (error) {
    return stepError(error, "Step could not be updated");
  }
}

export const POST: APIRoute = ({ request }) => handlePostStep(request);
export const PATCH: APIRoute = ({ request }) => handlePatchStep(request);

async function parseWriteRequest(request: Request): Promise<WriteStepRequest | Response> {
  const body = await readObject(request);
  if (body instanceof Response) return body;
  const projectId = "projectId" in body ? body.projectId : undefined;
  const title = "title" in body ? body.title : undefined;
  const estimateMinutes = "estimateMinutes" in body ? body.estimateMinutes : undefined;
  if (typeof projectId !== "string" || projectId.trim() === "") {
    return errorResponse("projectId must be a non-empty string", 400);
  }
  if (typeof title !== "string" || title.trim() === "") {
    return errorResponse("title must be a non-empty string", 400);
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
    title: title.trim(),
    ...(estimateMinutes === undefined ? {} : { estimateMinutes }),
  };
}

async function parseUpdateRequest(request: Request): Promise<UpdateStepRequest | Response> {
  const body = await readObject(request);
  if (body instanceof Response) return body;
  const id = "id" in body ? body.id : undefined;
  if (typeof id !== "string" || id.trim() === "") {
    return errorResponse("id must be a non-empty string", 400);
  }
  const marks = "markedFor" in body;
  const completes = "done" in body;
  if (marks === completes) {
    return errorResponse("send exactly one of markedFor and done", 400);
  }
  if (completes) {
    if (body.done !== true) return errorResponse("done must be true", 400);
    return { id: id.trim(), done: true };
  }
  const markedFor = body.markedFor;
  if (markedFor !== null && typeof markedFor !== "string") {
    return errorResponse("markedFor must be a calendar date or null", 400);
  }
  return { id: id.trim(), markedFor };
}

async function readObject(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return errorResponse("Request body must be an object", 400);
    }
    return body as Record<string, unknown>;
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }
}

function toResponse(step: Step): StepResponse {
  return {
    step: {
      id: step.id,
      projectId: step.projectId,
      title: step.title,
      estimateMinutes: step.estimateMinutes,
      markedFor: step.markedFor,
      createdAt: step.createdAt,
      doneAt: step.doneAt,
    },
  };
}

function stepError(error: unknown, fallback: string): Response {
  if (error instanceof StepRuleError) return errorResponse(error.message, 422);
  console.error(JSON.stringify({
    message: fallback,
    error: error instanceof Error ? error.message : String(error),
  }));
  return errorResponse(fallback, 500);
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error } satisfies StepErrorResponse, { status, headers: responseHeaders });
}
