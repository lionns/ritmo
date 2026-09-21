export interface StepContract {
  id: string;
  projectId: string;
  title: string;
  estimateMinutes: number | null;
  markedFor: string | null;
  createdAt: string;
  doneAt: string | null;
}

export interface WriteStepRequest {
  projectId: string;
  title: string;
  estimateMinutes?: number;
}

/**
 * Exactly one of `markedFor` and `done` is sent. `markedFor: null` unmarks, which FR-22 makes a
 * non-event: it records nothing and leaves nothing behind.
 */
export interface UpdateStepRequest {
  id: string;
  markedFor?: string | null;
  done?: true;
}

export interface StepResponse {
  step: StepContract;
}

export interface StepErrorResponse {
  error: string;
}
