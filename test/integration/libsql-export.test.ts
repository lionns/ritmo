import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { libsqlDriver, remoteTestsAvailable } from "./libsql-driver.ts";
import type { TestDatabase } from "./store-driver.ts";
import { handleGetExport } from "../../src/pages/api/export.ts";
import { exportDatabase } from "../../adapters/libsql/export.ts";
import { connect } from "../../adapters/libsql/database.ts";

let directory: string;
let source: TestDatabase;
let restore: () => Promise<void>;

function normalize(rows: Record<string, unknown>[]) {
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
    value instanceof ArrayBuffer ? Array.from(new Uint8Array(value))
      : value instanceof Uint8Array ? Array.from(value) : value])));
}

async function snapshot(db: TestDatabase) {
  const schema = await db.prepare("SELECT type, name, tbl_name FROM sqlite_master ORDER BY name").all();
  const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  const rows = await Promise.all(tables.map(async ({name}) => ({ name,
    rows: normalize(await db.prepare(`SELECT * FROM "${String(name).replaceAll('"', '""')}" ORDER BY rowid`).all()) })));
  return {schema, rows};
}

async function downloaded(response: Response) {
  expect(response.status).toBe(200);
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(bytes.length).toBe(Number(response.headers.get("Content-Length")));
  const destination = join(directory, "download.sqlite");
  writeFileSync(destination, bytes);
  const copy = new DatabaseSync(destination, { readOnly: true });
  try {
    expect(copy.prepare("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
    expect(copy.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    const schema = copy.prepare("SELECT type, name, tbl_name FROM sqlite_master ORDER BY name").all();
    const tables = copy.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
    return { schema, rows: tables.map(({name}) => ({ name,
      rows: normalize(copy.prepare(`SELECT * FROM "${String(name).replaceAll('"', '""')}" ORDER BY rowid`).all()) })) };
  } finally { copy.close(); }
}

describe.skipIf(!remoteTestsAvailable())("complete remote database export (requires sqld)", () => {
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "ritmo-remote-export-"));
    source = await libsqlDriver.open(join(directory, "server"));
    restore = await source.configureRuntime();
    await source.exec(`
      INSERT INTO owners (id, active_cap, cap_raises) VALUES ('o', 2, '[]');
      INSERT INTO credentials VALUES ('c', 'o', 'Device', 'credential', 'key', 0, '2026-09-22', NULL);
      INSERT INTO areas VALUES ('a', 'o', 'Studio', 1);
      INSERT INTO objectives VALUES ('obj', 'o', 'a', 'Learn', 'learning', NULL, 'Practice');
      INSERT INTO tags VALUES ('t', 'o', 'Travel');
      INSERT INTO projects VALUES ('p', 'o', 'a', 'obj', 'Project', 'active', NULL, NULL, NULL);
      INSERT INTO weeks VALUES ('w', 'o', '2026-09-21', 'normal', 't', NULL, NULL);
      INSERT INTO commitments VALUES ('cm', 'o', 'p', 'w', 2, NULL, 1, 'times');
      INSERT INTO steps VALUES ('s', 'o', 'p', 'Paso', 20, NULL, '2026-09-22', NULL);
      INSERT INTO entries VALUES ('e', 'o', 'progress', 'p', 'obj', '2026-09-22', 'Avancé', 20, NULL, 's');
      CREATE TABLE export_types (id INTEGER PRIMARY KEY, value BLOB, n INTEGER, text_value TEXT);
      INSERT INTO export_types VALUES (1, x'00FF017F', 9223372036854775807, 'línea 1
línea 2; COMMIT;');
    `);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    source?.close();
    await restore?.();
    await libsqlDriver.cleanup();
    rmSync(directory, { recursive: true, force: true });
  });

  it("downloads every table including credentials and ledger without changing the source", async () => {
    // Int64 exceeds JS safe integers: compare via SQL's exact text form, not a numeric SDK read.
    await source.exec("UPDATE export_types SET n = 9007199254740991");
    const before = await snapshot(source);
    const response = await handleGetExport();
    expect(response.headers.get("Content-Type")).toBe("application/vnd.sqlite3");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await downloaded(response)).toEqual(before);
    const second = await handleGetExport();
    expect(second.headers.get("Content-Disposition")).not.toBe(response.headers.get("Content-Disposition"));
    expect(await downloaded(second)).toEqual(before);
    expect(await snapshot(source)).toEqual(before);
  });

  it("preserves 64-bit integers without conversion through JavaScript numbers", async () => {
    const response = await handleGetExport();
    expect(response.status).toBe(200);
    const destination = join(directory, "int64.sqlite");
    writeFileSync(destination, new Uint8Array(await response.arrayBuffer()));
    const copy = new DatabaseSync(destination);
    try { expect(copy.prepare("SELECT CAST(n AS TEXT) n FROM export_types").get()).toEqual({ n: "9223372036854775807" }); }
    finally { copy.close(); }
  });

  it("includes committed writes and excludes an unfinished transaction", async () => {
    await source.exec("UPDATE export_types SET n = 1");
    await source.exec("UPDATE steps SET title = 'Committed' WHERE id = 's'");
    const before = await snapshot(source);
    const client = connect({url: process.env.RITMO_DATABASE_URL!});
    const transaction = await client.transaction("write");
    try {
      await transaction.execute("UPDATE projects SET title = 'Uncommitted' WHERE id = 'p'");
      expect(await downloaded(await handleGetExport())).toEqual(before);
    } finally { await transaction.rollback(); transaction.close(); client.close(); }
  });

  it("normalizes libsql URLs and refuses redirects without forwarding the credential", async () => {
    const mocked = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, {
      status: 302, headers: { Location: "https://elsewhere.invalid/dump" },
    }));
    await expect(exportDatabase({ url: "libsql://example.invalid", authToken: "test-token" })).rejects.toThrow("302");
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(String(mocked.mock.calls[0][0])).toBe("https://example.invalid/dump");
    expect(mocked.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });

  it("cancels oversized input rather than returning an incomplete download", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); }, cancel,
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(stream));
    await expect(exportDatabase({ url: "https://example.invalid" })).rejects.toThrow("memory budget");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("fails explicitly on an unavailable or incomplete dump, without a local fallback", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mocked = vi.spyOn(globalThis, "fetch");
    mocked.mockResolvedValueOnce(new Response("unavailable", {status:503}));
    const unavailable = await handleGetExport();
    expect(unavailable.status).toBe(500);
    expect(unavailable.headers.get("Content-Disposition")).toBeNull();
    mocked.mockResolvedValueOnce(new Response("BEGIN; CREATE TABLE partial (id TEXT);"));
    expect((await handleGetExport()).status).toBe(500);
  });
});
