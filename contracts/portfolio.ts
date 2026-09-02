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
  state: "active" | "shelved";
  area: {
    id: string;
    name: string;
    countsAgainstCap: boolean;
  };
  recentEntries: PortfolioEntry[];
  nextAction: PortfolioNextAction | null;
  progressSincePlan: number;
}

export interface PortfolioArea {
  id: string;
  name: string;
  countsAgainstCap: boolean;
}

export interface PortfolioReadyResponse {
  setupRequired: false;
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
