import { scrypt, timingSafeEqual, randomBytes } from "node:crypto";
const params = { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 };
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 32, params, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 15 || password.length > 256) throw new Error("Use between 15 and 256 characters");
  const salt = randomBytes(16).toString("hex");
  return `scrypt-16384-8-5:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  if (!/^scrypt-16384-8-5:[a-f0-9]{32}:[a-f0-9]{64}$/.test(encoded)) throw new Error("Invalid password hash configuration");
  if (password.length > 256) return false;
  const [, salt, expected] = encoded.split(":");
  return timingSafeEqual(await derive(password, salt!), Buffer.from(expected!, "hex"));
}
