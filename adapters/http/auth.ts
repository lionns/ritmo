import type { AuthStore } from "../../core/ports/auth-store.ts";
import { authenticate, cookie, cookieValue, decode, digest, encode, mintSession, SESSION_COOKIE,
  SESSION_SECONDS, sign, utf8, verify, withPrincipal, type AuthConfig } from "./session.ts";
import { verifyPassword } from "./password.ts";
import { verifyAssertion, verifyRegistration, type PasskeyResponse } from "./webauthn.ts";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
const denied = () => json({ error: "No se pudo verificar el acceso." }, 401);
const publicPaths = new Set(["/entrar", "/api/auth/password", "/api/auth/login/begin", "/api/auth/login/finish"]);
export async function guard(request: Request, config: AuthConfig, store: AuthStore, next: () => Promise<Response>): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.headers.get("origin") !== config.origin) {
    return json({ error: "Origen no permitido." }, 403);
  }
  const principal = await authenticate(request, config, store);
  if (!principal && !publicPaths.has(path)) {
    return path.startsWith("/api/") ? denied() : new Response(null, { status: 302, headers: { ...headers, Location: "/entrar" } });
  }
  if (principal && path === "/entrar") return new Response(null, { status: 302, headers: { ...headers, Location: "/" } });
  const response = await (principal ? withPrincipal(principal, next) : next());
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("JSON required");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Body required");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length; if (length > 16384) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Object required");
  return value as Record<string, unknown>;
}
function passkey(value: Record<string, unknown>): PasskeyResponse {
  if (typeof value.id !== "string" || typeof value.clientDataJSON !== "string" || typeof value.authenticatorData !== "string" ||
      (value.signature !== undefined && typeof value.signature !== "string") ||
      (value.userHandle != null && typeof value.userHandle !== "string")) throw new Error("Invalid credential");
  decode(value.id);
  return value as unknown as PasskeyResponse;
}
async function sessionResponse(config: AuthConfig, credentialId: string) {
  const response = json({ ok: true });
  response.headers.append("Set-Cookie", cookie(SESSION_COOKIE, await mintSession(config, credentialId), SESSION_SECONDS));
  response.headers.append("Set-Cookie", cookie("ritmo_challenge", "", 0));
  return response;
}
export async function authRequest(request: Request, action: string, config: AuthConfig, store: AuthStore): Promise<Response> {
  try {
    if (request.headers.get("origin") !== config.origin && request.method !== "GET") return json({ error: "Origen no permitido." }, 403);
    const principal = await authenticate(request, config, store);
    if (request.method === "GET" && action === "credentials") {
      if (!principal) return denied();
      return json({ credentials: (await store.listCredentials(principal.ownerId)).map(({ id, label, createdAt, lastUsedAt }) => ({ id, label, createdAt, lastUsedAt })) });
    }
    if (request.method === "DELETE" && action === "credentials") {
      if (!principal) return denied();
      const input = await body(request);
      if (typeof input.id !== "string") return json({ error: "Identificador requerido." }, 400);
      await store.deleteCredential(input.id, principal.ownerId);
      return json({ ok: true });
    }
    if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);
    if (action === "logout") {
      if (!principal) return denied();
      const response = json({ ok: true });
      response.headers.append("Set-Cookie", cookie(SESSION_COOKIE, "", 0));
      return response;
    }
    const allowed = new Set(["password", "login/begin", "login/finish", "register/begin", "register/finish"]);
    if (!allowed.has(action)) return json({ error: "No encontrado." }, 404);
    if (action.startsWith("register/") && !principal) return denied();
    if (!await store.getOwner(config.ownerId)) return json({ error: "El acceso requiere preparación local." }, 503);
    if (!await store.allowAuthAttempt(config.ownerId, Math.floor(Date.now() / 60000))) {
      const response = json({ error: "Espera un minuto antes de volver a intentarlo." }, 429);
      response.headers.set("Retry-After", "60"); return response;
    }
    if (action === "password") {
      const input = await body(request);
      if (typeof input.password !== "string" || !await verifyPassword(input.password, config.passwordHash)) return denied();
      return sessionResponse(config, `password:${await digest(config.passwordHash)}`);
    }
    const purpose = action.startsWith("register/") ? "register" : "login";
    if (action.endsWith("/begin")) {
      const challenge = encode(crypto.getRandomValues(new Uint8Array(32)));
      const expires = Date.now() + 300000;
      await store.saveChallenge(challenge, config.ownerId, purpose, expires);
      const credentials = await store.listCredentials(config.ownerId);
      const descriptors = credentials.map(c => ({ type: "public-key", id: c.credentialId }));
      const options = purpose === "register" ? {
        challenge, rp: { id: new URL(config.origin).hostname, name: "Ritmo" },
        user: { id: encode(utf8(config.ownerId)), name: "Propietario", displayName: "Propietario de Ritmo" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000, attestation: "none",
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" }, excludeCredentials: descriptors,
      } : { challenge, rpId: new URL(config.origin).hostname, timeout: 60000, userVerification: "required", allowCredentials: descriptors };
      const response = json(options);
      response.headers.append("Set-Cookie", cookie("ritmo_challenge", await sign({ type: purpose, challenge, expires, ownerId: config.ownerId }, config), 300));
      return response;
    }
    const input = await body(request);
    const token = cookieValue(request, "ritmo_challenge");
    const ceremony = token ? await verify(token, config) : null;
    if (!ceremony || ceremony.type !== purpose || ceremony.ownerId !== config.ownerId || typeof ceremony.challenge !== "string" ||
      typeof ceremony.expires !== "number" || ceremony.expires <= Date.now() ||
      !await store.consumeChallenge(ceremony.challenge, config.ownerId, purpose, Date.now())) return denied();
    const credential = passkey(input);
    if (purpose === "register") {
      if (typeof input.label !== "string" || !input.label.trim() || input.label.length > 80) return json({ error: "Nombra el dispositivo (hasta 80 caracteres)." }, 400);
      const verified = await verifyRegistration(credential, ceremony.challenge, config.origin);
      await store.createCredential({ id: crypto.randomUUID(), ownerId: config.ownerId, label: input.label.trim(),
        credentialId: credential.id, ...verified, createdAt: new Date().toISOString(), lastUsedAt: null });
      return sessionResponse(config, credential.id);
    }
    const stored = await store.getCredential(credential.id);
    if (!stored || stored.ownerId !== config.ownerId) return denied();
    const count = await verifyAssertion(credential, ceremony.challenge, config.origin, config.ownerId, stored.publicKey, stored.signCount);
    if (!await store.advanceCredential(stored.id, stored.signCount, count, new Date().toISOString())) return denied();
    return sessionResponse(config, stored.credentialId);
  } catch {
    // Never expose credential material, database errors or submitted secrets in logs/responses.
    return denied();
  }
}
