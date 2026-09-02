import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
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
    const owner = await store.getOnlyOwner();
    if (owner === null) {
      return Response.json(
        {
          setupRequired: true,
          ownerId: null,
          activeCap: null,
          activeCount: 0,
          areas: [],
          progress: [],
          outstanding: [],
          shelved: [],
        } satisfies PortfolioResponse,
        { headers: responseHeaders },
      );
    }

    const [portfolio, areas] = await Promise.all([
      readPortfolio(store, clock, owner.id),
      store.listAreas(owner.id),
    ]);
    const allActive = [...portfolio.progress, ...portfolio.outstanding];
    const response: PortfolioResponse = {
      setupRequired: false,
      ownerId: owner.id,
      activeCap: owner.activeCap,
      activeCount: allActive.filter(({ area }) => area.countsAgainstCap).length,
      areas: areas.map(({ id, name, countsAgainstCap }) => ({ id, name, countsAgainstCap })),
      progress: portfolio.progress.map(toContractProject),
      outstanding: portfolio.outstanding.map(toContractProject),
      shelved: portfolio.shelved.map(toContractProject),
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
    state: value.project.state,
    area: {
      id: value.area.id,
      name: value.area.name,
      countsAgainstCap: value.area.countsAgainstCap,
    },
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
