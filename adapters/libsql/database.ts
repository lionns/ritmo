import { createClient, type Client, type InValue, type Transaction } from "@libsql/client/web";

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}
export interface Migration { name: string; sql: string }

/** The fetch-only entry point rejects file: URLs; it cannot fall back to local SQLite. */
export function connect(config: DatabaseConfig): Client {
  const url = new URL(config.url);
  if (!["https:", "http:", "libsql:"].includes(url.protocol)) {
    throw new Error("Remote database requires an HTTP or libsql URL");
  }
  return createClient({ ...config, intMode: "number" });
}

/** A connection/transaction wrapper, not a second implementation of SQL or of the Store port. */
export class RemoteDatabase {
  private readonly executor: Client | Transaction;

  constructor(executor: Client | Transaction) { this.executor = executor; }

  prepare(sql: string) {
    const execute = (args: InValue[]) => this.executor.execute({ sql, args });
    return {
      run: async (...args: InValue[]) => ({ changes: (await execute(args)).rowsAffected }),
      get: async (...args: InValue[]) => (await execute(args)).rows[0],
      all: async (...args: InValue[]) => (await execute(args)).rows,
    };
  }

  async transaction<T>(action: (database: RemoteDatabase) => Promise<T>): Promise<T> {
    if (!("transaction" in this.executor)) throw new Error("Nested transaction is not supported");
    const transaction = await this.executor.transaction("write");
    try {
      const value = await action(new RemoteDatabase(transaction));
      await transaction.commit();
      return value;
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      transaction.close();
    }
  }
}

export async function applyMigrations(client: Client, migrations: Migration[]): Promise<void> {
  // FK enforcement is a server connection policy, not a one-off PRAGMA on an HTTP request.
  const foreignKeys = await client.execute("PRAGMA foreign_keys");
  if (foreignKeys.rows[0]?.foreign_keys !== 1) throw new Error("Remote database must enforce foreign keys");
  await client.execute(`CREATE TABLE IF NOT EXISTS _ritmo_migrations (
    name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const applied = new Set((await client.execute("SELECT name FROM _ritmo_migrations")).rows.map(row => row.name));
  for (const migration of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
    if (applied.has(migration.name)) continue;
    const tx = await client.transaction("write");
    try {
      // Check again under the write lock: two cold requests can observe the same pending migration.
      const existing = await tx.execute({ sql: "SELECT name FROM _ritmo_migrations WHERE name = ?", args: [migration.name] });
      if (existing.rows.length === 0) {
        await tx.executeMultiple(migration.sql);
        await tx.execute({ sql: "INSERT INTO _ritmo_migrations (name, applied_at) VALUES (?, ?)",
          args: [migration.name, new Date().toISOString()] });
      }
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally { tx.close(); }
  }
}
