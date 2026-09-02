export interface NextActionRequestFields {
  trigger: string;
  act: string;
  obstacle?: string;
  estimateMinutes?: number;
}

export interface WriteNextActionRequest extends NextActionRequestFields {
  projectId: string;
  currentActionId?: string;
}

export interface NextActionContract {
  id: string;
  projectId: string;
  trigger: string;
  act: string;
  obstacle: string | null;
  estimateMinutes: number | null;
  createdAt: string;
}

export interface WriteNextActionResponse {
  nextAction: NextActionContract;
  replacedActionId: string | null;
}

export interface NextActionErrorResponse {
  error: string;
}
