import type { Area, Entry, NextAction, Owner, Project } from "../model/entities.ts";

export interface Store {
  createOwner(owner: Owner): Promise<void>;
  getOwner(id: string): Promise<Owner | null>;
  createArea(area: Area): Promise<void>;
  getArea(id: string): Promise<Area | null>;
  readAreas(areaIds: string[]): Promise<Area[]>;
  createProject(project: Project): Promise<void>;
  getProject(id: string): Promise<Project | null>;
  listActiveProjects(ownerId: string): Promise<Project[]>;
  createNextAction(action: NextAction): Promise<void>;
  getNextAction(id: string): Promise<NextAction | null>;
  findOpenNextAction(projectId: string): Promise<NextAction | null>;
  readOpenNextActions(projectIds: string[]): Promise<NextAction[]>;
  closeNextAction(id: string, closedAt: string): Promise<boolean>;
  createEntry(entry: Entry): Promise<void>;
  readRecentEntries(projectIds: string[], occurredSince: string): Promise<Entry[]>;
}
