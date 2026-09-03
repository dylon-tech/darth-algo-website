import { createHash, randomUUID } from "crypto";
import Stripe from "stripe";
import { db, ensureAffiliateSchema } from "../../../lib/affiliate-db";
import { stripe } from "../../../lib/stripe";

type DiscountLike={promotion_code?:string|{id:string}|null};
type AffiliateStripeObject={discounts?:Array<string|DiscountLike>;amount_paid?:number;amount_total?:number;amount_refunded?:number;customer?:string|{id:string}|null;customer_details?:{email?:string|null}|null;customer_email?:string|null;payment_intent?:string|{id:string}|null;charge?:string|{id:string}|null;currency?:string;mode?:string};
const idOf=(value:unknown)=>typeof value==='string'?value:(value&&typeof value==='object'&&'id' in value?String(value.id):'');
function promotionId(discounts:AffiliateStripeObject['discounts']){for(const item of discounts??[]){if(typeof item==='string')continue;const value=item.promotion_code;if(value)return typeof value==='string'?value:value.id;}return null;}
function customerKey(object:AffiliateStripeObject){const customerId=idOf(object.customer);if(customerId)return `stripe:${customerId}`;const email=(object.customer_details?.email??object.customer_email??'').trim().toLowerCase();return email?`email:${createHash('sha256').update(email).digest('hex')}`:'';}

export async function POST(request:Request){
  const signature=request.headers.get('stripe-signature');const secret=process.env.STRIPE_AFFILIATE_WEBHOOK_SECRET;
  if(!signature||!secret)return new Response('Webhook not configured',{status:503});
  let event:Stripe.Event;try{event=stripe().webhooks.constructEvent(await request.text(),signature,secret);}catch{return new Response('Invalid signature',{status:400});}
  await ensureAffiliateSchema();
  if(event.type==='checkout.session.completed'||event.type==='invoice.paid'){
    const object=event.data.object as unknown as AffiliateStripeObject;const promoId=promotionId(object.discounts);
    if(promoId){const[affiliate]=await db()`select id,commission_rate_bps from affiliate_applications where stripe_promotion_code_id=${promoId} and status='approved'`;if(affiliate){const gross=event.type==='invoice.paid'?(object.amount_paid??0):(object.amount_total??0);const firstCustomerKey=customerKey(object);if(gross>0&&firstCustomerKey){const commission=Math.round(gross*affiliate.commission_rate_bps/10000);await db()`insert into affiliate_commissions(id,affiliate_id,stripe_event_id,stripe_customer_id,customer_key,stripe_payment_id,gross_cents,commission_cents,currency,payable_at) values(${randomUUID()},${affiliate.id},${event.id},${idOf(object.customer)},${firstCustomerKey},${idOf(object.payment_intent??object.charge)},${gross},${commission},${object.currency??'usd'},now()+interval '30 days') on conflict do nothing`;}}}
  }else if(event.type==='charge.refunded'){
    const charge=event.data.object as Stripe.Charge;
    const inserted=await db()`insert into affiliate_webhook_events(stripe_event_id) values(${event.id}) on conflict do nothing returning stripe_event_id`;
    if(inserted.length){const paymentId=idOf(charge.payment_intent)||charge.id;await db()`update affiliate_commissions set refunded_cents=${charge.amount_refunded},commission_cents=greatest(0,round((gross_cents-${charge.amount_refunded})*(commission_cents::numeric/nullif(gross_cents,0))))::int,status=case when ${charge.amount_refunded}>=gross_cents then 'reversed' else status end where stripe_payment_id in (${paymentId},${charge.id})`;}
  }
  return Response.json({received:true});
}
