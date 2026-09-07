import { NextResponse } from "next/server";
import { createOwnerSession, ownerCookie, ownerSessionFromRequest, privateHeaders, sameOrigin, sessionSeconds } from "../../../lib/business-os/owner-session";
import { secretMatches } from "../../../lib/business-os/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return NextResponse.json({ authenticated: ownerSessionFromRequest(request), enabled: process.env.AI_OS_ENABLED === "true" }, { headers: privateHeaders });
}
export async function POST(request: Request) {
  if (process.env.AI_OS_ENABLED !== "true") return NextResponse.json({ error: "Not available" }, { status: 404, headers: privateHeaders });
  if (!sameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Same-origin JSON required" }, { status: 403, headers: privateHeaders });
  const raw = await request.text();
  if (raw.length > 1024) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: privateHeaders });
  let body; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: privateHeaders }); }
  const response = NextResponse.json({ authenticated: body?.operation !== "logout" }, { headers: privateHeaders });
  const secure = new URL(request.url).protocol === "https:";
  if (body?.operation === "logout") {
    response.cookies.set(ownerCookie, "", { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 0 });
    return response;
  }
  if (typeof body?.key !== "string" || !secretMatches(body.key, process.env.AI_OS_OWNER_KEY)) return NextResponse.json({ error: "Invalid owner key" }, { status: 401, headers: privateHeaders });
  response.cookies.set(ownerCookie, createOwnerSession(process.env.AI_OS_OWNER_KEY!), { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: sessionSeconds });
  return response;
}
