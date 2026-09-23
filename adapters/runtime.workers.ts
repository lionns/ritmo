import type { AuthStore } from "../core/ports/auth-store.ts";
import { readAuthConfig } from "./http/session.ts";
import { env } from "cloudflare:workers";
import type { Store } from "../core/ports/store.ts";
import { applyMigrations, connect, RemoteDatabase } from "./libsql/database.ts";
import { LibsqlStore } from "./libsql/store.ts";
import { exportDatabase as exportRemote } from "./libsql/export.ts";

const sources = import.meta.glob<string>("../migrations/*.sql", { query: "?raw", import: "default", eager: true });
const migrations = Object.entries(sources).map(([path, sql]) => ({ name: path.split("/").at(-1)!, sql }));

function config() {
  // Credentials remain runtime secrets and never become build-time substitutions.
  const { RITMO_DATABASE_URL: url, RITMO_DATABASE_TOKEN: authToken, RITMO_STORE: kind } = env;
  if (kind !== "remote" || typeof url !== "string" || !url) throw new Error("Remote database configuration is required");
  return { url, authToken: typeof authToken === "string" ? authToken : undefined };
}

export async function runtimeStore(): Promise<Store & AuthStore> {
  const client = connect(config());
  try {
    await applyMigrations(client, migrations);
    return new LibsqlStore(new RemoteDatabase(client));
  } catch (error) { client.close(); throw error; }
}

export async function exportDatabase() { return exportRemote(config()); }

export function runtimeAuthConfig() { return readAuthConfig(env); }
