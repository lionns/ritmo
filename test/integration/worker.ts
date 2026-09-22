import { handlePostEntry } from "../../src/pages/api/entries.ts";
import { handleGetPortfolio } from "../../src/pages/api/portfolio.ts";
import { handleGetArchive } from "../../src/pages/api/archive.ts";
import { handleGetProjectDetail } from "../../src/pages/api/project/[id].ts";
import { handlePostArea } from "../../src/pages/api/areas.ts";
import { handlePostProject, handlePatchProject } from "../../src/pages/api/projects.ts";
import { handleGetSettings, handlePatchSettings } from "../../src/pages/api/settings.ts";
import { handlePostSetup } from "../../src/pages/api/setup.ts";
import { handlePatchStep, handlePostStep } from "../../src/pages/api/steps.ts";
import type { Store } from "../../core/ports/store.ts";

export function testApplication(store: Store) {
  return async function fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/portfolio" && request.method === "GET") {
      return handleGetPortfolio(store);
    }
    if (pathname.startsWith("/api/project/") && request.method === "GET") {
      return handleGetProjectDetail(decodeURIComponent(pathname.slice("/api/project/".length)), store);
    }
    if (pathname === "/api/archive" && request.method === "GET") {
      return handleGetArchive(store);
    }
    if (pathname === "/api/entries" && request.method === "POST") {
      return handlePostEntry(request, store);
    }
    if (pathname === "/api/setup" && request.method === "POST") {
      return handlePostSetup(request, store);
    }
    if (pathname === "/api/areas" && request.method === "POST") {
      return handlePostArea(request, store);
    }
    if (pathname === "/api/projects" && request.method === "POST") {
      return handlePostProject(request, store);
    }
    if (pathname === "/api/projects" && request.method === "PATCH") {
      return handlePatchProject(request, store);
    }
    if (pathname === "/api/steps" && request.method === "POST") {
      return handlePostStep(request, store);
    }
    if (pathname === "/api/steps" && request.method === "PATCH") {
      return handlePatchStep(request, store);
    }
    if (pathname === "/api/settings" && request.method === "GET") {
      return handleGetSettings(store);
    }
    if (pathname === "/api/settings" && request.method === "PATCH") {
      return handlePatchSettings(request, store);
    }
    return new Response("Not found", { status: 404 });
  };
}
