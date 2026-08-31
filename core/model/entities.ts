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

export interface NextAction {
  id: string;
  ownerId: string;
  projectId: string;
  trigger: string;
  act: string;
  obstacle: string | null;
  estimateMinutes: number | null;
  createdAt: Timestamp;
  closedAt: Timestamp | null;
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
