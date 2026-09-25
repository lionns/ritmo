import { currentOwnerId } from "../../../adapters/http/session.ts";
import type { APIRoute } from "astro";
import { runtimeStore } from "../../../adapters/runtime.ts";
import type { Store } from "../../../core/ports/store.ts";
import { normalizeTimeZone } from "../../../core/rules/step.ts";

export async function handlePostTimeZone(
  request: Request,
  injectedStore?: Store,
  ownerId = currentOwnerId(),
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }
  const candidate = typeof body === "object" && body !== null && !Array.isArray(body) && "timeZone" in body
    ? body.timeZone
    : undefined;
  const timeZone = normalizeTimeZone(candidate);
  if (timeZone === null) return errorResponse("timeZone must be a valid IANA time zone", 400);

  try {
    const store = injectedStore ?? await runtimeStore();
    const owner = await store.getOwner(ownerId);
    if (owner === null) return errorResponse("Complete setup first", 409);
    const changed = owner.timeZone !== timeZone;
    if (changed) await store.updateOwnerTimeZone(owner.id, timeZone);
    return Response.json({ changed, timeZone }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse("Time zone could not be saved", 500);
  }
}

export const POST: APIRoute = ({ request }) => handlePostTimeZone(request);

function errorResponse(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}
