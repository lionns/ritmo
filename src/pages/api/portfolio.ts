import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/d1/store.ts";
import type { Clock } from "../../../core/ports/clock.ts";
import {
  readPortfolio,
  type PortfolioProject as CorePortfolioProject,
} from "../../../core/rules/portfolio.ts";
import type {
  PortfolioErrorResponse,
  PortfolioProject,
  PortfolioResponse,
} from "../../../contracts/portfolio.ts";

const clock: Clock = { now: () => new Date() };
const responseHeaders = { "Cache-Control": "no-store" };

export async function handleGetPortfolio(): Promise<Response> {
  try {
    const store = runtimeStore();
    const owner = await store.getOwner();
    if (owner === null) {
      return Response.json(
        { error: "Seeded owner is missing; run npm run seed" } satisfies PortfolioErrorResponse,
        { status: 503, headers: responseHeaders },
      );
    }

    const portfolio = await readPortfolio(store, clock, owner.id);
    const response: PortfolioResponse = {
      ownerId: owner.id,
      progress: portfolio.progress.map(toContractProject),
      outstanding: portfolio.outstanding.map(toContractProject),
    };
    return Response.json(response, { headers: responseHeaders });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "portfolio request failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json(
      { error: "Portfolio could not be read" } satisfies PortfolioErrorResponse,
      { status: 500, headers: responseHeaders },
    );
  }
}

export const GET: APIRoute = handleGetPortfolio;

function toContractProject(value: CorePortfolioProject): PortfolioProject {
  return {
    id: value.project.id,
    title: value.project.title,
    area: { id: value.area.id, name: value.area.name },
    recentEntries: value.recentEntries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      occurredAt: entry.occurredAt,
      what: entry.what,
      effortMinutes: entry.effortMinutes,
      note: entry.note,
    })),
    nextAction: {
      id: value.nextAction.id,
      trigger: value.nextAction.trigger,
      act: value.nextAction.act,
      obstacle: value.nextAction.obstacle,
      estimateMinutes: value.nextAction.estimateMinutes,
    },
  };
}
