import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthStore } from "../../core/ports/auth-store.ts";

export interface AuthConfig { secret: string; origin: string; ownerId: string; passwordHash: string }
export interface Principal { ownerId: string; credentialId: string; expires: number }
export const SESSION_SECONDS = 1800;
export const SESSION_COOKIE = "ritmo_session";
const scope = new AsyncLocalStorage<Principal>();
export const withPrincipal = <T>(principal: Principal, fn: () => T): T => scope.run(principal, fn);
export function currentOwnerId(): string {
  const principal = scope.getStore();
  if (!principal) throw new Error("Authenticated request context required");
  return principal.ownerId;
}
export function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 32768) throw new Error("Invalid base64url");
  const bytes = Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), c => c.charCodeAt(0));
  if (encode(bytes) !== value) throw new Error("Noncanonical base64url");
  return bytes;
}
export const utf8 = (value: string) => new TextEncoder().encode(value);
export async function digest(value: string): Promise<string> {
  return encode(new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(value))));
}
function key(secret: string) {
  if (utf8(secret).length < 32) throw new Error("Session secret needs at least 32 random bytes");
  return crypto.subtle.importKey("raw", utf8(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function sign(value: object, config: AuthConfig): Promise<string> {
  const payload = encode(utf8(JSON.stringify(value)));
  const signature = await crypto.subtle.sign("HMAC", await key(config.secret), utf8(`ritmo-v1.${config.origin}.${payload}`));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}
export async function verify(value: string, config: AuthConfig): Promise<Record<string, unknown> | null> {
  try {
    if (value.length > 4096) return null;
    const parts = value.split(".");
    if (parts.length !== 2 || !await crypto.subtle.verify("HMAC", await key(config.secret), decode(parts[1]!), utf8(`ritmo-v1.${config.origin}.${parts[0]}`))) return null;
    const data: unknown = JSON.parse(new TextDecoder().decode(decode(parts[0]!)));
    return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null;
  } catch { return null; }
}
export function cookieValue(request: Request, name: string): string | null {
  const values = (request.headers.get("cookie") ?? "").split(";").map(v => v.trim()).filter(v => v.startsWith(`${name}=`));
  return values.length === 1 ? values[0]!.slice(name.length + 1) : null;
}
export function cookie(name: string, value: string, seconds: number): string {
  return `${name}=${value}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;
}
export async function mintSession(config: AuthConfig, credentialId: string, now = Date.now()): Promise<string> {
  return sign({ type: "session", ownerId: config.ownerId, credentialId, expires: now + SESSION_SECONDS * 1000 }, config);
}
export async function authenticate(request: Request, config: AuthConfig, store: AuthStore, now = Date.now()): Promise<Principal | null> {
  const value = cookieValue(request, SESSION_COOKIE);
  const data = value ? await verify(value, config) : null;
  if (!data || data.type !== "session" || data.ownerId !== config.ownerId || typeof data.credentialId !== "string" ||
      typeof data.expires !== "number" || data.expires <= now || data.expires > now + SESSION_SECONDS * 1000 ||
      !await store.getOwner(config.ownerId)) return null;
  if (data.credentialId.startsWith("password:")) {
    if (data.credentialId !== `password:${await digest(config.passwordHash)}`) return null;
  } else {
    const credential = await store.getCredential(data.credentialId);
    if (!credential || credential.ownerId !== config.ownerId) return null;
  }
  return { ownerId: config.ownerId, credentialId: data.credentialId, expires: data.expires };
}
export function readAuthConfig(values: Partial<Record<"RITMO_SESSION_SECRET" | "RITMO_AUTH_ORIGIN" | "RITMO_OWNER_ID" | "RITMO_PASSWORD_HASH", unknown>>): AuthConfig {
  const secret = values.RITMO_SESSION_SECRET;
  const origin = values.RITMO_AUTH_ORIGIN;
  const ownerId = values.RITMO_OWNER_ID;
  const passwordHash = values.RITMO_PASSWORD_HASH;
  if (typeof secret !== "string" || utf8(secret).length < 32 || typeof origin !== "string" ||
      typeof ownerId !== "string" || !ownerId || typeof passwordHash !== "string" || !passwordHash) throw new Error("Authentication configuration is required");
  const url = new URL(origin);
  if (url.origin !== origin || (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost"))) throw new Error("Authentication requires HTTPS (or localhost)");
  return { secret, origin, ownerId, passwordHash };
}
