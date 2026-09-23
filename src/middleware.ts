import { defineMiddleware } from "astro:middleware";
import { runtimeAuthConfig, runtimeStore } from "../adapters/runtime.ts";
import { guard } from "../adapters/http/auth.ts";

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  if (url.pathname.startsWith("/_astro/") || url.pathname === "/favicon.svg") return next();
  try {
    return await guard(request, runtimeAuthConfig(), await runtimeStore(), next);
  } catch {
    return new Response("El acceso no está configurado o no está disponible.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
});
