import type { NextAction, Project } from "../../core/model/entities.ts";
import type { Store } from "../../core/ports/store.ts";

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface ProjectRow {
  id: string;
  owner_id: string;
  area_id: string;
  objective_id: string | null;
  title: string;
  state: "active" | "shelved";
  external_deadline: string | null;
  deadline_source: string | null;
}

interface NextActionRow {
  id: string;
  owner_id: string;
  project_id: string;
  trigger: string;
  act: string;
  obstacle: string | null;
  estimate_minutes: number | null;
  created_at: string;
  closed_at: string | null;
}

export class D1Store implements Store {
  readonly #database: D1Database;

  constructor(database: D1Database) {
    this.#database = database;
  }

  async createProject(project: Project): Promise<void> {
    await this.#database
      .prepare(
        `INSERT INTO projects
          (id, owner_id, area_id, objective_id, title, state, external_deadline, deadline_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        project.id,
        project.ownerId,
        project.areaId,
        project.objectiveId,
        project.title,
        project.state,
        project.externalDeadline,
        project.deadlineSource,
      )
      .run();
  }

  async getProject(id: string): Promise<Project | null> {
    const row = await this.#database
      .prepare("SELECT * FROM projects WHERE id = ?")
      .bind(id)
      .first<ProjectRow>();
    return row === null ? null : toProject(row);
  }

  async createNextAction(action: NextAction): Promise<void> {
    await this.#database
      .prepare(
        `INSERT INTO next_actions
          (id, owner_id, project_id, trigger, act, obstacle, estimate_minutes, created_at, closed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        action.id,
        action.ownerId,
        action.projectId,
        action.trigger,
        action.act,
        action.obstacle,
        action.estimateMinutes,
        action.createdAt,
        action.closedAt,
      )
      .run();
  }

  async getNextAction(id: string): Promise<NextAction | null> {
    const row = await this.#database
      .prepare("SELECT * FROM next_actions WHERE id = ?")
      .bind(id)
      .first<NextActionRow>();
    return row === null ? null : toNextAction(row);
  }

  async findOpenNextAction(projectId: string): Promise<NextAction | null> {
    const row = await this.#database
      .prepare("SELECT * FROM next_actions WHERE project_id = ? AND closed_at IS NULL")
      .bind(projectId)
      .first<NextActionRow>();
    return row === null ? null : toNextAction(row);
  }

  async closeNextAction(id: string, closedAt: string): Promise<void> {
    await this.#database
      .prepare("UPDATE next_actions SET closed_at = ? WHERE id = ? AND closed_at IS NULL")
      .bind(closedAt, id)
      .run();
  }
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    areaId: row.area_id,
    objectiveId: row.objective_id,
    title: row.title,
    state: row.state,
    externalDeadline: row.external_deadline,
    deadlineSource: row.deadline_source,
  };
}

function toNextAction(row: NextActionRow): NextAction {
  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: row.project_id,
    trigger: row.trigger,
    act: row.act,
    obstacle: row.obstacle,
    estimateMinutes: row.estimate_minutes,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  };
}
