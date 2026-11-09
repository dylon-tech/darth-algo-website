import { ownerSessionFromRequest, privateHeaders } from "../../../lib/business-os/owner-session";
import { subscriptionActivationSnapshot } from "../../../lib/subscription-activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!ownerSessionFromRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: privateHeaders });
  }
  try {
    const queue = await subscriptionActivationSnapshot();
    return Response.json({ ...queue, checkedAt: new Date().toISOString() }, { headers: privateHeaders });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: privateHeaders });
  }
}
