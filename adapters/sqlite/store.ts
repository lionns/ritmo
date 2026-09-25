import type { AuthStore } from "../../core/ports/auth-store.ts";
import type { Credential } from "../../core/model/entities.ts";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import type {
  Area,
  Commitment,
  Week,
  Entry,
  Owner,
  Project,
  Step,
} from "../../core/model/entities.ts";
import type { CalibrationSample, OpenStepsWithProgress, Store } from "../../core/ports/store.ts";
import { openDatabase } from "./database.ts";

interface OwnerRow {
  id: string;
  active_cap: number;
  cap_raises: string;
  time_zone: string | null;
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


interface WeekRow {
  id: string;
  owner_id: string;
  starts_on: string;
  capacity_label: Week["capacityLabel"];
  tag_id: string | null;
  reflection: string | null;
  closed_at: string | null;
}

interface CommitmentRow {
  id: string;
  owner_id: string;
  project_id: string;
  week_id: string;
  target: number;
  unit: Commitment["unit"];
  proposed_target: number | null;
  reserve: number;
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

export class SqliteStore implements Store, AuthStore {
  readonly #database: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.#database = database;
  }

  async createCredential(c: Credential): Promise<void> {
    this.#database.prepare(`INSERT INTO credentials
      (id, owner_id, label, credential_id, public_key, sign_count, created_at, last_used_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(c.id, c.ownerId, c.label, c.credentialId, c.publicKey, c.signCount, c.createdAt, c.lastUsedAt);
  }
  async getCredential(credentialId: string): Promise<Credential | null> {
    const row = this.#database.prepare(`SELECT id, owner_id AS ownerId, label,
      credential_id AS credentialId, public_key AS publicKey, sign_count AS signCount,
      created_at AS createdAt, last_used_at AS lastUsedAt FROM credentials WHERE credential_id = ?`).get(credentialId);
    return row ? { ...row } as unknown as Credential : null;
  }
  async listCredentials(ownerId: string): Promise<Credential[]> {
    const rows = this.#database.prepare(`SELECT id, owner_id AS ownerId, label,
      credential_id AS credentialId, public_key AS publicKey, sign_count AS signCount,
      created_at AS createdAt, last_used_at AS lastUsedAt FROM credentials WHERE owner_id = ? ORDER BY created_at, id`).all(ownerId);
    return rows.map(row => ({ ...row }) as unknown as Credential);
  }
  async deleteCredential(id: string, ownerId: string): Promise<void> {
    this.#database.prepare("DELETE FROM credentials WHERE id = ? AND owner_id = ?").run(id, ownerId);
  }
  async advanceCredential(id: string, previousCount: number, count: number, usedAt: string): Promise<boolean> {
    const result = this.#database.prepare(`UPDATE credentials SET sign_count = ?, last_used_at = ?
      WHERE id = ? AND sign_count = ?`).run(count, usedAt, id, previousCount);
    return Number(result.changes) === 1;
  }
  async saveChallenge(id: string, ownerId: string, purpose: string, expiresAt: number): Promise<void> {
    this.#database.prepare("DELETE FROM auth_challenges WHERE expires_at <= ?").run(expiresAt - 300000);
    this.#database.prepare("INSERT INTO auth_challenges VALUES (?, ?, ?, ?)").run(id, ownerId, purpose, expiresAt);
  }
  async consumeChallenge(id: string, ownerId: string, purpose: string, now: number): Promise<boolean> {
    const result = this.#database.prepare(`DELETE FROM auth_challenges
      WHERE id = ? AND owner_id = ? AND purpose = ? AND expires_at > ?`).run(id, ownerId, purpose, now);
    return Number(result.changes) === 1;
  }
  async allowAuthAttempt(ownerId: string, window: number): Promise<boolean> {
    const row = this.#database.prepare(`INSERT INTO auth_attempts (owner_id, window, attempts) VALUES (?, ?, 1)
      ON CONFLICT(owner_id) DO UPDATE SET window = excluded.window,
      attempts = CASE WHEN auth_attempts.window = excluded.window THEN auth_attempts.attempts + 1 ELSE 1 END
      RETURNING attempts`).get(ownerId, window);
    return Number(row?.attempts) <= 10;
  }

  async createOwner(owner: Owner): Promise<void> {
    this.#database
      .prepare("INSERT INTO owners (id, active_cap, cap_raises, time_zone) VALUES (?, ?, ?, ?)")
      .run(owner.id, owner.activeCap, JSON.stringify(owner.capRaises), owner.timeZone);
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

  async updateOwnerTimeZone(id: string, timeZone: string): Promise<void> {
    const result = this.#database.prepare("UPDATE owners SET time_zone = ? WHERE id = ?").run(timeZone, id);
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

  async openWeek(week: Week, closedAt: string): Promise<Week> {
    // Keep the synchronous transaction free of await so calls sharing a connection cannot interleave.
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      this.#database.prepare(`UPDATE weeks SET closed_at = ?, capacity_label = NULL,
        tag_id = NULL, reflection = NULL
        WHERE owner_id = ? AND starts_on < ? AND closed_at IS NULL`)
        .run(closedAt, week.ownerId, week.startsOn);
      this.#database.prepare(`INSERT INTO weeks (id, owner_id, starts_on)
        VALUES (?, ?, ?) ON CONFLICT(owner_id, starts_on) DO NOTHING`)
        .run(week.id, week.ownerId, week.startsOn);
      const row = this.#database.prepare("SELECT * FROM weeks WHERE owner_id = ? AND starts_on = ?")
        .get(week.ownerId, week.startsOn) as unknown as WeekRow;
      this.#database.exec("COMMIT");
      return toWeek(row);
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  async getWeek(id: string, ownerId: string): Promise<Week | null> {
    const row = this.#database.prepare("SELECT * FROM weeks WHERE id = ? AND owner_id = ?").get(id, ownerId);
    return row === undefined ? null : toWeek(row as unknown as WeekRow);
  }

  async getWeekStartingOn(ownerId: string, startsOn: string): Promise<Week | null> {
    const row = this.#database.prepare("SELECT * FROM weeks WHERE owner_id = ? AND starts_on = ?")
      .get(ownerId, startsOn);
    return row === undefined ? null : toWeek(row as unknown as WeekRow);
  }

  async closeWeek(week: Week): Promise<boolean> {
    const result = this.#database.prepare(`UPDATE weeks
      SET capacity_label = ?, tag_id = ?, reflection = ?, closed_at = ?
      WHERE id = ? AND owner_id = ? AND closed_at IS NULL`)
      .run(week.capacityLabel, week.tagId, week.reflection, week.closedAt, week.id, week.ownerId);
    return result.changes === 1;
  }

  async listCommitments(weekId: string, ownerId: string): Promise<Commitment[]> {
    const rows = this.#database.prepare(`SELECT * FROM commitments
      WHERE week_id = ? AND owner_id = ? ORDER BY project_id`).all(weekId, ownerId);
    return (rows as unknown as CommitmentRow[]).map(toCommitment);
  }

  async writeCommitment(commitment: Commitment): Promise<boolean> {
    const result = this.#database.prepare(`INSERT INTO commitments
      (id, owner_id, project_id, week_id, target, unit, proposed_target, reserve)
      SELECT ?, ?, ?, ?, ?, ?, ?, ? FROM weeks
      WHERE id = ? AND owner_id = ? AND closed_at IS NULL
      ON CONFLICT(project_id, week_id) DO UPDATE SET target = excluded.target,
        unit = excluded.unit, proposed_target = excluded.proposed_target, reserve = excluded.reserve`)
      .run(commitment.id, commitment.ownerId, commitment.projectId, commitment.weekId,
        commitment.target, commitment.unit, commitment.proposedTarget, commitment.reserve,
        commitment.weekId, commitment.ownerId);
    return result.changes === 1;
  }

  async spendReserve(entry: Entry, weekId: string): Promise<boolean> {
    const result = this.#database.prepare(`INSERT INTO entries
      (id, owner_id, kind, project_id, credits_objective_id, occurred_at, what, effort_minutes, note, step_id)
      SELECT ?, ?, 'reserve_spend', ?, NULL, ?, ?, NULL, ?, NULL FROM commitments c
      JOIN weeks w ON w.id = c.week_id AND w.owner_id = c.owner_id
      WHERE c.week_id = ? AND c.owner_id = ? AND c.project_id = ? AND w.closed_at IS NULL`)
      .run(entry.id, entry.ownerId, entry.projectId, entry.occurredAt, entry.what, entry.note,
        weekId, entry.ownerId, entry.projectId);
    return result.changes === 1;
  }

  async readWeekEntries(ownerId: string, startsAt: string, endsAt: string): Promise<Entry[]> {
    const rows = this.#database.prepare(`SELECT * FROM entries
      WHERE owner_id = ? AND occurred_at >= ? AND occurred_at < ? ORDER BY occurred_at, id`)
      .all(ownerId, startsAt, endsAt);
    return (rows as unknown as EntryRow[]).map(toEntry);
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

  /**
   * The done steps that carry both halves, newest first. A step with no estimate or nothing
   * attributed cannot answer and is not returned, rather than returned as a zero (`D-027`).
   */
  async readCalibrationSamples(ownerId: string, limit: number): Promise<CalibrationSample[]> {
    const rows = this.#database
      .prepare(
        `SELECT steps.estimate_minutes AS estimate_minutes, SUM(entries.effort_minutes) AS effort_minutes
           FROM steps
           JOIN entries ON entries.step_id = steps.id AND entries.kind = 'progress'
          WHERE steps.owner_id = ?
            AND steps.done_at IS NOT NULL
            AND steps.estimate_minutes > 0
          GROUP BY steps.id
         HAVING SUM(entries.effort_minutes) > 0
          ORDER BY steps.done_at DESC, steps.id DESC
          LIMIT ?`,
      )
      .all(ownerId, limit);
    return (rows as unknown as Array<{ estimate_minutes: number; effort_minutes: number }>).map(
      (row) => ({ estimateMinutes: row.estimate_minutes, effortMinutes: row.effort_minutes }),
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
    timeZone: row.time_zone,
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

function toWeek(row: WeekRow): Week {
  return { id: row.id, ownerId: row.owner_id, startsOn: row.starts_on,
    capacityLabel: row.capacity_label, tagId: row.tag_id, reflection: row.reflection, closedAt: row.closed_at };
}

function toCommitment(row: CommitmentRow): Commitment {
  return { id: row.id, ownerId: row.owner_id, projectId: row.project_id, weekId: row.week_id,
    target: row.target, unit: row.unit, proposedTarget: row.proposed_target, reserve: row.reserve };
}
