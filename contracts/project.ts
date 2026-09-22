import type { PortfolioEntry, PortfolioStep } from "./portfolio.ts";

export interface ProjectDetailResponse {
  id: string;
  title: string;
  areaName: string;
  state: "active" | "shelved";
  finishedAt: string | null;
  /** Decided once on the server, so the screen and the landing never disagree about the day. */
  today: string;
  openSteps: PortfolioStep[];
  recentEntries: PortfolioEntry[];
  /** Entries and closed steps in one list, newest first. */
  history: ProjectHistoryItem[];
  progressSincePlan: number;
}

export interface ProjectDetailErrorResponse {
  error: string;
}

/**
 * One line of a project's history. A closed step and a written entry are different kinds of
 * record — one says a piece of the plan is finished, the other says what moved — so they are
 * distinguished here rather than in the page (`D-024`, `D-027`).
 */
export type ProjectHistoryItem =
  | {
      kind: "entry";
      id: string;
      at: string;
      what: string;
      effortMinutes: number | null;
    }
  | {
      kind: "step";
      id: string;
      at: string;
      title: string;
      estimateMinutes: number | null;
      /** What was attributed to it. Zero means the product does not know, and says nothing. */
      effortMinutes: number;
    };
