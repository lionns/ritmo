import type { StepContract } from "./steps.ts";

export interface SetupRequest {
  activeCap: number;
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

export interface UpdateProjectStateRequest {
  id: string;
  state: "active" | "shelved";
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
