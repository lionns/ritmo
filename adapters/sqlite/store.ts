import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import type {
  Area,
  Entry,
  NextAction,
  Owner,
  Project,
} from "../../core/model/entities.ts";
import type { Store } from "../../core/ports/store.ts";
import { openDatabase } from "./database.ts";

interface OwnerRow {
  id: string;
  active_cap: number;
  cap_raises: string;
}

interface AreaRow {
  id: string;
  owner_id: string;
  name: string;
  counts_against_cap: number;
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

interface EntryRow {
  id: string;
  owner_id: string;
  kind: "progress" | "reserve_spend";
  project_id: string;
  credits_objective_id: string | null;
  occurred_at: string;
  what: string;
  effort_minutes: number | null;
  note: string | null;
}

interface OpenNextActionWithProgressRow extends NextActionRow {
  progress_since_plan: number;
}

let runtimeDatabase: DatabaseSync | undefined;

export function runtimeStore(): SqliteStore {
  runtimeDatabase ??= openDatabase();
  return new SqliteStore(runtimeDatabase);
}

export class SqliteStore implements Store {
  readonly #database: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.#database = database;
  }

  async createOwner(owner: Owner): Promise<void> {
    this.#database
      .prepare("INSERT INTO owners (id, active_cap, cap_raises) VALUES (?, ?, ?)")
      .run(owner.id, owner.activeCap, JSON.stringify(owner.capRaises));
  }

  async getOwner(id: string): Promise<Owner | null> {
    const row = this.#database.prepare("SELECT * FROM owners WHERE id = ?").get(id);
    return row === undefined ? null : toOwner(row as unknown as OwnerRow);
  }

  async createArea(area: Area): Promise<void> {
    this.#database
      .prepare("INSERT INTO areas (id, owner_id, name, counts_against_cap) VALUES (?, ?, ?, ?)")
      .run(area.id, area.ownerId, area.name, area.countsAgainstCap ? 1 : 0);
  }

  async getArea(id: string): Promise<Area | null> {
    const row = this.#database.prepare("SELECT * FROM areas WHERE id = ?").get(id);
    return row === undefined ? null : toArea(row as unknown as AreaRow);
  }

  async readAreas(areaIds: string[]): Promise<Area[]> {
    if (areaIds.length === 0) return [];
    const placeholders = areaIds.map(() => "?").join(", ");
    const rows = this.#database
      .prepare(`SELECT * FROM areas WHERE id IN (${placeholders}) ORDER BY id`)
      .all(...areaIds);
    return (rows as unknown as AreaRow[]).map(toArea);
  }

