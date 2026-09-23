import type { Store } from "../core/ports/store.ts";
import { applyMigrations, connect, RemoteDatabase } from "./libsql/database.ts";
import { LibsqlStore } from "./libsql/store.ts";

function remoteConfig() {
  const url = process.env.RITMO_DATABASE_URL;
  if (!url) throw new Error("RITMO_DATABASE_URL is required for the remote store");
  return { url, authToken: process.env.RITMO_DATABASE_TOKEN };
}

function storeKind() {
  const kind = process.env.RITMO_STORE ?? "sqlite";
  if (kind !== "sqlite" && kind !== "remote") throw new Error("RITMO_STORE must be sqlite or remote");
  return kind;
}

export async function runtimeStore(): Promise<Store> {
  if (storeKind() === "sqlite") return (await import("./sqlite/store.ts")).runtimeStore();
  const { readdirSync, readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const directory = resolve("migrations");
  const migrations = readdirSync(directory).filter(name => name.endsWith(".sql"))
    .map(name => ({ name, sql: readFileSync(resolve(directory, name), "utf8") }));
  const client = connect(remoteConfig());
  try {
    await applyMigrations(client, migrations);
    return new LibsqlStore(new RemoteDatabase(client));
  } catch (error) { client.close(); throw error; }
}

export async function exportDatabase() {
  if (storeKind() === "sqlite") return (await import("./sqlite/export.ts")).exportDatabase();
  return (await import("./libsql/export.ts")).exportDatabase(remoteConfig());
}
