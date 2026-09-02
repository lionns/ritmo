import type { Area, Entry, NextAction, Owner, Project } from "../model/entities.ts";

export interface OpenNextActionWithProgress {
  action: NextAction;
  progressSincePlan: number;
}

export interface Store {
  createOwner(owner: Owner): Promise<void>;
  getOwner(id: string): Promise<Owner | null>;
  getOnlyOwner(): Promise<Owner | null>;
  updateOwnerCap(id: string, activeCap: number, capRaises: Owner["capRaises"]): Promise<void>;
  createArea(area: Area): Promise<void>;
  getArea(id: string): Promise<Area | null>;
  listAreas(ownerId: string): Promise<Area[]>;
  readAreas(areaIds: string[]): Promise<Area[]>;
  createProject(project: Project): Promise<void>;
  getProject(id: string): Promise<Project | null>;
  listProjects(ownerId: string): Promise<Project[]>;
  listActiveProjects(ownerId: string): Promise<Project[]>;
  setProjectState(id: string, ownerId: string, state: Project["state"]): Promise<void>;
  hasClosedWeek(ownerId: string): Promise<boolean>;
  createNextAction(action: NextAction): Promise<void>;
  getNextAction(id: string): Promise<NextAction | null>;
  findOpenNextAction(projectId: string): Promise<NextAction | null>;
  readOpenNextActionsWithProgress(projectIds: string[]): Promise<OpenNextActionWithProgress[]>;
  replaceNextAction(id: string, closedAt: string, replacement: NextAction): Promise<boolean>;
  createEntry(entry: Entry): Promise<void>;
  readRecentEntries(projectIds: string[], occurredSince: string): Promise<Entry[]>;
}
