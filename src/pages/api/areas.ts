import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import { UlidGenerator } from "../../../adapters/ulid.ts";
import type { Store } from "../../../core/ports/store.ts";
import type {
  CaptureErrorResponse,
  CreateAreaRequest,
  CreateAreaResponse,
} from "../../../contracts/capture.ts";

const responseHeaders = { "Cache-Control": "no-store" };

export async function handlePostArea(request: Request, injectedStore?: Store): Promise<Response> {
  const parsed = await parseRequest(request);
  if (parsed instanceof Response) return parsed;

  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) return errorResponse("Complete setup before creating an area", 409);
    const area = {
      id: new UlidGenerator().next(),
      ownerId: owner.id,
      name: parsed.name,
      countsAgainstCap: parsed.countsAgainstCap,
    };
    await store.createArea(area);
    return Response.json(
      { area: { id: area.id, name: area.name, countsAgainstCap: area.countsAgainstCap } } satisfies CreateAreaResponse,
      { status: 201, headers: responseHeaders },
    );
  } catch (error) {
    console.error(JSON.stringify({
      message: "area request failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return errorResponse("Area could not be saved", 500);
  }
}

export const POST: APIRoute = ({ request }) => handlePostArea(request);

async function parseRequest(request: Request): Promise<CreateAreaRequest | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse("Request body must be an object", 400);
  }
  const name = "name" in body ? body.name : undefined;
  const countsAgainstCap = "countsAgainstCap" in body ? body.countsAgainstCap : undefined;
  if (typeof name !== "string" || name.trim() === "") {
    return errorResponse("name must be a non-empty string", 400);
  }
  if (typeof countsAgainstCap !== "boolean") {
    return errorResponse("countsAgainstCap must be a boolean", 400);
  }
  return { name: name.trim(), countsAgainstCap };
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error } satisfies CaptureErrorResponse, { status, headers: responseHeaders });
}
