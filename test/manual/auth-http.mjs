// Run after npm run build:node. Uses only a disposable database and loopback server.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { sqliteDriver } from "../integration/sqlite-driver.ts";
import { libsqlDriver } from "../integration/libsql-driver.ts";
import { hashPassword } from "../../adapters/http/password.ts";
import { mintSession } from "../../adapters/http/session.ts";
import { protectedRoutes, passkeyFixture } from "../integration/auth-fixtures.ts";
const workers = process.argv.includes("--workers");
const driver = workers ? libsqlDriver : sqliteDriver;
const directory = mkdtempSync(join(tmpdir(), "ritmo-auth-http-"));
const path = join(directory, "test.sqlite");
const port = Number(process.env.RITMO_TEST_PORT ?? (workers ? 4350 : 4349));
const origin = `http://localhost:${port}`;
const password = randomBytes(24).toString("base64url");
const config = { origin, ownerId: "owner", secret: randomBytes(32).toString("hex"), passwordHash: await hashPassword(password) };
const db = await driver.open(path);
await db.exec(`INSERT INTO owners (id, active_cap, cap_raises) VALUES ('owner', 2, '[]'); INSERT INTO areas VALUES ('a', 'owner', 'Private area', 1);
INSERT INTO projects VALUES ('project', 'owner', 'a', NULL, 'Private project', 'active', NULL, NULL, NULL);`);
const restore = await db.configureRuntime();
const child = spawn(process.execPath, (workers ? [resolve("node_modules/wrangler/bin/wrangler.js"), "dev", "--config", "dist/workers/server/wrangler.json", "--port", String(port), "--ip", "127.0.0.1", "--log-level", "error"] : [resolve("dist/node/server/entry.mjs")]), { env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), RITMO_STORE: workers ? "remote" : "sqlite", RITMO_DB_PATH: path, RITMO_DATABASE_TOKEN: "local-test",
  RITMO_AUTH_ORIGIN: origin, RITMO_OWNER_ID: config.ownerId, RITMO_SESSION_SECRET: config.secret, RITMO_PASSWORD_HASH: config.passwordHash }, stdio: ["ignore", "pipe", "pipe"] });
let logs = ""; child.stdout.on("data", c => { logs += c; }); child.stderr.on("data", c => { logs += c; });
const get = (path, init = {}) => fetch(origin + path, { ...init, redirect: "manual" });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await get("/entrar")).status === 200) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  assert(ready, logs);
  const expired = await mintSession(config, "test", Date.now() - 1800001);
  const altered = (await mintSession(config, "test")) + "x";
  for (const [method, route] of protectedRoutes) {
    const results = [];
    for (const value of ["", altered, expired]) {
      const response = await get(route, { method, headers: { Origin: origin, Cookie: value ? `ritmo_session=${value}` : "" } });
      results.push(response.status);
      assert.equal(response.status, route.startsWith("/api/") ? 401 : 302, `${method} ${route}`);
      if (!route.startsWith("/api/")) assert.equal(response.headers.get("location"), "/entrar");
      assert(!(await response.text()).includes("Private project"));
    }
    console.log(`${method} ${route}: missing/altered/expired ${results.join("/")}`);
  }
  const api = (action, data, cookie = "", method = "POST") => get(`/api/auth/${action}`, { method, headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  const login = await api("password", { password }); assert.equal(login.status, 200);
  let session = login.headers.getSetCookie()[0].split(";")[0];
  for (const path of ["/", "/registrar", "/ajustes", "/archivo", "/p/project", "/api/portfolio", "/api/settings", "/api/archive", "/api/project/project"]) {
    const response = await get(path, { headers: { Cookie: session } }); assert.equal(response.status, 200, path);
    const text = await response.text();
    if (["/", "/p/project", "/api/portfolio"].includes(path)) assert(text.includes("Private project"), `SSR cookie propagation ${path}`);
  }
  const fixture = passkeyFixture();
  const begin = await api("register/begin", undefined, session); assert.equal(begin.status, 200);
  let challenge = (await begin.json()).challenge;
  const finish = await api("register/finish", fixture.registration(challenge, origin), session + "; " + begin.headers.getSetCookie()[0].split(";")[0]);
  assert.equal(finish.status, 200); session = finish.headers.getSetCookie()[0].split(";")[0];
  const signBegin = await api("login/begin"); challenge = (await signBegin.json()).challenge;
  const assertion = await api("login/finish", fixture.assertion(challenge, origin), signBegin.headers.getSetCookie()[0].split(";")[0]);
  assert.equal(assertion.status, 200); session = assertion.headers.getSetCookie()[0].split(";")[0];
  const exported = await get("/api/export", { headers: { Cookie: session } }); assert.equal(exported.status, 200);
  const copyPath = join(directory, "export.sqlite"); writeFileSync(copyPath, new Uint8Array(await exported.arrayBuffer()));
  const copy = new DatabaseSync(copyPath, { readOnly: true });
  assert.equal(copy.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.equal(copy.prepare("SELECT count(*) n FROM credentials").get().n, 1);
  assert.equal(copy.prepare("SELECT title FROM projects").get().title, "Private project"); copy.close();
  const list = await api("credentials", undefined, session, "GET"); const id = (await list.json()).credentials[0].id;
  assert.equal((await api("credentials", { id }, session, "DELETE")).status, 200);
  assert.equal((await get("/api/export", { headers: { Cookie: session } })).status, 401);
  console.log("PASS: actual HTTP password, passkey register/sign-in, authenticated SSR, SQLite export, immediate revocation");
} finally {
  const exited = once(child, "exit"); child.kill("SIGTERM"); await exited;
  db.close(); await restore(); await driver.cleanup();
  rmSync(directory, { recursive: true, force: true });
}
