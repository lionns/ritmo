import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import { UlidGenerator } from "../../../adapters/ulid.ts";
import type { Store } from "../../../core/ports/store.ts";
import type {
  CaptureErrorResponse,
  SetupRequest,
  SetupResponse,
} from "../../../contracts/capture.ts";

const responseHeaders = { "Cache-Control": "no-store" };

export async function handlePostSetup(request: Request, injectedStore?: Store): Promise<Response> {
  const parsed = await parseRequest(request);
  if (parsed instanceof Response) return parsed;

  try {
    const store = injectedStore ?? runtimeStore();
    if (await store.getOnlyOwner() !== null) return errorResponse("Setup already exists", 409);
    const owner = { id: new UlidGenerator().next(), activeCap: parsed.activeCap, capRaises: [] };
    await store.createOwner(owner);
    return Response.json(
      { ownerId: owner.id, activeCap: owner.activeCap } satisfies SetupResponse,
      { status: 201, headers: responseHeaders },
    );
  } catch (error) {
    console.error(JSON.stringify({
      message: "setup request failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return errorResponse("Setup could not be saved", 500);
  }
}

export const POST: APIRoute = ({ request }) => handlePostSetup(request);

async function parseRequest(request: Request): Promise<SetupRequest | Response> {
  const body = await readObject(request);
  if (body instanceof Response) return body;
  const activeCap = "activeCap" in body ? body.activeCap : undefined;
  if (!isPositiveInteger(activeCap)) return errorResponse("activeCap must be a positive integer", 400);
  return { activeCap };
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

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error } satisfies CaptureErrorResponse, { status, headers: responseHeaders });
}
