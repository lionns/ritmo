import { passkeyFixture, protectedRoutes } from "./auth-fixtures.ts";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, afterEach, afterAll, describe, it, expect } from "vitest";
import { authRequest, guard } from "../../adapters/http/auth.ts";
import { authenticate, encode, mintSession, sign, utf8, digest, currentOwnerId, type AuthConfig } from "../../adapters/http/session.ts";
import { hashPassword } from "../../adapters/http/password.ts";
import type { StoreDriver, TestDatabase } from "./store-driver.ts";

export function runAuthSuite(driver: StoreDriver) {
 describe(`${driver.name} authentication`, () => {
  let db: TestDatabase; let directory: string; let config: AuthConfig; let passwordSession: string;
  const password = "a test-only long password";
  beforeAll(async () => {
    config = { secret: randomBytes(32).toString("hex"), ownerId: "owner", origin: "https://localhost", passwordHash: await hashPassword(password) };
    passwordSession = `ritmo_session=${await mintSession(config, `password:${await digest(config.passwordHash)}`)}`;
  });
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "ritmo-auth-")); db = await driver.open(join(directory, "db"));
    await db.store.createOwner({ id: "owner", activeCap: 2, capRaises: [] });
  });
  afterEach(async () => { db.close(); await driver.cleanup(); rmSync(directory, { recursive: true, force: true }); });
  afterAll(() => driver.cleanup());
  function request(action: string, data?: unknown, cookies = "", method = "POST", origin = config.origin) {
    return new Request(`${config.origin}/api/auth/${action}`, { method, headers: { Origin: origin, Cookie: cookies, "Content-Type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  }
  const call = (action: string, data?: unknown, cookies = "", method = "POST", origin = config.origin) => authRequest(request(action, data, cookies, method, origin), action, config, db.store);
  async function begin(kind: string, cookies = "") {
    const response = await call(`${kind}/begin`, undefined, cookies);
    expect(response.status).toBe(200);
    return { challenge: (await response.json()).challenge as string, cookies: [cookies, response.headers.getSetCookie()[0]!.split(";")[0]].filter(Boolean).join("; ") };
  }
  async function register(fixture = passkeyFixture()) {
    const ceremony = await begin("register", passwordSession);
    const response = await call("register/finish", fixture.registration(ceremony.challenge, config.origin), ceremony.cookies);
    expect(response.status).toBe(200);
    return { fixture, session: response.headers.getSetCookie()[0]!.split(";")[0]! };
  }
  it("requires password proof even when zero credentials exist; bootstrap cannot be claimed", async () => {
    expect((await call("register/begin")).status).toBe(401);
    expect((await call("register/finish", {})).status).toBe(401);
    expect((await db.store.listCredentials("owner"))).toEqual([]);
  });
  it("password fallback signs an HttpOnly Secure SameSite cookie, rejects wrong passwords and CSRF", async () => {
    expect((await call("password", { password: "wrong" })).status).toBe(401);
    expect((await call("password", { password }, "", "POST", "https://foreign.test")).status).toBe(403);
    const response = await call("password", { password }); expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()[0]).toContain("Max-Age=1800; HttpOnly; Secure; SameSite=Lax");
    expect(await authenticate(request("credentials", undefined, response.headers.getSetCookie()[0]!.split(";")[0], "GET"), config, db.store)).toMatchObject({ ownerId: "owner" });
  });
  it("persists an atomic rate limit shared across connections", async () => {
    for (let i = 0; i < 10; i++) expect(await db.store.allowAuthAttempt("owner", 123)).toBe(true);
    expect(await db.store.allowAuthAttempt("owner", 123)).toBe(false);
    expect(await db.store.allowAuthAttempt("owner", 124)).toBe(true);
  });
  for (const invalid of ["missing", "expired", "altered", "foreign-signed"] as const) {
    it(`refuses ${invalid} sessions on every owned route including export`, async () => {
      let token = "";
      if (invalid === "expired") token = await mintSession(config, "key", Date.now() - 1800001);
      if (invalid === "altered") token = (await mintSession(config, "key")) + "x";
      if (invalid === "foreign-signed") token = await mintSession({ ...config, secret: "other".repeat(16) }, "key");
      for (const [method, path] of protectedRoutes) {
        const req = new Request(config.origin + path, { method, headers: { Origin: config.origin, Cookie: token ? `ritmo_session=${token}` : "" } });
        const response = await guard(req, config, db.store, async () => { throw new Error("Guard leaked"); });
        expect(response.status, `${method} ${path}`).toBe(path.startsWith("/api/") ? 401 : 302);
      }
    });
  }
  it("binds sessions to owner, purpose, origin, password hash and signing-secret rotation", async () => {
    const req = request("credentials", undefined, passwordSession, "GET");
    expect(await authenticate(req, config, db.store)).not.toBeNull();
    for (const changed of [{ ...config, ownerId: "another" }, { ...config, origin: "https://other.test" }, { ...config, passwordHash: "rotated" }, { ...config, secret: "rotated".repeat(8) }]) {
      expect(await authenticate(req, changed, db.store)).toBeNull();
    }
    const challenge = await sign({ type: "login", ownerId: "owner", expires: Date.now() + 10000, credentialId: "key" }, config);
    expect(await authenticate(request("credentials", undefined, `ritmo_session=${challenge}`, "GET"), config, db.store)).toBeNull();
  });
  it("authenticates two devices independently and deleting one revokes its cookie immediately", async () => {
    const first = await register(); const second = await register();
    expect((await db.store.listCredentials("owner"))).toHaveLength(2);
    const stored = (await db.store.getCredential(first.fixture.id))!;
    await db.store.deleteCredential(stored.id, "wrong-owner");
    expect(await authenticate(request("credentials", undefined, first.session, "GET"), config, db.store)).not.toBeNull();
    await db.store.deleteCredential(stored.id, "owner");
    expect(await authenticate(request("credentials", undefined, first.session, "GET"), config, db.store)).toBeNull();
    expect(await authenticate(request("credentials", undefined, second.session, "GET"), config, db.store)).not.toBeNull();
  });
  it("verifies a real ES256 signature and rejects replayed challenge/counter", async () => {
    const { fixture } = await register();
    const ceremony = await begin("login"); const reply = fixture.assertion(ceremony.challenge, config.origin);
    expect((await call("login/finish", reply, ceremony.cookies)).status).toBe(200);
    expect((await call("login/finish", reply, ceremony.cookies)).status).toBe(401);
    const fresh = await begin("login");
    expect((await call("login/finish", fixture.assertion(fresh.challenge, config.origin, 1), fresh.cookies)).status).toBe(401);
    expect((await db.store.getCredential(fixture.id))?.signCount).toBe(1);
    expect((await db.store.getCredential(fixture.id))?.lastUsedAt).not.toBeNull();
  });
  it("supports zero-counter synced passkeys but still rejects ceremony replay", async () => {
    const { fixture } = await register(); const ceremony = await begin("login");
    const reply = fixture.assertion(ceremony.challenge, config.origin, 0);
    expect((await call("login/finish", reply, ceremony.cookies)).status).toBe(200);
    expect((await call("login/finish", reply, ceremony.cookies)).status).toBe(401);
  });
  for (const failure of ["origin", "challenge", "signature", "rp", "presence", "verification", "userHandle", "truncated"]) {
    it(`rejects a passkey with wrong ${failure}`, async () => {
      const { fixture } = await register(); const ceremony = await begin("login");
      const reply = fixture.assertion(failure === "challenge" ? "wrong" : ceremony.challenge, failure === "origin" ? "https://wrong.test" : config.origin,
        1, failure === "presence" ? 4 : failure === "verification" ? 1 : 5);
      if (failure === "signature") reply.signature = randomBytes(64).toString("base64url");
      if (failure === "userHandle") reply.userHandle = encode(utf8("other-owner"));
      if (failure === "rp") { const bytes = Buffer.from(reply.authenticatorData, "base64url"); bytes[0] = bytes[0]! ^ 1; reply.authenticatorData = bytes.toString("base64url"); }
      if (failure === "truncated") reply.authenticatorData = "AA";
      expect((await call("login/finish", reply, ceremony.cookies)).status).toBe(401);
      expect((await db.store.getCredential(fixture.id))?.signCount).toBe(0);
    });
  }
  it("rejects registration with substituted credential ID and leaves no row", async () => {
    const fixture = passkeyFixture(); const ceremony = await begin("register", passwordSession);
    const reply = fixture.registration(ceremony.challenge, config.origin); reply.id = "AA";
    expect((await call("register/finish", reply, ceremony.cookies)).status).toBe(401);
    expect(await db.store.listCredentials("owner")).toEqual([]);
  });
  it("consumes challenges atomically, expires them and checks purpose and owner", async () => {
    await db.store.saveChallenge("test", "owner", "login", Date.now() + 5000);
    expect(await db.store.consumeChallenge("test", "other", "login", Date.now())).toBe(false);
    expect(await db.store.consumeChallenge("test", "owner", "register", Date.now())).toBe(false);
    const results = await Promise.all([db.store.consumeChallenge("test", "owner", "login", Date.now()), db.store.consumeChallenge("test", "owner", "login", Date.now())]);
    expect(results.filter(Boolean)).toHaveLength(1);
    await db.store.saveChallenge("old", "owner", "login", Date.now() - 1);
    expect(await db.store.consumeChallenge("old", "owner", "login", Date.now())).toBe(false);
  });
  it("passes the proven identity to handlers and refuses CSRF with a valid cookie", async () => {
    const requestOk = new Request(config.origin + "/api/export", { headers: { Cookie: passwordSession } });
    const response = await guard(requestOk, config, db.store, async () => new Response(currentOwnerId()));
    expect(await response.text()).toBe("owner"); expect(response.headers.get("Cache-Control")).toBe("no-store");
    const bad = new Request(config.origin + "/api/entries", { method: "POST", headers: { Cookie: passwordSession } });
    expect((await guard(bad, config, db.store, async () => new Response("bad"))).status).toBe(403);
  });
 });
}
