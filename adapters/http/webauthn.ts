import { decode, encode, utf8 } from "./session.ts";

function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new Error("Invalid passkey response");
}
export interface PasskeyResponse {
  id: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature?: string;
  userHandle?: string | null;
}
export function clientData(value: string, type: string, challenge: string, origin: string): Uint8Array<ArrayBuffer> {
  const bytes = decode(value);
  const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  requireValue(data.type === type && data.challenge === challenge && data.origin === origin &&
    (data.crossOrigin === undefined || data.crossOrigin === false) && data.topOrigin === undefined);
  return bytes;
}
async function authenticator(value: string, rpId: string) {
  const bytes = decode(value);
  requireValue(bytes.length >= 37);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(rpId)));
  requireValue(hash.every((b, i) => b === bytes[i]));
  const flags = bytes[32]!;
  requireValue((flags & 5) === 5); // Both presence and user verification are mandatory.
  requireValue(!(flags & 16) || (flags & 8)); // A backed-up credential must be backup eligible.
  requireValue(!(flags & 128)); // No authenticator extensions are requested/supported.
  const count = new DataView(bytes.buffer).getUint32(33);
  return { bytes, flags, count };
}

/** Only the COSE EC2/ES256 map advertised in our creation options is accepted. */
function coseKey(bytes: Uint8Array): JsonWebKey {
  let offset = 0;
  function read(): number | Uint8Array | Map<number, number | Uint8Array> {
    requireValue(offset < bytes.length);
    const head = bytes[offset++]!;
    const major = head >> 5;
    let size = head & 31;
    if (size === 24) { requireValue(offset < bytes.length); size = bytes[offset++]!; }
    else requireValue(size < 24);
    if (major === 0) return size;
    if (major === 1) return -1 - size;
    if (major === 2) {
      requireValue(offset + size <= bytes.length);
      const value = bytes.slice(offset, offset + size); offset += size; return value;
    }
    requireValue(major === 5 && size === 5);
    const map = new Map<number, number | Uint8Array>();
    for (let i = 0; i < size; i++) {
      const key = read(); const value = read();
      requireValue(typeof key === "number" && !(value instanceof Map) && !map.has(key));
      map.set(key, value);
    }
    return map;
  }
  const map = read();
  requireValue(map instanceof Map && offset === bytes.length);
  requireValue(map.get(1) === 2 && map.get(3) === -7 && map.get(-1) === 1);
  const x = map.get(-2); const y = map.get(-3);
  requireValue(x instanceof Uint8Array && x.length === 32 && y instanceof Uint8Array && y.length === 32);
  return { kty: "EC", crv: "P-256", x: encode(x), y: encode(y), ext: true };
}
export async function verifyRegistration(response: PasskeyResponse, challenge: string, origin: string) {
  clientData(response.clientDataJSON, "webauthn.create", challenge, origin);
  const auth = await authenticator(response.authenticatorData, new URL(origin).hostname);
  requireValue(auth.flags & 64);
  requireValue(auth.bytes.length >= 55);
  const idLength = new DataView(auth.bytes.buffer).getUint16(53);
  requireValue(idLength > 0 && idLength <= 1023 && auth.bytes.length > 55 + idLength);
  requireValue(encode(auth.bytes.slice(55, 55 + idLength)) === response.id);
  const jwk = coseKey(auth.bytes.slice(55 + idLength));
  // Import validates the actual curve point; never trust a separate key supplied by the browser.
  await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  return { publicKey: JSON.stringify(jwk), signCount: auth.count };
}
export function rawSignature(der: Uint8Array): Uint8Array<ArrayBuffer> {
  requireValue(der.length >= 8 && der.length <= 72 && der[0] === 0x30 && der[1] === der.length - 2);
  let offset = 2;
  const raw = new Uint8Array(64);
  for (let part = 0; part < 2; part++) {
    requireValue(der[offset++] === 2);
    const size = der[offset++]!;
    requireValue(size >= 1 && size <= 33 && offset + size <= der.length);
    let value = der.slice(offset, offset + size); offset += size;
    requireValue((value[0]! & 128) === 0);
    if (value.length > 1 && value[0] === 0) {
      requireValue(value[1]! & 128); value = value.slice(1);
    }
    requireValue(value.length <= 32);
    raw.set(value, (part + 1) * 32 - value.length);
  }
  requireValue(offset === der.length);
  return raw;
}
export async function verifyAssertion(response: PasskeyResponse, challenge: string, origin: string,
  ownerId: string, publicKey: string, previousCount: number): Promise<number> {
  const client = clientData(response.clientDataJSON, "webauthn.get", challenge, origin);
  const auth = await authenticator(response.authenticatorData, new URL(origin).hostname);
  requireValue(!(auth.flags & 64) && auth.bytes.length === 37);
  if (response.userHandle != null) requireValue(response.userHandle === encode(utf8(ownerId)));
  // W3C: authenticators without a counter (including synced passkeys) report zero throughout.
  requireValue((previousCount === 0 && auth.count === 0) || auth.count > previousCount);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", client));
  const signed = new Uint8Array(auth.bytes.length + hash.length);
  signed.set(auth.bytes); signed.set(hash, auth.bytes.length);
  const key = await crypto.subtle.importKey("jwk", JSON.parse(publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  requireValue(typeof response.signature === "string" && await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, rawSignature(decode(response.signature)), signed));
  return auth.count;
}
