import type { DatabaseConfig } from "./database.ts";
import { sqliteModule } from "./wasm.ts";

// Reconstruction needs memory for both SQL and SQLite. Fail explicitly before exhausting a Worker.
const MAX_DUMP_BYTES = 16 * 1024 * 1024;

/** /dump is a consistent SQL snapshot, unlike the CLI's potentially stale generation export. */
export async function exportDatabase(config: DatabaseConfig): Promise<{ body: Uint8Array<ArrayBuffer>; size: number }> {
  const url = new URL(config.url.replace(/^libsql:/, "https:"));
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Export requires an HTTP database URL");
  url.pathname = "/dump";
  url.search = "";
  url.hash = "";
  const response = await fetch(url, {
    headers: config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {},
    redirect: "manual",
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error(`Database dump failed (${response.status})`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let sql = "";
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_DUMP_BYTES) throw new Error("Database dump exceeds the Worker export memory budget");
      sql += decoder.decode(value, { stream: true });
    }
    sql += decoder.decode();
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally { reader.releaseLock(); }
  // An interrupted dump must not become a successful but partial download.
  if (!/COMMIT;\s*$/.test(sql)) throw new Error("Database dump is incomplete");
  const SQLite = await sqliteModule();
  const snapshot = new SQLite.Database();
  try {
    snapshot.exec(sql);
    if (snapshot.exec("PRAGMA integrity_check")[0]?.values[0]?.[0] !== "ok") {
      throw new Error("Exported database failed integrity check");
    }
    if (snapshot.exec("PRAGMA foreign_key_check").length > 0) {
      throw new Error("Exported database failed foreign key check");
    }
    const body = new Uint8Array(snapshot.export());
    return { body, size: body.byteLength };
  } finally { snapshot.close(); }
}