  async createProject(project: Project): Promise<void> {
    this.#database
      .prepare(
        `INSERT INTO projects
          (id, owner_id, area_id, objective_id, title, state, external_deadline, deadline_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        project.id,
        project.ownerId,
        project.areaId,
        project.objectiveId,
        project.title,
        project.state,
        project.externalDeadline,
        project.deadlineSource,
      );
  }

  async getProject(id: string): Promise<Project | null> {
    const row = this.#database.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    return row === undefined ? null : toProject(row as unknown as ProjectRow);
  }

  async listActiveProjects(ownerId: string): Promise<Project[]> {
    const rows = this.#database
      .prepare("SELECT * FROM projects WHERE owner_id = ? AND state = 'active' ORDER BY id")
      .all(ownerId);
    return (rows as unknown as ProjectRow[]).map(toProject);
  }

  async createNextAction(action: NextAction): Promise<void> {
    this.#database
      .prepare(
        `INSERT INTO next_actions
          (id, owner_id, project_id, trigger, act, obstacle, estimate_minutes, created_at, closed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        action.id,
        action.ownerId,
        action.projectId,
        action.trigger,
        action.act,
        action.obstacle,
        action.estimateMinutes,
        action.createdAt,
        action.closedAt,
      );
  }

  async getNextAction(id: string): Promise<NextAction | null> {
    const row = this.#database.prepare("SELECT * FROM next_actions WHERE id = ?").get(id);
    return row === undefined ? null : toNextAction(row as unknown as NextActionRow);
  }

  async findOpenNextAction(projectId: string): Promise<NextAction | null> {
    const row = this.#database
      .prepare("SELECT * FROM next_actions WHERE project_id = ? AND closed_at IS NULL")
      .get(projectId);
    return row === undefined ? null : toNextAction(row as unknown as NextActionRow);
  }

  async readOpenNextActionsWithProgress(
    projectIds: string[],
  ): Promise<Array<{ action: NextAction; progressSincePlan: number }>> {
    if (projectIds.length === 0) return [];
    const placeholders = projectIds.map(() => "?").join(", ");
    const rows = this.#database
      .prepare(
        `SELECT next_actions.*,
                COUNT(entries.id) AS progress_since_plan
         FROM next_actions
         LEFT JOIN entries
           ON entries.project_id = next_actions.project_id
          AND entries.owner_id = next_actions.owner_id
          AND entries.kind = 'progress'
          AND entries.occurred_at >= next_actions.created_at
         WHERE next_actions.closed_at IS NULL
           AND next_actions.project_id IN (${placeholders})
         GROUP BY next_actions.id
         ORDER BY next_actions.project_id`,
      )
      .all(...projectIds);
    return (rows as unknown as OpenNextActionWithProgressRow[]).map((row) => ({
      action: toNextAction(row),
      progressSincePlan: row.progress_since_plan,
    }));
  }

  async replaceNextAction(
    id: string,
    closedAt: string,
    replacement: NextAction,
  ): Promise<boolean> {
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      const closeResult = this.#database
        .prepare(
          `UPDATE next_actions SET closed_at = ?
           WHERE id = ? AND owner_id = ? AND project_id = ? AND closed_at IS NULL`,
        )
        .run(closedAt, id, replacement.ownerId, replacement.projectId);
      if (closeResult.changes !== 1) {
        this.#database.exec("ROLLBACK");
        return false;
      }

      this.#database
        .prepare(
          `INSERT INTO next_actions
            (id, owner_id, project_id, trigger, act, obstacle, estimate_minutes, created_at, closed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(...nextActionValues(replacement));
      this.#database.exec("COMMIT");
      return true;
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  async createEntry(entry: Entry): Promise<void> {
    this.#database
      .prepare(
        `INSERT INTO entries
          (id, owner_id, kind, project_id, credits_objective_id, occurred_at, what,
           effort_minutes, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.ownerId,
        entry.kind,
        entry.projectId,
        entry.creditsObjectiveId,
        entry.occurredAt,
        entry.what,
        entry.effortMinutes,
        entry.note,
      );
  }

  async readRecentEntries(projectIds: string[], occurredSince: string): Promise<Entry[]> {
    if (projectIds.length === 0) return [];
    const placeholders = projectIds.map(() => "?").join(", ");
    const rows = this.#database
      .prepare(
        `SELECT * FROM entries
         WHERE project_id IN (${placeholders}) AND occurred_at >= ?
         ORDER BY occurred_at DESC, id DESC`,
      )
      .all(...projectIds, occurredSince);
    return (rows as unknown as EntryRow[]).map(toEntry);
  }
}

function nextActionValues(action: NextAction): SQLInputValue[] {
  return [
    action.id,
    action.ownerId,
    action.projectId,
    action.trigger,
    action.act,
    action.obstacle,
    action.estimateMinutes,
    action.createdAt,
    action.closedAt,
  ];
}

function toOwner(row: OwnerRow): Owner {
  return {
    id: row.id,
    activeCap: row.active_cap,
    capRaises: parseCapRaises(row.cap_raises),
  };
}

function parseCapRaises(value: string): Owner["capRaises"] {
  const parsed: unknown = JSON.parse(value);
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (raise) =>
        typeof raise === "object" &&
        raise !== null &&
        "amount" in raise &&
        typeof raise.amount === "number" &&
        "raisedAt" in raise &&
        typeof raise.raisedAt === "string",
    )
  ) {
    throw new TypeError("Owner cap_raises is not a valid cap-raise list");
  }
  return parsed;
}

function toArea(row: AreaRow): Area {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    countsAgainstCap: row.counts_against_cap === 1,
  };
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

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    ownerId: row.owner_id,
    kind: row.kind,
    projectId: row.project_id,
    creditsObjectiveId: row.credits_objective_id,
    occurredAt: row.occurred_at,
    what: row.what,
    effortMinutes: row.effort_minutes,
    note: row.note,
  };
}
