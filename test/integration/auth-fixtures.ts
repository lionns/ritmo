import { generateKeyPairSync, sign as nodeSign, createHash, randomBytes } from "node:crypto";
import { encode, utf8 } from "../../adapters/http/session.ts";
export const protectedRoutes: [string, string][] = [
  ["GET", "/"], ["GET", "/registrar"], ["GET", "/ajustes"], ["GET", "/archivo"], ["GET", "/p/project"],
  ["GET", "/api/portfolio"], ["GET", "/api/archive"], ["GET", "/api/settings"], ["GET", "/api/project/project"],
  ["GET", "/api/export"], ["POST", "/api/entries"], ["POST", "/api/setup"], ["POST", "/api/areas"],
  ["POST", "/api/projects"], ["PATCH", "/api/projects"], ["PATCH", "/api/settings"],
  ["POST", "/api/steps"], ["PATCH", "/api/steps"], ["GET", "/api/auth/credentials"],
  ["DELETE", "/api/auth/credentials"], ["POST", "/api/auth/register/begin"],
  ["POST", "/api/auth/register/finish"], ["POST", "/api/auth/logout"],
];
export function passkeyFixture() {
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = keys.publicKey.export({ format: "jwk" });
  const id = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update("localhost").digest();
  function data(count: number, register: boolean, flags = register ? 69 : 5) {
    const counter = Buffer.alloc(4); counter.writeUInt32BE(count);
    const base = Buffer.concat([hash, Buffer.from([flags]), counter]);
    if (!register) return base;
    const key = Buffer.concat([Buffer.from([0xa5, 1, 2, 3, 0x26, 0x20, 1, 0x21, 0x58, 32]),
      Buffer.from(jwk.x!, "base64url"), Buffer.from([0x22, 0x58, 32]), Buffer.from(jwk.y!, "base64url")]);
    return Buffer.concat([base, Buffer.alloc(16), Buffer.from([0, 24]), Buffer.from(id, "base64url"), key]);
  }
  return {
    id,
    registration(challenge: string, origin: string) {
      return { id, label: "Phone", clientDataJSON: encode(utf8(JSON.stringify({ type: "webauthn.create", challenge, origin, crossOrigin: false }))), authenticatorData: data(0, true).toString("base64url") };
    },
    assertion(challenge: string, origin: string, count = 1, flags = 5) {
      const client = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge, origin, crossOrigin: false }));
      const auth = data(count, false, flags);
      return { id, clientDataJSON: client.toString("base64url"), authenticatorData: auth.toString("base64url"),
        signature: nodeSign("sha256", Buffer.concat([auth, createHash("sha256").update(client).digest()]), keys.privateKey).toString("base64url"), userHandle: encode(utf8("owner")) };
    },
  };
}

