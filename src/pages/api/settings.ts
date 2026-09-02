import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import type { Clock } from "../../../core/ports/clock.ts";
import type { Store } from "../../../core/ports/store.ts";
import { ProjectRuleError, updateActiveCap } from "../../../core/rules/project.ts";
import type {
  CaptureErrorResponse,
  SettingsResponse,
  UpdateCapRequest,
} from "../../../contracts/capture.ts";

const responseHeaders = { "Cache-Control": "no-store" };
const clock: Clock = { now: () => new Date() };

export async function handleGetSettings(injectedStore?: Store): Promise<Response> {
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) return errorResponse("Complete setup first", 409);
    return Response.json(await settingsResponse(store, owner), { headers: responseHeaders });
  } catch (error) {
    console.error(JSON.stringify({
      message: "settings request failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return errorResponse("Settings could not be read", 500);
  }
}

export async function handlePatchSettings(request: Request, injectedStore?: Store): Promise<Response> {
  const parsed = await parseRequest(request);
  if (parsed instanceof Response) return parsed;
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) return errorResponse("Complete setup first", 409);
    const updated = await updateActiveCap(store, clock, owner.id, parsed.activeCap);
    return Response.json(await settingsResponse(store, updated), { headers: responseHeaders });
  } catch (error) {
    if (error instanceof ProjectRuleError) return errorResponse(error.message, 422);
    console.error(JSON.stringify({
      message: "settings update failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return errorResponse("Settings could not be saved", 500);
  }
}

export const GET: APIRoute = () => handleGetSettings();
export const PATCH: APIRoute = ({ request }) => handlePatchSettings(request);

async function settingsResponse(store: Store, owner: Awaited<ReturnType<Store["getOwner"]>> & {}): Promise<SettingsResponse> {
  const [areas, projects] = await Promise.all([
    store.listAreas(owner.id),
    store.listProjects(owner.id),
  ]);
  return {
    activeCap: owner.activeCap,
    capRaises: owner.capRaises,
    areas: areas.map(({ id, name, countsAgainstCap }) => ({ id, name, countsAgainstCap })),
    projects: projects.map(({ id, areaId, title, state }) => ({ id, areaId, title, state })),
  };
}

async function parseRequest(request: Request): Promise<UpdateCapRequest | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse("Request body must be an object", 400);
  }
  const activeCap = "activeCap" in body ? body.activeCap : undefined;
  if (typeof activeCap !== "number" || !Number.isInteger(activeCap) || activeCap <= 0) {
    return errorResponse("activeCap must be a positive integer", 400);
  }
  return { activeCap };
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error } satisfies CaptureErrorResponse, { status, headers: responseHeaders });
}
