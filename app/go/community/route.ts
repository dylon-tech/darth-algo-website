import { NextRequest, NextResponse } from "next/server";
import { getGrowthInvite, normalizeCampaign, normalizeGrowthSource, trackGrowthEvent } from "../../lib/growth-db";

export const dynamic = "force-dynamic";

function communityFallback() {
  return process.env.TELEGRAM_COMMUNITY_URL || "https://www.darthalgo.com/community";
}

export async function GET(request: NextRequest) {
  const source = normalizeGrowthSource(request.nextUrl.searchParams.get("source"));
  const campaign = normalizeCampaign(request.nextUrl.searchParams.get("campaign"));
  const visitorId = request.cookies.get("da_growth_visitor")?.value || null;
  let invite = communityFallback();
  try {
    invite = await getGrowthInvite(source);
  } catch {
    console.warn(JSON.stringify({ event: "growth_invite_unavailable", source }));
  }
  try {
    await trackGrowthEvent({ eventType: "outbound_click", source, campaign, visitorId });
  } catch {
    console.warn(JSON.stringify({ event: "growth_event_unavailable", eventType: "outbound_click", source }));
  }
  return NextResponse.redirect(invite, { status: 307, headers: { "Cache-Control": "no-store" } });
}
