import { NextResponse } from "next/server";
import { db, ensureAffiliateSchema } from "../../../lib/affiliate-db";

function authorized(request:Request){const expected=process.env.AFFILIATE_ADMIN_KEY;return Boolean(expected&&request.headers.get('x-admin-key')===expected)}

export async function GET(request:Request){
  if(!authorized(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureAffiliateSchema();
  const applications=await db()`
    select
      a.id,
      a.created_at,
      a.status,
      a.full_name,
      a.email,
      a.dashboard_username,
      a.social_media_handle,
      a.preferred_code,
      a.commission_rate_bps,
      count(distinct c.customer_key) filter (where c.customer_key is not null)::int as new_customers,
      coalesce(sum(greatest(c.gross_cents-c.refunded_cents,0)) filter (where c.customer_key is not null),0)::int as first_purchase_revenue_cents,
      coalesce(sum(c.commission_cents) filter (where c.customer_key is not null and c.status='holding'),0)::int as pending_commission_cents,
      coalesce(sum(c.commission_cents) filter (where c.customer_key is not null and c.status='payable'),0)::int as payable_commission_cents,
      coalesce(sum(c.commission_cents) filter (where c.customer_key is not null and c.status='paid'),0)::int as paid_commission_cents
    from affiliate_applications a
    left join affiliate_commissions c on c.affiliate_id=a.id
    group by a.id
    order by a.created_at desc
  `;
  return NextResponse.json({applications});
}
