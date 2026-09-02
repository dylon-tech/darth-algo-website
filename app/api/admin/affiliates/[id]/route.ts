import { NextResponse } from "next/server";
import { db, ensureAffiliateSchema } from "../../../../lib/affiliate-db";
import { stripe } from "../../../../lib/stripe";

function authorized(request:Request){const expected=process.env.AFFILIATE_ADMIN_KEY;return Boolean(expected&&request.headers.get('x-admin-key')===expected)}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!authorized(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureAffiliateSchema(); const {id}=await params; const {action}=await request.json();
  const [affiliate]=await db()`select * from affiliate_applications where id=${id}`;
  if(!affiliate)return NextResponse.json({error:'Application not found'},{status:404});
  if(action==='approve'){
    if(!affiliate.stripe_promotion_code_id){
      const coupon=await stripe().coupons.create({percent_off:affiliate.commission_rate_bps/100,duration:'forever',name:`Darth Algo affiliate — ${affiliate.full_name}`,metadata:{affiliate_id:id}});
      const promotion=await stripe().promotionCodes.create({coupon:coupon.id,code:affiliate.preferred_code,metadata:{affiliate_id:id}});
      await db()`update affiliate_applications set status='approved',stripe_coupon_id=${coupon.id},stripe_promotion_code_id=${promotion.id},approved_at=now(),updated_at=now() where id=${id}`;
    }
  }else if(['decline','pause'].includes(action)){
    const status=action==='decline'?'declined':'paused';
    if(affiliate.stripe_promotion_code_id)await stripe().promotionCodes.update(affiliate.stripe_promotion_code_id,{active:false});
    await db()`update affiliate_applications set status=${status},updated_at=now() where id=${id}`;
  }else{return NextResponse.json({error:'Invalid action'},{status:400});}
  return NextResponse.json({ok:true});
}
