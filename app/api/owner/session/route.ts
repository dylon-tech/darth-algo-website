import { NextResponse } from "next/server";
import { createOwnerSession, ownerCookie, ownerSessionFromRequest, privateHeaders, sameOrigin, sessionSeconds } from "../../../lib/business-os/owner-session";
import { consumeDeviceLink } from "../../../lib/business-os/device-links";
import { secretMatches } from "../../../lib/business-os/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const authenticated = ownerSessionFromRequest(request);
  const response = NextResponse.json({ authenticated, enabled: process.env.AI_OS_ENABLED === "true" }, { headers: privateHeaders });
  if (authenticated) response.cookies.set(ownerCookie, createOwnerSession(process.env.AI_OS_OWNER_KEY!), { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/", maxAge: sessionSeconds });
  return response;
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
  if (body?.operation === "connect") {
    if (typeof body.token !== "string") return NextResponse.json({error:"Invalid setup link"},{status:400,headers:privateHeaders});
    try {
      const session = createOwnerSession(process.env.AI_OS_OWNER_KEY || "");
      await consumeDeviceLink(body.token);
      response.cookies.set(ownerCookie,session,{httpOnly:true,secure,sameSite:"strict",path:"/",maxAge:sessionSeconds});
      return response;
    } catch {return NextResponse.json({error:"This setup link is expired or already used. Request a fresh private setup link."},{status:401,headers:privateHeaders});}
  }
  if (typeof body?.key !== "string" || !secretMatches(body.key, process.env.AI_OS_OWNER_KEY)) return NextResponse.json({ error: "Invalid owner key" }, { status: 401, headers: privateHeaders });
  response.cookies.set(ownerCookie, createOwnerSession(process.env.AI_OS_OWNER_KEY!), { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: sessionSeconds });
  return response;
}
