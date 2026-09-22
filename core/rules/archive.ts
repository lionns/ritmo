import type { Area, Project } from "../model/entities.ts";
import type { Store } from "../ports/store.ts";

export interface ArchivedProject {
  project: Project;
  area: Area;
}

export interface Archive {
  /** Finished, newest first. Every one of them: a window would need a number no evidence gives. */
  finished: ArchivedProject[];
  /** Shelved, by title. `FR-17` keeps these on `/` too — this route gathers, it never moves. */
  shelved: ArchivedProject[];
}

export class ArchiveRuleError extends Error {
  override readonly name = "ArchiveRuleError";
}

export async function readArchive(store: Store, ownerId: string): Promise<Archive> {
  const [projects, areas] = await Promise.all([
    store.listProjects(ownerId),
    store.listAreas(ownerId),
  ]);
  const areasById = new Map(areas.map((area) => [area.id, area]));
  const withArea = (project: Project): ArchivedProject => {
    const area = areasById.get(project.areaId);
    if (area === undefined) {
      throw new ArchiveRuleError(`Project ${project.id} has no area ${project.areaId}`);
    }
    return { project, area };
  };

  const finished = projects
    .filter(({ finishedAt }) => finishedAt !== null)
    .map(withArea)
    .sort((left, right) =>
      (right.project.finishedAt ?? "").localeCompare(left.project.finishedAt ?? ""),
    );
  // A finished project is not also shelved here, whatever its `state` says: it ended, and saying
  // both would repeat the confusion `D-025` removed.
  const shelved = projects
    .filter(({ state, finishedAt }) => state === "shelved" && finishedAt === null)
    .map(withArea)
    .sort((left, right) => left.project.title.localeCompare(right.project.title, "es"));

  return { finished, shelved };
}
