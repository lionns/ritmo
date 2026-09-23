import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/runtime.ts";
import type { Clock } from "../../../core/ports/clock.ts";
import type { Store } from "../../../core/ports/store.ts";
import {
  readPortfolio,
  type PortfolioProject as CorePortfolioProject,
} from "../../../core/rules/portfolio.ts";
import { calendarDateOf } from "../../../core/rules/step.ts";

import type {
  PortfolioErrorResponse,
  PortfolioProject,
  PortfolioResponse,
  PortfolioStep,
} from "../../../contracts/portfolio.ts";

const clock: Clock = { now: () => new Date() };
const responseHeaders = { "Cache-Control": "no-store" };

export async function handleGetPortfolio(injectedStore?: Store): Promise<Response> {
  try {
    const store = injectedStore ?? await runtimeStore();
    const owner = await store.getOnlyOwner();
    if (owner === null) {
      return Response.json(
        {
          setupRequired: true,
          today: calendarDateOf(clock.now()),
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
    // No finished project reaches either group any more (`D-026`), so the cap is decided in one
    // place — `core/rules/project.ts` — and a second filter here would be a guard nothing can
    // reach, which is a guard nothing can test.
    const allActive = [...portfolio.progress, ...portfolio.outstanding];
    const response: PortfolioResponse = {
      setupRequired: false,
      today: calendarDateOf(clock.now()),
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
    finishedAt: value.project.finishedAt,
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
    openSteps: value.openSteps.map((step): PortfolioStep => ({
      id: step.id,
      title: step.title,
      estimateMinutes: step.estimateMinutes,
      markedFor: step.markedFor,
      createdAt: step.createdAt,
    })),
  };
}
