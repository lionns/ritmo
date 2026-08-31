import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/d1/store.ts";
import { UlidGenerator } from "../../../adapters/ulid.ts";
import type { Clock } from "../../../core/ports/clock.ts";
import { createProgressEntry, EntryRuleError } from "../../../core/rules/entry.ts";
import type {
  CreateEntryErrorResponse,
  CreateEntryRequest,
  CreateEntryResponse,
} from "../../../contracts/entries.ts";

const responseHeaders = { "Cache-Control": "no-store" };

export async function handlePostEntry(request: Request): Promise<Response> {
  const parsed = await parseRequest(request);
  if (parsed instanceof Response) return parsed;

  try {
    const store = runtimeStore();
    const owner = await store.getOwner();
    if (owner === null) {
      return errorResponse("Seeded owner is missing; run npm run seed", 503);
    }

    const clock: Clock = { now: () => new Date() };
    const entry = await createProgressEntry(store, clock, new UlidGenerator(clock), {
      ownerId: owner.id,
      projectId: parsed.projectId,
      what: parsed.what,
      effortMinutes: parsed.effortMinutes ?? null,
      note: parsed.note ?? null,
    });
    return Response.json(
      { id: entry.id } satisfies CreateEntryResponse,
      { status: 201, headers: responseHeaders },
    );
  } catch (error) {
    if (error instanceof EntryRuleError) return errorResponse(error.message, 422);
    console.error(
      JSON.stringify({
        message: "entry request failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return errorResponse("Entry could not be saved", 500);
  }
}

export const POST: APIRoute = ({ request }) => handlePostEntry(request);

async function parseRequest(request: Request): Promise<CreateEntryRequest | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse("Request body must be an object", 400);
  }
  const projectId = "projectId" in body ? body.projectId : undefined;
  const what = "what" in body ? body.what : undefined;
  const effortMinutes = "effortMinutes" in body ? body.effortMinutes : undefined;
  const note = "note" in body ? body.note : undefined;
  if (typeof projectId !== "string" || projectId.trim() === "") {
    return errorResponse("projectId must be a non-empty string", 400);
  }
  if (typeof what !== "string" || what.trim() === "") {
    return errorResponse("what must be a non-empty string", 400);
  }
  if (
    effortMinutes !== undefined &&
    (typeof effortMinutes !== "number" ||
      !Number.isInteger(effortMinutes) ||
      effortMinutes < 0)
  ) {
    return errorResponse("effortMinutes must be a non-negative integer", 400);
  }
  if (note !== undefined && typeof note !== "string") {
    return errorResponse("note must be a string", 400);
  }
  return {
    projectId: projectId.trim(),
    what: what.trim(),
    ...(effortMinutes === undefined ? {} : { effortMinutes }),
    ...(note === undefined ? {} : { note }),
  };
}

function errorResponse(message: string, status: number): Response {
  return Response.json(
    { error: message } satisfies CreateEntryErrorResponse,
    { status, headers: responseHeaders },
  );
}
