import { createHmac, randomBytes } from "node:crypto";
import { secretMatches } from "./policy";

export const ownerCookie = "darth_os_owner";
export const sessionSeconds = 180 * 24 * 60 * 60;
export const privateHeaders = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

function sign(value: string, key: string) {
  return createHmac("sha256", key).update(`darth-os-session-v1:${value}`).digest("hex");
}
export function createOwnerSession(key: string, now = Date.now()) {
  if (key.length < 32) throw new Error("Owner key is too short");
  const value = `${Math.floor(now / 1000) + sessionSeconds}.${randomBytes(24).toString("hex")}`;
  return `${value}.${sign(value, key)}`;
}
export function validOwnerSession(token: string | undefined, key: string | undefined, now = Date.now()) {
  if (!token || !key || key.length < 32 || token.length > 200) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d{10}$/.test(parts[0]) || !/^[0-9a-f]{48}$/.test(parts[1])) return false;
  const expires = Number(parts[0]);
  if (expires <= Math.floor(now / 1000) || expires > Math.floor(now / 1000) + sessionSeconds) return false;
  return secretMatches(parts[2], sign(`${parts[0]}.${parts[1]}`, key));
}
export function ownerSessionFromRequest(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(`${ownerCookie}=`))?.slice(ownerCookie.length + 1);
  return process.env.AI_OS_ENABLED === "true" && validOwnerSession(token, process.env.AI_OS_OWNER_KEY);
}
// Mutations require a same-origin browser request. A bearer API remains separate.
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next.js can normalize request.url to an internal hostname. Compare the
  // browser's Origin with the actual HTTP Host; do not accept arbitrary
  // forwarded-host values or a list of unrelated deployment origins.
  const host = request.headers.get("host") || url.host;
  if (!origin || origin !== `${url.protocol}//${host}`) return false;
  return !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") || "");
}
