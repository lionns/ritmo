export interface PortfolioEntry {
  id: string;
  kind: "progress" | "reserve_spend";
  occurredAt: string;
  what: string;
  effortMinutes: number | null;
  note: string | null;
}

export interface PortfolioStep {
  id: string;
  title: string;
  estimateMinutes: number | null;
  /** The day the owner said they would do it, or null. Only today's is ever rendered (FR-22). */
  markedFor: string | null;
  createdAt: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  state: "active" | "shelved";
  /** When it was finished, or null. Only a project finished this week reaches the landing. */
  finishedAt: string | null;
  area: {
    id: string;
    name: string;
    countsAgainstCap: boolean;
  };
  recentEntries: PortfolioEntry[];
  /**
   * Every open step, oldest first. The row renders only those whose `markedFor` is today; the
   * rest reach the page inside a collapsed disclosure, which renders nothing until opened. No
   * count of them is rendered anywhere — the third guardrail of `D-024`.
   */
  openSteps: PortfolioStep[];
  progressSincePlan: number;
}

export interface PortfolioArea {
  id: string;
  name: string;
  countsAgainstCap: boolean;
}

export interface PortfolioReadyResponse {
  setupRequired: false;
  /**
   * Today, in the owner's own calendar, decided once on the server (`D-020`). The screens compare
   * `PortfolioStep.markedFor` against it rather than reading a clock of their own, so a page open
   * across midnight cannot disagree with itself about which day it is showing.
   */
  today: string;
  ownerId: string;
  activeCap: number;
  activeCount: number;
  areas: PortfolioArea[];
  progress: PortfolioProject[];
  outstanding: PortfolioProject[];
  shelved: PortfolioProject[];
}

export interface PortfolioSetupResponse {
  setupRequired: true;
  today: string;
  ownerId: null;
  activeCap: null;
  activeCount: 0;
  areas: [];
  progress: [];
  outstanding: [];
  shelved: [];
}

export type PortfolioResponse = PortfolioReadyResponse | PortfolioSetupResponse;

export interface PortfolioErrorResponse {
  error: string;
}
