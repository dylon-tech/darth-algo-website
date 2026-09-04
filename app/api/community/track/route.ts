import { NextResponse } from "next/server";
import { trackGrowthEvent } from "../../../lib/growth-db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { source?: string; campaign?: string; visitorId?: string };
    await trackGrowthEvent({
      eventType: "page_view",
      source: body.source,
      campaign: body.campaign,
      visitorId: body.visitorId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Community tracking error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
