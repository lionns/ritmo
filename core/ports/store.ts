import type { Area, Commitment, Entry, Owner, Project, Step, Week } from "../model/entities.ts";

/**
 * A project's open steps, with the entries logged since the oldest of them was written — which is
 * what "since the current plan opened" means once the plan is a list (`design-handoff.md`
 * § The Project Row).
 */
/** A done step that can answer how the owner estimates: it has both halves (`D-027`). */
export interface CalibrationSample {
  estimateMinutes: number;
  effortMinutes: number;
}

export interface OpenStepsWithProgress {
  projectId: string;
  steps: Step[];
  progressSincePlan: number;
}

export interface Store {
  createOwner(owner: Owner): Promise<void>;
  getOwner(id: string): Promise<Owner | null>;
  getOnlyOwner(): Promise<Owner | null>;
  updateOwnerCap(id: string, activeCap: number, capRaises: Owner["capRaises"]): Promise<void>;
  updateOwnerTimeZone(id: string, timeZone: string): Promise<void>;
  createArea(area: Area): Promise<void>;
  getArea(id: string): Promise<Area | null>;
  listAreas(ownerId: string): Promise<Area[]>;
  readAreas(areaIds: string[]): Promise<Area[]>;
  createProject(project: Project): Promise<void>;
  createProjectWithStep(project: Project, step: Step): Promise<void>;
  getProject(id: string): Promise<Project | null>;
  listProjects(ownerId: string): Promise<Project[]>;
  listActiveProjects(ownerId: string): Promise<Project[]>;
  setProjectState(id: string, ownerId: string, state: Project["state"]): Promise<void>;
  setProjectFinishedAt(id: string, ownerId: string, finishedAt: string | null): Promise<boolean>;
  hasClosedWeek(ownerId: string): Promise<boolean>;
  /** Atomically close older open weeks and insert this empty week, or return its existing row. */
  openWeek(week: Week, closedAt: string): Promise<Week>;
  getWeek(id: string, ownerId: string): Promise<Week | null>;
  getWeekStartingOn(ownerId: string, startsOn: string): Promise<Week | null>;
  /** Compare-and-set: a closed week is immutable. */
  closeWeek(week: Week): Promise<boolean>;
  listCommitments(weekId: string, ownerId: string): Promise<Commitment[]>;
  /** Insert or edit the project's commitment only while its week is open. */
  writeCommitment(commitment: Commitment): Promise<boolean>;
  /** Insert the event only if the commitment's week is still open. */
  spendReserve(entry: Entry, weekId: string): Promise<boolean>;
  readWeekEntries(ownerId: string, startsAt: string, endsAt: string): Promise<Entry[]>;
  createStep(step: Step): Promise<void>;
  getStep(id: string): Promise<Step | null>;
  listOpenSteps(projectId: string): Promise<Step[]>;
  readStepsMarkedFor(ownerId: string, date: string): Promise<Step[]>;
  readOpenStepsWithProgress(projectIds: string[]): Promise<OpenStepsWithProgress[]>;
  markStepFor(id: string, ownerId: string, date: string | null): Promise<boolean>;
  setStepDone(id: string, ownerId: string, doneAt: string): Promise<boolean>;
  createEntry(entry: Entry): Promise<void>;
  readRecentEntries(projectIds: string[], occurredSince: string): Promise<Entry[]>;
  readProjectEntries(projectId: string, limit: number): Promise<Entry[]>;
  readEffortForStep(stepId: string): Promise<number>;
  readDoneSteps(projectId: string, limit: number): Promise<Step[]>;
  readCalibrationSamples(ownerId: string, limit: number): Promise<CalibrationSample[]>;
}
