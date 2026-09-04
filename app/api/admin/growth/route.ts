import { NextResponse } from "next/server";
import { db } from "../../../lib/affiliate-db";
import { ensureGrowthSchema } from "../../../lib/growth-db";

function authorized(request: Request) {
  const expected = process.env.AFFILIATE_ADMIN_KEY;
  return Boolean(expected && request.headers.get("x-admin-key") === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureGrowthSchema();
  const sources = await db()`
    select
      source,
      count(*) filter (where event_type='page_view')::int as page_views,
      count(distinct visitor_id) filter (where event_type='page_view' and visitor_id is not null)::int as unique_visitors,
      count(*) filter (where event_type='outbound_click')::int as outbound_clicks,
      count(*) filter (where event_type='telegram_join')::int as telegram_joins
    from community_growth_events
    where created_at >= now() - interval '90 days'
    group by source
    order by telegram_joins desc,outbound_clicks desc,page_views desc
  `;
  const campaigns = await db()`
    select source,campaign,
      count(*) filter (where event_type='page_view')::int as page_views,
      count(*) filter (where event_type='outbound_click')::int as outbound_clicks,
      count(*) filter (where event_type='telegram_join')::int as telegram_joins
    from community_growth_events
    where created_at >= now() - interval '90 days'
    group by source,campaign
    order by telegram_joins desc,outbound_clicks desc,page_views desc
    limit 50
  `;
  const daily = await db()`
    select created_at::date::text as day,
      count(*) filter (where event_type='page_view')::int as page_views,
      count(*) filter (where event_type='outbound_click')::int as outbound_clicks,
      count(*) filter (where event_type='telegram_join')::int as telegram_joins
    from community_growth_events
    where created_at >= current_date - interval '29 days'
    group by created_at::date
    order by created_at::date
  `;
  const links = await db()`select source,invite_name,active,created_at,updated_at from community_growth_sources order by source`;
  return NextResponse.json({ sources, campaigns, daily, links, windowDays: 90 });
}
