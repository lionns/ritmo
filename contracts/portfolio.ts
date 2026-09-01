export interface PortfolioEntry {
  id: string;
  kind: "progress" | "reserve_spend";
  occurredAt: string;
  what: string;
  effortMinutes: number | null;
  note: string | null;
}

export interface PortfolioNextAction {
  id: string;
  trigger: string;
  act: string;
  obstacle: string | null;
  estimateMinutes: number | null;
  createdAt: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  area: {
    id: string;
    name: string;
  };
  recentEntries: PortfolioEntry[];
  nextAction: PortfolioNextAction | null;
  progressSincePlan: number;
}

export interface PortfolioResponse {
  ownerId: string;
  progress: PortfolioProject[];
  outstanding: PortfolioProject[];
}

export interface PortfolioErrorResponse {
  error: string;
}
