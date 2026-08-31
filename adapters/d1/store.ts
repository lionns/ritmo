import { env } from "cloudflare:workers";

import type {
  Area,
  Entry,
  NextAction,
  Owner,
  Project,
} from "../../core/model/entities.ts";
import type { Store } from "../../core/ports/store.ts";

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

export function runtimeStore(): D1Store {
  return new D1Store(env.DB);
}

export class D1Store implements Store {
  readonly #database: D1Database;

  constructor(database: D1Database) {
    this.#database = database;
  }

  async createOwner(owner: Owner): Promise<void> {
    await this.#database
      .prepare("INSERT INTO owners (id, active_cap, cap_raises) VALUES (?, ?, ?)")
      .bind(owner.id, owner.activeCap, JSON.stringify(owner.capRaises))
      .run();
  }

  async getOwner(): Promise<Owner | null> {
    const row = await this.#database
      .prepare("SELECT * FROM owners ORDER BY id LIMIT 1")
      .first<OwnerRow>();
    return row === null ? null : toOwner(row);
  }

  async createArea(area: Area): Promise<void> {
    await this.#database
      .prepare(
        "INSERT INTO areas (id, owner_id, name, counts_against_cap) VALUES (?, ?, ?, ?)",
      )
      .bind(area.id, area.ownerId, area.name, area.countsAgainstCap ? 1 : 0)
      .run();
  }

  async getArea(id: string): Promise<Area | null> {
    const row = await this.#database
      .prepare("SELECT * FROM areas WHERE id = ?")
      .bind(id)
      .first<AreaRow>();
    return row === null ? null : toArea(row);
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

  async listActiveProjects(ownerId: string): Promise<Project[]> {
    const { results } = await this.#database
      .prepare("SELECT * FROM projects WHERE owner_id = ? AND state = 'active' ORDER BY id")
      .bind(ownerId)
      .all<ProjectRow>();
    return results.map(toProject);
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

  async readOpenNextActions(projectIds: string[]): Promise<NextAction[]> {
    if (projectIds.length === 0) return [];
    const placeholders = projectIds.map(() => "?").join(", ");
    const { results } = await this.#database
      .prepare(
        `SELECT * FROM next_actions
         WHERE closed_at IS NULL AND project_id IN (${placeholders})
         ORDER BY project_id`,
      )
      .bind(...projectIds)
      .all<NextActionRow>();
    return results.map(toNextAction);
  }

  async closeNextAction(id: string, closedAt: string): Promise<boolean> {
    const result = await this.#database
      .prepare("UPDATE next_actions SET closed_at = ? WHERE id = ? AND closed_at IS NULL")
      .bind(closedAt, id)
      .run();
    return result.meta.changes === 1;
  }

  async createEntry(entry: Entry): Promise<void> {
    await this.#database
      .prepare(
        `INSERT INTO entries
          (id, owner_id, kind, project_id, credits_objective_id, occurred_at, what,
           effort_minutes, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        entry.id,
        entry.ownerId,
        entry.kind,
        entry.projectId,
        entry.creditsObjectiveId,
        entry.occurredAt,
        entry.what,
        entry.effortMinutes,
        entry.note,
      )
      .run();
  }

  async readRecentEntries(projectIds: string[], occurredSince: string): Promise<Entry[]> {
    if (projectIds.length === 0) return [];
    const placeholders = projectIds.map(() => "?").join(", ");
    const { results } = await this.#database
      .prepare(
        `SELECT * FROM entries
         WHERE project_id IN (${placeholders}) AND occurred_at >= ?
         ORDER BY occurred_at DESC, id DESC`,
      )
      .bind(...projectIds, occurredSince)
      .all<EntryRow>();
    return results.map(toEntry);
  }
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
