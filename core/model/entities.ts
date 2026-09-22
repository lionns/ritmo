export type Timestamp = string;
export type CalendarDate = string;

export interface CapRaise {
  amount: number;
  raisedAt: CalendarDate;
}

export interface Owner {
  id: string;
  activeCap: number;
  capRaises: CapRaise[];
}

export interface Credential {
  id: string;
  ownerId: string;
  label: string;
  credentialId: string;
  publicKey: string;
  signCount: number;
  createdAt: Timestamp;
  lastUsedAt: Timestamp | null;
}

export interface Area {
  id: string;
  ownerId: string;
  name: string;
  countsAgainstCap: boolean;
}

export interface Objective {
  id: string;
  ownerId: string;
  areaId: string;
  title: string;
  type: "learning" | "outcome";
  horizon: CalendarDate | null;
  why: string;
}

export interface Project {
  id: string;
  ownerId: string;
  areaId: string;
  objectiveId: string | null;
  title: string;
  state: "active" | "shelved";
  /**
   * When the owner said it was finished, or null. Not a third `state`: `state` records the
   * commitment, this records the outcome, and a finished project keeps whichever it had (`D-025`).
   */
  finishedAt: Timestamp | null;
  externalDeadline: CalendarDate | null;
  deadlineSource: string | null;
}

export interface Commitment {
  id: string;
  ownerId: string;
  projectId: string;
  weekId: string;
  target: number;
  proposedTarget: number | null;
  reserve: number;
}

export interface Step {
  id: string;
  ownerId: string;
  projectId: string;
  title: string;
  estimateMinutes: number | null;
  markedFor: CalendarDate | null;
  createdAt: Timestamp;
  doneAt: Timestamp | null;
}

export interface Entry {
  id: string;
  ownerId: string;
  kind: "progress" | "reserve_spend";
  projectId: string;
  creditsObjectiveId: string | null;
  occurredAt: Timestamp;
  what: string;
  effortMinutes: number | null;
  note: string | null;
  /**
   * The step this effort belongs to, decided when the entry was written and never revisited
   * (`D-027`). Null when no single step of the project was marked for that day — ambiguity
   * records nothing rather than splitting minutes it cannot divide honestly.
   */
  stepId: string | null;
}

export interface Week {
  id: string;
  ownerId: string;
  startsOn: CalendarDate;
  capacityLabel: "light" | "normal" | "heavy" | null;
  tagId: string | null;
  reflection: string | null;
  closedAt: Timestamp | null;
}

export interface Tag {
  id: string;
  ownerId: string;
  label: string;
}
