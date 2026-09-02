import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_DATABASE_PATH = resolve(process.cwd(), "data", "ritmo.sqlite");
const DEFAULT_MIGRATIONS_PATH = resolve(process.cwd(), "migrations");

interface MigrationRow {
  name: string;
}

export function localDatabasePath(): string {
  return resolve(process.env.RITMO_DB_PATH ?? DEFAULT_DATABASE_PATH);
}

export function openDatabase(
  path = localDatabasePath(),
  migrationsPath = DEFAULT_MIGRATIONS_PATH,
): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  database.exec("PRAGMA foreign_keys = ON");
  applyMigrations(database, migrationsPath);
  return database;
}

export function applyMigrations(
  database: DatabaseSync,
  migrationsPath = DEFAULT_MIGRATIONS_PATH,
): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _ritmo_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    (database.prepare("SELECT name FROM _ritmo_migrations").all() as unknown as MigrationRow[])
      .map(({ name }) => name),
  );
  const migrationNames = readdirSync(migrationsPath)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const record = database.prepare(
    "INSERT INTO _ritmo_migrations (name, applied_at) VALUES (?, ?)",
  );

  for (const name of migrationNames) {
    if (applied.has(name)) continue;

    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(readFileSync(resolve(migrationsPath, name), "utf8"));
      record.run(name, new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}
