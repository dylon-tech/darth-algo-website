import { NextResponse } from "next/server";
import { db, ensureAffiliateSchema } from "../../../lib/affiliate-db";

function authorized(request:Request){const expected=process.env.AFFILIATE_ADMIN_KEY;return Boolean(expected&&request.headers.get('x-admin-key')===expected)}

export async function GET(request:Request){
  if(!authorized(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureAffiliateSchema();
  const applications=await db()`select id,created_at,status,full_name,email,tradingview_username,primary_platform,profile_url,audience_size,content_plan,preferred_code,payout_method,payout_handle,commission_rate_bps from affiliate_applications order by created_at desc`;
  return NextResponse.json({applications});
}
