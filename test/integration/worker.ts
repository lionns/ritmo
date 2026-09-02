import { handlePostEntry } from "../../src/pages/api/entries.ts";
import { handleGetPortfolio } from "../../src/pages/api/portfolio.ts";
import type { Store } from "../../core/ports/store.ts";

export function testApplication(store: Store) {
  return async function fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/portfolio" && request.method === "GET") {
      return handleGetPortfolio(store);
    }
    if (pathname === "/api/entries" && request.method === "POST") {
      return handlePostEntry(request, store);
    }
    return new Response("Not found", { status: 404 });
  };
}
