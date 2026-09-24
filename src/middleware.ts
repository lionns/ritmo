import { defineMiddleware } from "astro:middleware";
import { runtimeAuthConfig, runtimeStore } from "../adapters/runtime.ts";
import { guard } from "../adapters/http/auth.ts";

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  if (url.protocol === "http:" && url.hostname !== "localhost") {
    url.protocol = "https:";
    return new Response(null, {
      status: 308,
      headers: { Location: url.toString(), "Cache-Control": "no-store" },
    });
  }

  let response: Response;
  try {
    response = url.pathname.startsWith("/_astro/") || url.pathname === "/favicon.svg"
      ? await next()
      : await guard(request, runtimeAuthConfig(), await runtimeStore(), next);
  } catch {
    response = new Response("El acceso no está configurado o no está disponible.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const headers = new Headers(response.headers);
  headers.set("Strict-Transport-Security", "max-age=31536000");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
