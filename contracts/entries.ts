export interface CreateEntryRequest {
  projectId: string;
  what: string;
  effortMinutes?: number;
  note?: string;
}

export interface CreateEntryResponse {
  id: string;
}

export interface CreateEntryErrorResponse {
  error: string;
}
