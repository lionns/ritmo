import type { NextActionContract, NextActionRequestFields } from "./next-actions.ts";

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

export interface CreateProjectRequest extends NextActionRequestFields {
  title: string;
  areaId: string;
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
  nextAction: NextActionContract;
}

export interface CaptureErrorResponse {
  error: string;
}
