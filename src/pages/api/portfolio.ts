import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import { LOCAL_OWNER_ID } from "../../../adapters/local-owner.ts";
import type { Clock } from "../../../core/ports/clock.ts";
import type { Store } from "../../../core/ports/store.ts";
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

export async function handleGetPortfolio(injectedStore?: Store): Promise<Response> {
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOwner(LOCAL_OWNER_ID);
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

export const GET: APIRoute = () => handleGetPortfolio();

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
    progressSincePlan: value.progressSincePlan,
    nextAction:
      value.nextAction === null
        ? null
        : {
            id: value.nextAction.id,
            trigger: value.nextAction.trigger,
            act: value.nextAction.act,
            obstacle: value.nextAction.obstacle,
            estimateMinutes: value.nextAction.estimateMinutes,
            createdAt: value.nextAction.createdAt,
          },
  };
}
