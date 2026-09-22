import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import type {
  Area,
  Entry,
  Owner,
  Project,
  Step,
} from "../../core/model/entities.ts";
import type { OpenStepsWithProgress, Store } from "../../core/ports/store.ts";
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
  finished_at: string | null;
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
  step_id: string | null;
}

interface StepRow {
  id: string;
  owner_id: string;
  project_id: string;
  title: string;
  estimate_minutes: number | null;
  marked_for: string | null;
  created_at: string;
  done_at: string | null;
}


let runtimeDatabase: DatabaseSync | undefined;

export function runtimeStore(): SqliteStore {
  runtimeDatabase ??= openDatabase();
  return new SqliteStore(runtimeDatabase);
}

export function closeRuntimeDatabase(): void {
  runtimeDatabase?.close();
  runtimeDatabase = undefined;
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

  async getOnlyOwner(): Promise<Owner | null> {
    const rows = this.#database.prepare("SELECT * FROM owners ORDER BY id LIMIT 2").all();
    if (rows.length > 1) throw new Error("Ritmo has more than one owner");
    return rows.length === 0 ? null : toOwner(rows[0] as unknown as OwnerRow);
  }

  async updateOwnerCap(
    id: string,
    activeCap: number,
    capRaises: Owner["capRaises"],
  ): Promise<void> {
    const result = this.#database
      .prepare("UPDATE owners SET active_cap = ?, cap_raises = ? WHERE id = ?")
      .run(activeCap, JSON.stringify(capRaises), id);
    if (result.changes !== 1) throw new Error(`Owner ${id} does not exist`);
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

  async listAreas(ownerId: string): Promise<Area[]> {
    const rows = this.#database
      .prepare("SELECT * FROM areas WHERE owner_id = ? ORDER BY id")
      .all(ownerId);
    return (rows as unknown as AreaRow[]).map(toArea);
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
          (id, owner_id, area_id, objective_id, title, state, external_deadline, deadline_source,
           finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        project.finishedAt,
      );
  }

  async createProjectWithStep(project: Project, step: Step): Promise<void> {
    if (step.ownerId !== project.ownerId || step.projectId !== project.id || step.doneAt !== null) {
      throw new Error(`Step ${step.id} must open on project ${project.id}`);
    }

    this.#database.exec("BEGIN IMMEDIATE");
    try {
      await this.createProject(project);
      await this.createStep(step);
      this.#database.exec("COMMIT");
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  async getProject(id: string): Promise<Project | null> {
    const row = this.#database.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    return row === undefined ? null : toProject(row as unknown as ProjectRow);
  }

  async listProjects(ownerId: string): Promise<Project[]> {
    const rows = this.#database
      .prepare("SELECT * FROM projects WHERE owner_id = ? ORDER BY id")
      .all(ownerId);
    return (rows as unknown as ProjectRow[]).map(toProject);
  }

  async listActiveProjects(ownerId: string): Promise<Project[]> {
    const rows = this.#database
      .prepare("SELECT * FROM projects WHERE owner_id = ? AND state = 'active' ORDER BY id")
      .all(ownerId);
    return (rows as unknown as ProjectRow[]).map(toProject);
  }

  /**
   * `finished_at` and `state` are independent: this never touches the state, because a finished
   * project keeps whichever commitment it had when it ended (`D-025`).
   */
  async setProjectFinishedAt(
    id: string,
    ownerId: string,
    finishedAt: string | null,
  ): Promise<boolean> {
    const result = this.#database
      .prepare("UPDATE projects SET finished_at = ? WHERE id = ? AND owner_id = ?")
      .run(finishedAt, id, ownerId);
    return result.changes === 1;
  }

  async setProjectState(
    id: string,
    ownerId: string,
    state: Project["state"],
  ): Promise<void> {
    const result = this.#database
      .prepare("UPDATE projects SET state = ? WHERE id = ? AND owner_id = ?")
      .run(state, id, ownerId);
    if (result.changes !== 1) throw new Error(`Project ${id} does not exist`);
  }

  async hasClosedWeek(ownerId: string): Promise<boolean> {
    return this.#database
      .prepare("SELECT 1 FROM weeks WHERE owner_id = ? AND closed_at IS NOT NULL LIMIT 1")
      .get(ownerId) !== undefined;
  }

  async createStep(step: Step): Promise<void> {
    this.#database
      .prepare(
        `INSERT INTO steps
          (id, owner_id, project_id, title, estimate_minutes, marked_for, created_at, done_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        step.id,
        step.ownerId,
        step.projectId,
        step.title,
        step.estimateMinutes,
        step.markedFor,
        step.createdAt,
        step.doneAt,
      );
  }

  async getStep(id: string): Promise<Step | null> {
    const row = this.#database.prepare("SELECT * FROM steps WHERE id = ?").get(id);
    return row === undefined ? null : toStep(row as unknown as StepRow);
  }

  async listOpenSteps(projectId: string): Promise<Step[]> {
    const rows = this.#database
      .prepare("SELECT * FROM steps WHERE project_id = ? AND done_at IS NULL ORDER BY created_at")
      .all(projectId);
    return (rows as unknown as StepRow[]).map(toStep);
  }

  /**
   * The only read of `marked_for` there is, and it takes the date rather than defaulting to one:
   * a mark for any other day is not history and no caller can ask for it (FR-22).
   */
  async readStepsMarkedFor(ownerId: string, date: string): Promise<Step[]> {
    const rows = this.#database
      .prepare(
        `SELECT * FROM steps
          WHERE owner_id = ? AND marked_for = ? AND done_at IS NULL
          ORDER BY project_id, created_at`,
      )
      .all(ownerId, date);
    return (rows as unknown as StepRow[]).map(toStep);
  }

  /**
   * One query, anchored to the oldest open step: entries logged before the plan's current stretch
   * began are not part of it. A project with no open steps returns no row at all, which the rule
   * reads as zero.
   */
  async readOpenStepsWithProgress(projectIds: string[]): Promise<OpenStepsWithProgress[]> {
    if (projectIds.length === 0) return [];
    const placeholders = projectIds.map(() => "?").join(", ");
    const rows = this.#database
      .prepare(
        `SELECT steps.*, (
           SELECT COUNT(entries.id) FROM entries
            WHERE entries.project_id = steps.project_id
              AND entries.owner_id = steps.owner_id
              AND entries.kind = 'progress'
              AND entries.occurred_at >= (
                SELECT MIN(oldest.created_at) FROM steps AS oldest
                 WHERE oldest.project_id = steps.project_id AND oldest.done_at IS NULL
              )
         ) AS progress_since_plan
         FROM steps
         WHERE steps.done_at IS NULL AND steps.project_id IN (${placeholders})
         ORDER BY steps.project_id, steps.created_at`,
      )
      .all(...(projectIds as SQLInputValue[]));

    const byProject = new Map<string, OpenStepsWithProgress>();
    for (const row of rows as unknown as Array<StepRow & { progress_since_plan: number }>) {
      const carried = byProject.get(row.project_id) ?? {
        projectId: row.project_id,
        steps: [],
        progressSincePlan: row.progress_since_plan,
      };
      carried.steps.push(toStep(row));
      byProject.set(row.project_id, carried);
    }
    return [...byProject.values()];
  }

  async markStepFor(id: string, ownerId: string, date: string | null): Promise<boolean> {
    const result = this.#database
      .prepare("UPDATE steps SET marked_for = ? WHERE id = ? AND owner_id = ? AND done_at IS NULL")
      .run(date, id, ownerId);
    return result.changes === 1;
  }

  async setStepDone(id: string, ownerId: string, doneAt: string): Promise<boolean> {
    const result = this.#database
      .prepare("UPDATE steps SET done_at = ? WHERE id = ? AND owner_id = ? AND done_at IS NULL")
      .run(doneAt, id, ownerId);
    return result.changes === 1;
  }

  async createEntry(entry: Entry): Promise<void> {
    this.#database
      .prepare(
        `INSERT INTO entries
          (id, owner_id, kind, project_id, credits_objective_id, occurred_at, what,
           effort_minutes, note, step_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        entry.stepId,
      );
  }

  /** Closed steps, newest first — the history they join is bounded the same way. */
  async readDoneSteps(projectId: string, limit: number): Promise<Step[]> {
    const rows = this.#database
      .prepare(
        `SELECT * FROM steps
          WHERE project_id = ? AND done_at IS NOT NULL
          ORDER BY done_at DESC, id DESC
          LIMIT ?`,
      )
      .all(projectId, limit);
    return (rows as unknown as StepRow[]).map(toStep);
  }

  /**
   * The effort a step actually took: the entries that point at it, and nothing else (`D-027`).
   * A step nothing points at reads zero — which is the truth, not a gap to fill in.
   */
  async readEffortForStep(stepId: string): Promise<number> {
    const row = this.#database
      .prepare(
        `SELECT COALESCE(SUM(effort_minutes), 0) AS minutes FROM entries
          WHERE step_id = ? AND kind = 'progress'`,
      )
      .get(stepId);
    return (row as unknown as { minutes: number } | undefined)?.minutes ?? 0;
  }

  /** The project screen reads further back than the portfolio's 28 days, but not forever. */
  async readProjectEntries(projectId: string, limit: number): Promise<Entry[]> {
    const rows = this.#database
      .prepare(
        `SELECT * FROM entries
          WHERE project_id = ?
          ORDER BY occurred_at DESC, id DESC
          LIMIT ?`,
      )
      .all(projectId, limit);
    return (rows as unknown as EntryRow[]).map(toEntry);
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
    finishedAt: row.finished_at,
  };
}

function toStep(row: StepRow): Step {
  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: row.project_id,
    title: row.title,
    estimateMinutes: row.estimate_minutes,
    markedFor: row.marked_for,
    createdAt: row.created_at,
    doneAt: row.done_at,
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
    stepId: row.step_id,
  };
}
