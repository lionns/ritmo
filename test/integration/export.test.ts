import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openDatabase } from "../../adapters/sqlite/database.ts";
import { handleGetExport } from "../../src/pages/api/export.ts";

let directory: string;
let source: DatabaseSync;
let previousPath: string | undefined;
let path: string;

function snapshot(db: DatabaseSync) {
  const schema = db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY name").all();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  return { schema, tables: tables.map(({ name }) => ({
    name, rows: db.prepare(`SELECT * FROM "${String(name).replaceAll('"', '""')}" ORDER BY rowid`).all(),
  })) };
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
    return snapshot(copy);
  } finally {
    copy.close();
  }
}

const temporaryExports = () => readdirSync(tmpdir()).filter(name => name.startsWith("ritmo-export-")).sort();

describe("downloading the complete SQLite database", () => {
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "ritmo-export-test-"));
    path = join(directory, "live.sqlite");
    previousPath = process.env.RITMO_DB_PATH;
    process.env.RITMO_DB_PATH = path;
    source = openDatabase(path);
    source.exec(`
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
    `);
  });

  afterEach(() => {
    source.close();
    if (previousPath === undefined) delete process.env.RITMO_DB_PATH;
    else process.env.RITMO_DB_PATH = previousPath;
    rmSync(directory, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("downloads every table and row, leaves the source unchanged, and uses unique filenames", async () => {
    const before = snapshot(source);
    const bytes = readFileSync(path);
    const directories = temporaryExports();
    const first = await handleGetExport();
    expect(first.headers.get("Content-Type")).toBe("application/vnd.sqlite3");
    expect(first.headers.get("Cache-Control")).toBe("no-store");
    expect(first.headers.get("Content-Disposition")).toMatch(/^attachment; filename="ritmo-.*\.sqlite"$/);
    expect(await downloaded(first)).toEqual(before);
    const second = await handleGetExport();
    expect(second.headers.get("Content-Disposition")).not.toBe(first.headers.get("Content-Disposition"));
    expect(await downloaded(second)).toEqual(before);
    expect(snapshot(source)).toEqual(before);
    expect(readFileSync(path)).toEqual(bytes);
    expect(temporaryExports()).toEqual(directories);
  });

  it("exports committed WAL data while a transaction is unfinished, never half of that transaction", async () => {
    source.exec("PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0");
    source.exec("UPDATE steps SET title = 'Committed in WAL' WHERE id = 's'");
    const committed = snapshot(source);
    source.exec("BEGIN IMMEDIATE; UPDATE projects SET title = 'Changed together' WHERE id = 'p'");
    try {
      // The writer stays in flight until the entire download has completed on another connection.
      expect(await downloaded(await handleGetExport())).toEqual(committed);
      source.exec("UPDATE steps SET title = 'Changed together' WHERE id = 's'; COMMIT");
    } catch (error) {
      source.exec("ROLLBACK");
      throw error;
    }
    expect(await downloaded(await handleGetExport())).toEqual(snapshot(source));
  });

  it("removes its temporary copy when the download is cancelled", async () => {
    const directories = temporaryExports();
    const response = await handleGetExport();
    await response.body!.cancel();
    expect(temporaryExports()).toEqual(directories);
  });

  it("does not create a missing live database or return a fake SQLite download on failure", async () => {
    const directories = temporaryExports();
    process.env.RITMO_DB_PATH = join(directory, "missing.sqlite");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handleGetExport();
    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(readdirSync(directory)).not.toContain("missing.sqlite");
    expect(temporaryExports()).toEqual(directories);
  });
});
