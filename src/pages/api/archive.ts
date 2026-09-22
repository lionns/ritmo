import type { APIRoute } from "astro";

import { runtimeStore } from "../../../adapters/sqlite/store.ts";
import type { Store } from "../../../core/ports/store.ts";
import { readArchive, type ArchivedProject } from "../../../core/rules/archive.ts";
import type {
  ArchiveErrorResponse,
  ArchiveProject,
  ArchiveResponse,
} from "../../../contracts/archive.ts";

const responseHeaders = { "Cache-Control": "no-store" };

export async function handleGetArchive(injectedStore?: Store): Promise<Response> {
  try {
    const store = injectedStore ?? runtimeStore();
    const owner = await store.getOnlyOwner();
    // Before setup there is nothing to archive, and an empty page is truer than an error.
    if (owner === null) {
      return Response.json(
        { finished: [], shelved: [] } satisfies ArchiveResponse,
        { headers: responseHeaders },
      );
    }
    const archive = await readArchive(store, owner.id);
    return Response.json(
      {
        finished: archive.finished.map(toContract),
        shelved: archive.shelved.map(toContract),
      } satisfies ArchiveResponse,
      { headers: responseHeaders },
    );
  } catch (error) {
    console.error(JSON.stringify({
      message: "archive request failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return Response.json(
      { error: "El archivo no se pudo leer" } satisfies ArchiveErrorResponse,
      { status: 500, headers: responseHeaders },
    );
  }
}

export const GET: APIRoute = () => handleGetArchive();

function toContract({ project, area }: ArchivedProject): ArchiveProject {
  return {
    id: project.id,
    title: project.title,
    areaName: area.name,
    finishedAt: project.finishedAt,
  };
}
