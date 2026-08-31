import type { NextAction, Project } from "../model/entities.ts";

export interface Store {
  createProject(project: Project): Promise<void>;
  getProject(id: string): Promise<Project | null>;
  createNextAction(action: NextAction): Promise<void>;
  getNextAction(id: string): Promise<NextAction | null>;
  findOpenNextAction(projectId: string): Promise<NextAction | null>;
  closeNextAction(id: string, closedAt: string): Promise<void>;
}
