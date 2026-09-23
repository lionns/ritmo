import type { APIRoute } from "astro";
import { runtimeAuthConfig, runtimeStore } from "../../../../adapters/runtime.ts";
import { authRequest } from "../../../../adapters/http/auth.ts";
export const ALL: APIRoute = async ({ request, params }) =>
  authRequest(request, params.action ?? "", runtimeAuthConfig(), await runtimeStore());
