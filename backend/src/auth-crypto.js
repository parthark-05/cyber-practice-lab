import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;
const scryptOptions = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

export async function hashSecret(secret) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(secret, salt, keyLength, scryptOptions);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifySecret(secret, storedHash) {
  const [algorithm, saltHex, keyHex] = String(storedHash).split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  if (salt.length !== 16 || expectedKey.length !== keyLength) return false;

  const actualKey = await scrypt(secret, salt, keyLength, scryptOptions);
  return timingSafeEqual(actualKey, expectedKey);
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
