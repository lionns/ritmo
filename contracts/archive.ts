export interface ArchiveProject {
  id: string;
  title: string;
  areaName: string;
  /** Set on everything in `finished`, null on everything in `shelved`. */
  finishedAt: string | null;
}

export interface ArchiveResponse {
  finished: ArchiveProject[];
  shelved: ArchiveProject[];
}

export interface ArchiveErrorResponse {
  error: string;
}
