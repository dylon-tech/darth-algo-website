import { secretMatches } from "../../../lib/business-os/policy";
import { coordinationTick } from "../../../lib/business-os/coordination";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (process.env.AI_OS_ENABLED !== "true") return Response.json({ error: "Not available" }, { status: 404, headers });
  if (!secretMatches(request.headers.get("authorization"), process.env.AI_OS_WORKER_KEY ? `Bearer ${process.env.AI_OS_WORKER_KEY}` : undefined) || (process.env.AI_OS_WORKER_KEY?.length || 0) < 32)
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  const workerId = request.headers.get("x-worker-id") || "worker";
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(workerId)) return Response.json({ error: "Invalid worker ID" }, { status: 400, headers });
  try { return Response.json(await coordinationTick(workerId), { headers }); }
  catch { return Response.json({ error: "WORKER_STORE_UNAVAILABLE" }, { status: 503, headers }); }
}
