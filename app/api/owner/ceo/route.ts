import { NextResponse } from "next/server";
import { secretMatches } from "../../../lib/business-os/policy";
import { initializeOS } from "../../../lib/business-os/schema";
import { decide, runCEO, status } from "../../../lib/business-os/service";
import { createDeviceLink } from "../../../lib/business-os/device-links";
import { readiness } from "../../../lib/business-os/readiness";
import { checkAIConnection } from "../../../lib/business-os/ai-connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

function denied(request: Request) {
  if (process.env.AI_OS_ENABLED !== "true") return NextResponse.json({ error: "Not available" }, { status: 404, headers });
  if (!secretMatches(request.headers.get("authorization"), process.env.AI_OS_OWNER_KEY ? `Bearer ${process.env.AI_OS_OWNER_KEY}` : undefined) || (process.env.AI_OS_OWNER_KEY?.length || 0) < 32) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  return null;
}

export async function GET(request: Request) {
  const error = denied(request); if (error) return error;
  try {
    const view = new URL(request.url).searchParams.get("view");
    if (view === "ai_connection") return NextResponse.json(await checkAIConnection(), { headers });
    if (view && view !== "readiness") return NextResponse.json({ error: "Unknown view" }, { status: 400, headers });
    return NextResponse.json(view === "readiness" ? await readiness() : await status(), { headers });
  }
  catch { return NextResponse.json({ error: "OS_STORE_UNAVAILABLE", message: "Verify the existing database and initialize the additive OS schema." }, { status: 503, headers }); }
}

export async function POST(request: Request) {
  const error = denied(request); if (error) return error;
  // Cookie auth is intentionally not accepted. Owner key stays server-side.
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415, headers });
  const text = await request.text();
  if (text.length > 12000) return NextResponse.json({ error: "Request too large" }, { status: 413, headers });
  let body;
  try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400, headers });
  try {
    if (body.operation === "device_link") return NextResponse.json(await createDeviceLink(new URL(request.url).origin), { headers });
    if (body.operation === "initialize") { await initializeOS(); return NextResponse.json({ initialized: true }, { headers }); }
    if (body.operation === "run") {
      const key = request.headers.get("idempotency-key");
      if (!key || !/^[a-zA-Z0-9_-]{8,120}$/.test(key) || typeof body.message !== "string" || !body.message.trim() || body.message.length > 4000) return NextResponse.json({ error: "Message and unique Idempotency-Key required" }, { status: 400, headers });
      if (process.env.AI_OS_AI_ENABLED !== "true") return NextResponse.json({ error: "AI_DISABLED" }, { status: 503, headers });
      return NextResponse.json(await runCEO(key, body.message), { headers });
    }
    if (body.operation === "decide") {
      if (!/^[0-9a-f-]{36}$/.test(body.id || "") || !/^[0-9a-f]{64}$/.test(body.payloadHash || "") || !["approved", "declined", "revision_requested"].includes(body.decision) || typeof body.note !== "string" || body.note.length > 2000) return NextResponse.json({ error: "Invalid decision" }, { status: 400, headers });
      return NextResponse.json(await decide(body.id, body.payloadHash, body.decision, body.note), { headers });
    }
    return NextResponse.json({ error: "Unknown operation" }, { status: 400, headers });
  } catch {
    return NextResponse.json({ error: "OPERATION_NOT_COMPLETED", message: "Inspect owner status. A duplicate, busy run, expired approval, missing connection or service failure may have prevented completion." }, { status: 409, headers });
  }
}
