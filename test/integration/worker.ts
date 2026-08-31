import { handlePostEntry } from "../../src/pages/api/entries.ts";
import { handleGetPortfolio } from "../../src/pages/api/portfolio.ts";

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/portfolio" && request.method === "GET") {
      return handleGetPortfolio();
    }
    if (pathname === "/api/entries" && request.method === "POST") {
      return handlePostEntry(request);
    }
    return new Response("Not found", { status: 404 });
  },
};
