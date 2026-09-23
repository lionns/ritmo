import { randomUUID } from "node:crypto";
import type { APIRoute } from "astro";

import { exportDatabase } from "../../../adapters/runtime.ts";

export async function handleGetExport(): Promise<Response> {
  try {
    const { body, size } = await exportDatabase();
    const timestamp = new Date().toISOString().replaceAll(":", "-");
    return new Response(body, {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="ritmo-${timestamp}-${randomUUID()}.sqlite"`,
        "Content-Length": String(size),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Database export failed", error);
    return new Response("No se pudo descargar la copia. Vuelve a Ajustes e inténtalo otra vez.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

export const GET: APIRoute = () => handleGetExport();
