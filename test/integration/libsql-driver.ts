import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { once } from "node:events";
import { connect, applyMigrations, RemoteDatabase } from "../../adapters/libsql/database.ts";
import { LibsqlStore } from "../../adapters/libsql/store.ts";
import type { StoreDriver } from "./store-driver.ts";

const servers = new Map<string, { process: ChildProcess; url: string }>();
export function remoteTestsAvailable(): boolean {
  const configured = process.env.RITMO_SQLD_BINARY;
  const probe = spawnSync(configured ?? "sqld", ["--version"], { encoding: "utf8", timeout: 5000 });
  if (!configured && (probe.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
    process.stderr.write("SKIPPED remote libSQL tests: sqld is not on PATH. Remote Store/API, migrations, constraints and SQLite export are NOT verified. See docs/development.md; set RITMO_SQLD_BINARY to run the full gate.\n");
    return false;
  }
  if (probe.error || probe.status !== 0) {
    throw new Error(`libSQL test server probe failed (${configured ?? "sqld"}): ${probe.error?.message ?? probe.stderr}`);
  }
  return true;
}

export function migrationsAt(directory = resolve("migrations")) {
  return readdirSync(directory).filter(name => name.endsWith(".sql"))
    .map(name => ({ name, sql: readFileSync(resolve(directory, name), "utf8") }));
}

async function serverFor(path: string) {
  const existing = servers.get(path);
  if (existing) return existing.url;
  const binary = process.env.RITMO_SQLD_BINARY ?? "sqld";
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  const port = address.port;
  await new Promise<void>((done, reject) => listener.close(error => error ? reject(error) : done()));
  mkdirSync(path, { recursive: true });
  const child = spawn(binary, ["--no-welcome", "--db-path", path, "--http-listen-addr", `127.0.0.1:${port}`], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let failure: Error | undefined;
  let logs = "";
  child.on("error", error => { failure = error; });
  child.stdout?.on("data", value => { logs = (logs + value).slice(-2000); });
  child.stderr?.on("data", value => { logs = (logs + value).slice(-2000); });
  const url = `http://127.0.0.1:${port}`;
  servers.set(path, { process: child, url });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (failure || child.exitCode !== null) throw new Error(`Set RITMO_SQLD_BINARY to a libSQL server binary: ${failure?.message ?? logs}`);
    try { if ((await fetch(`${url}/health`)).ok) return url; } catch { /* starting */ }
    await new Promise(done => setTimeout(done, 50));
  }
  throw new Error(`libSQL test server did not start: ${logs}`);
}

export const libsqlDriver: StoreDriver = {
  name: "libSQL over HTTP",
  async cleanup() {
    await Promise.all([...servers.values()].map(async ({ process: child }) => {
      if (child.exitCode !== null || !child.pid) return;
      const exit = once(child, "exit");
      child.kill("SIGTERM");
      await exit;
    }));
    servers.clear();
  },
  async open(path, directory) {
    const url = await serverFor(path);
    const client = connect({ url });
    try { await applyMigrations(client, migrationsAt(directory)); }
    catch (error) { client.close(); throw error; }
    const connection = new RemoteDatabase(client);
    return {
      store: new LibsqlStore(connection),
      prepare(sql) {
        const statement = connection.prepare(sql);
        // Normalize the SDK's array-like Row to the same plain records as the native adapter.
        return {
          run: (...args) => statement.run(...args),
          get: async (...args) => {
            const row = await statement.get(...args);
            return row === undefined ? undefined : Object.fromEntries(Object.entries(row));
          },
          all: async (...args) => (await statement.all(...args)).map(row => Object.fromEntries(Object.entries(row))),
        };
      },
      exec: sql => client.executeMultiple(sql),
      close: () => client.close(),
      migrate: directory => applyMigrations(client, migrationsAt(directory)),
      async configureRuntime() {
        const keys = ["RITMO_STORE", "RITMO_DATABASE_URL", "RITMO_DATABASE_TOKEN", "RITMO_DB_PATH"] as const;
        const previous = keys.map(key => process.env[key]);
        process.env.RITMO_STORE = "remote";
        process.env.RITMO_DATABASE_URL = url;
        Reflect.deleteProperty(process.env, "RITMO_DATABASE_TOKEN");
        process.env.RITMO_DB_PATH = "/not-available/local-sqlite-must-not-be-opened.sqlite";
        return async () => {
          keys.forEach((key, index) => {
            if (previous[index] === undefined) delete process.env[key];
            else process.env[key] = previous[index];
          });
        };
      },
    };
  },
};
