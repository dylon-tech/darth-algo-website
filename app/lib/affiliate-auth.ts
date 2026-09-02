import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const COOKIE_NAME = "darth_affiliate_session";

export { COOKIE_NAME };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function secret() {
  const value = process.env.AFFILIATE_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("AFFILIATE_SESSION_SECRET must be at least 32 characters");
  return value;
}

export function createAffiliateSession(id: string) {
  const payload = Buffer.from(JSON.stringify({ id, exp: Date.now() + 30 * 86400_000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readAffiliateSession(value?: string) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id: string; exp: number };
  return parsed.exp > Date.now() ? parsed.id : null;
}

