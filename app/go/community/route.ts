import { NextRequest, NextResponse } from "next/server";
import { getGrowthInvite, normalizeCampaign, normalizeGrowthSource, trackGrowthEvent } from "../../lib/growth-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const source = normalizeGrowthSource(request.nextUrl.searchParams.get("source"));
  const campaign = normalizeCampaign(request.nextUrl.searchParams.get("campaign"));
  const visitorId = request.cookies.get("da_growth_visitor")?.value || null;
  const invite = await getGrowthInvite(source);
  await trackGrowthEvent({ eventType: "outbound_click", source, campaign, visitorId });
  return NextResponse.redirect(invite, { status: 307, headers: { "Cache-Control": "no-store" } });
}
