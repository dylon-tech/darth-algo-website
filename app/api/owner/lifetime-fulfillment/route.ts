import { ownerSessionFromRequest, privateHeaders } from "../../../lib/business-os/owner-session";
import { lifetimeQueueSnapshot } from "../../../lib/lifetime-fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!ownerSessionFromRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: privateHeaders });
  }
  try {
    const snapshot = await lifetimeQueueSnapshot();
    return Response.json({ ...snapshot, checkedAt: new Date().toISOString() }, { headers: privateHeaders });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: privateHeaders });
  }
}
