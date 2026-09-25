import type { StepContract } from "./steps.ts";

export interface SetupRequest {
  activeCap: number;
  timeZone: string;
}

export interface SetupResponse {
  ownerId: string;
  activeCap: number;
}

export interface CaptureArea {
  id: string;
  name: string;
  countsAgainstCap: boolean;
}

export interface CaptureProject {
  finishedAt?: string | null;
  id: string;
  areaId: string;
  title: string;
  state: "active" | "shelved";
}

export interface SettingsResponse {
  activeCap: number;
  capRaises: Array<{ amount: number; raisedAt: string }>;
  areas: CaptureArea[];
  projects: CaptureProject[];
}

export interface UpdateCapRequest {
  activeCap: number;
}

export interface CreateAreaRequest {
  name: string;
  countsAgainstCap: boolean;
}

export interface CreateAreaResponse {
  area: CaptureArea;
}

export interface CreateProjectRequest {
  title: string;
  areaId: string;
  /** The first step. A project without one is a project you do not know how to continue. */
  step: string;
  estimateMinutes?: number;
}

/**
 * Exactly one of `state` and `finished` per request. They answer different questions — the
 * commitment and the outcome — and a request carrying both would not say which it meant.
 */
export interface UpdateProjectStateRequest {
  id: string;
  state?: "active" | "shelved";
  finished?: boolean;
}

export interface ProjectMutationResponse {
  project: CaptureProject;
  activeCount: number;
  activeCap: number;
  countsAgainstCap: boolean;
}

export interface CreateProjectResponse extends ProjectMutationResponse {
  step: StepContract;
}

export interface CaptureErrorResponse {
  error: string;
}
