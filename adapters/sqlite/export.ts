import { mkdtemp, open, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

import { localDatabasePath } from "./database.ts";

export async function exportDatabase(path = localDatabasePath()): Promise<{
  body: ReadableStream<Uint8Array>;
  size: number;
}> {
  const directory = await mkdtemp(join(tmpdir(), "ritmo-export-"));
  const destination = join(directory, "copy.sqlite");
  let file: Awaited<ReturnType<typeof open>> | undefined;
  let cleaned = false;
  async function cleanup() {
    if (cleaned) return;
    cleaned = true;
    try {
      await file?.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  try {
    // A separate read-only connection never migrates or writes to the live database.
    // SQLite's backup API includes committed WAL pages and excludes unfinished transactions.
    const source = new DatabaseSync(path, { readOnly: true });
    try {
      await backup(source, destination);
    } finally {
      source.close();
    }
    file = await open(destination, "r");
    const size = (await file.stat()).size;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const chunk = new Uint8Array(64 * 1024);
          const { bytesRead } = await file!.read(chunk);
          if (bytesRead === 0) {
            await cleanup();
            controller.close();
          } else {
            controller.enqueue(chunk.subarray(0, bytesRead));
          }
        } catch (error) {
          await cleanup();
          controller.error(error);
        }
      },
      cancel: cleanup,
    });
    return { body, size };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
