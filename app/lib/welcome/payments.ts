import Stripe from 'stripe';
import {db} from '../affiliate-db';
import {stripe} from '../stripe';
import {ensureWelcomeSchema} from './schema';
import {parseCampaignReference} from '../campaign-attribution';
import {netRevenue} from './policy';
const idOf=(v:unknown):string|null=>typeof v==='string'?v:v&&typeof v==='object'&&'id' in v?String(v.id):null;
export async function captureWelcomeStripeEvent(event:Stripe.Event){
 if(!event.livemode||!['checkout.session.completed','invoice.paid','charge.refunded'].includes(event.type))return;
 await ensureWelcomeSchema();const id=idOf(event.data.object);if(!id)return;
 await db()`insert into os_welcome_stripe_inbox(event_id,event_type,object_id) values(${event.id},${event.type},${id}) on conflict do nothing`;
}
async function sourceFor(reference:string|null,created:number){
 const sql=db();
 if(reference?.startsWith('daw_')&&/^daw_[a-f0-9-]{36}$/.test(reference)){
  const [v]=await sql`select id,platform from os_welcome_visits where not is_test and id=${reference.slice(4)}::uuid and created_at<=${new Date(created*1000)} and created_at>${new Date(created*1000-30*86400000)}`;
  if(v)return {source:v.platform as string,visit:v.id as string};
 }
 const a=parseCampaignReference(reference);return {source:a?.campaign==='welcome25'?a.source:null,visit:null};
}
async function usedWelcome(discounts:unknown,client:Stripe){
 if(!Array.isArray(discounts))return false;
 for(const d of discounts){if(!d||typeof d!=='object')continue;const promo=idOf(d.promotion_code);if(promo){const p=await client.promotionCodes.retrieve(promo,{},{timeout:5000,maxNetworkRetries:0});if(p.code.toUpperCase()==='WELCOME')return true;}}
 return false;
}
async function firstPaidCustomer(customer:string|null,charge:Stripe.Charge,client:Stripe):Promise<boolean|null>{
 if(!customer)return null;
 const history=await client.charges.list({customer,limit:100},{timeout:5000,maxNetworkRetries:0});
 if(history.has_more)return null;
 const others=history.data.filter(c=>c.id!==charge.id&&c.livemode&&c.paid&&c.captured&&c.amount_captured>0);
 if(others.some(c=>c.created<charge.created))return false;
 if(others.some(c=>c.created===charge.created))return null;
 return true;
}
async function recordSession(sessionId:string,client:Stripe){
 const session=await client.checkout.sessions.retrieve(sessionId,{expand:['discounts']},{timeout:5000,maxNetworkRetries:0});
 if(!session.livemode)return;
 const a=await sourceFor(session.client_reference_id,session.created);const sql=db(),sub=idOf(session.subscription);
 await sql`insert into os_welcome_journeys(session_id,subscription_id,source,visit_id) values(${session.id},${sub},${a.source},${a.visit}) on conflict(session_id) do update set source=excluded.source,visit_id=excluded.visit_id`;
 // Subscription invoices are the single accounting owner, including trial-to-paid.
 if(session.mode==='subscription'){if(session.invoice)await recordInvoice(idOf(session.invoice)!,client);return;}
 if(session.payment_status!=='paid'||!session.amount_total||!session.payment_intent)return;
 const welcome=await usedWelcome(session.discounts,client);if(!a.source&&!welcome)return;
 const intent=await client.paymentIntents.retrieve(idOf(session.payment_intent)!,{expand:['latest_charge']},{timeout:5000,maxNetworkRetries:0});
 const charge=intent.latest_charge as Stripe.Charge|null;
 if(intent.status!=='succeeded'||!charge||typeof charge==='string'||!charge.paid||!charge.captured||charge.amount_captured!==session.amount_total)throw Error('PAYMENT_RECONCILIATION_REQUIRED');
 await savePurchase({key:idOf(session.invoice)?'invoice:'+idOf(session.invoice):'session:'+session.id,customer:idOf(session.customer),sub:null,pi:intent.id,source:a.source,visit:a.visit,welcome,paid:charge.amount_captured,tax:session.total_details?.amount_tax??0,refunded:charge.amount_refunded,currency:session.currency!,at:charge.created,first:await firstPaidCustomer(idOf(session.customer),charge,client)});
}
async function recordInvoice(invoiceId:string,client:Stripe){
 const inv=await client.invoices.retrieve(invoiceId,{expand:['discounts','payments']},{timeout:5000,maxNetworkRetries:0});
 if(!inv.livemode||inv.status!=='paid'||inv.amount_paid<=0)return;
 const sub=idOf(inv.parent?.subscription_details?.subscription),sql=db();
 let [journey]=sub?await sql`select source,visit_id,created_at from os_welcome_journeys where subscription_id=${sub}`:[];
 if(!journey&&sub){const sessions=await client.checkout.sessions.list({subscription:sub,limit:2},{timeout:5000,maxNetworkRetries:0});if(sessions.has_more)throw Error('SESSION_COVERAGE_INCOMPLETE');const session=sessions.data[0];if(session){const a=await sourceFor(session.client_reference_id,session.created);journey={source:a.source,visit_id:a.visit,created_at:new Date(session.created*1000)};await sql`insert into os_welcome_journeys(session_id,subscription_id,source,visit_id) values(${session.id},${sub},${a.source},${a.visit}) on conflict do nothing`;}}
 if(journey&&inv.created*1000-new Date(journey.created_at).getTime()>30*86400000)journey={source:null,visit_id:null};
 const welcome=await usedWelcome(inv.discounts,client);if(!journey?.source&&!welcome)return;
 const payments=await client.invoicePayments.list({invoice:inv.id,status:'paid',limit:100},{timeout:5000,maxNetworkRetries:0});
 if(payments.has_more||payments.data.length!==1||payments.data[0].payment.type!=='payment_intent')throw Error('PAYMENT_ALLOCATION_UNVERIFIED');
 const pi=idOf(payments.data[0].payment.payment_intent);if(!pi)throw Error('PAYMENT_NOT_VERIFIED');
 const intent=await client.paymentIntents.retrieve(pi,{expand:['latest_charge']},{timeout:5000,maxNetworkRetries:0});const charge=intent.latest_charge as Stripe.Charge|null;
 if(intent.status!=='succeeded'||!charge||typeof charge==='string'||!charge.paid||!charge.captured||charge.amount_captured!==inv.amount_paid||inv.amount_paid!==inv.total)throw Error('PAYMENT_ALLOCATION_UNVERIFIED');
 const customer=idOf(inv.customer),first=await firstPaidCustomer(customer,charge,client);
 await savePurchase({key:'invoice:'+inv.id,customer,sub,pi,source:journey?.source??null,visit:journey?.visit_id??null,welcome,paid:charge.amount_captured,tax:(inv.total_taxes||[]).reduce((s,t)=>s+t.amount,0),refunded:charge.amount_refunded,currency:inv.currency,at:inv.status_transitions.paid_at??inv.created,first});
}
export type Purchase={key:string;customer:string|null;sub:string|null;pi:string;source:string|null;visit:string|null;welcome:boolean;paid:number;tax:number;refunded:number;currency:string;at:number;first:boolean|null};
export async function savePurchase(p:Purchase){const sql=db();await sql`insert into os_welcome_purchases(payment_key,customer_id,subscription_id,payment_intent_id,source,visit_id,welcome_code,paid_cents,tax_cents,refunded_cents,currency,paid_at,first_paid,net_cents) values(${p.key},${p.customer},${p.sub},${p.pi},${p.source},${p.visit},${p.welcome},${p.paid},${p.tax},${p.refunded},${p.currency},${new Date(p.at*1000)},${p.first},${netRevenue(p.paid,p.tax,p.refunded,null)}) on conflict(payment_key) do update set source=coalesce(excluded.source,os_welcome_purchases.source),visit_id=coalesce(excluded.visit_id,os_welcome_purchases.visit_id),welcome_code=excluded.welcome_code or os_welcome_purchases.welcome_code,refunded_cents=greatest(excluded.refunded_cents,os_welcome_purchases.refunded_cents),first_paid=excluded.first_paid,net_cents=case when excluded.refunded_cents>=os_welcome_purchases.refunded_cents then excluded.net_cents else os_welcome_purchases.net_cents end,updated_at=now()`;}
export async function reconcileWelcomePayments(){
 await ensureWelcomeSchema();const sql=db();
 return sql.begin(async tx=>{
  const [lock]=await tx`select pg_try_advisory_xact_lock(730952) as acquired`;if(!lock.acquired)return {processed:0};
  const rows=await tx`select * from os_welcome_stripe_inbox where status='queued' and next_attempt_at<=now() order by created_at limit 1`;let processed=0;
  for(const row of rows)try{
   const client=stripe();
   if(row.event_type==='checkout.session.completed')await recordSession(row.object_id,client);
   if(row.event_type==='invoice.paid')await recordInvoice(row.object_id,client);
   if(row.event_type==='charge.refunded'){
    const c=await client.charges.retrieve(row.object_id,{},{timeout:5000,maxNetworkRetries:0}),pi=idOf(c.payment_intent);
    if(c.livemode&&pi){const purchases=await tx`select payment_key,paid_cents,tax_cents from os_welcome_purchases where payment_intent_id=${pi}`;
     if(!purchases.length){const invoices=await client.invoicePayments.list({payment:{type:'payment_intent',payment_intent:pi},limit:100},{timeout:5000,maxNetworkRetries:0});if(invoices.has_more)throw Error('COVERAGE_INCOMPLETE');for(const p of invoices.data)await recordInvoice(idOf(p.invoice)!,client);const sessions=await client.checkout.sessions.list({payment_intent:pi,limit:100},{timeout:5000,maxNetworkRetries:0});if(sessions.has_more)throw Error('COVERAGE_INCOMPLETE');for(const s of sessions.data)await recordSession(s.id,client);}
     const current=await tx`select payment_key,paid_cents,tax_cents from os_welcome_purchases where payment_intent_id=${pi}`;
     for(const p of current)await tx`update os_welcome_purchases set refunded_cents=greatest(refunded_cents,${c.amount_refunded}),net_cents=${netRevenue(Number(p.paid_cents),Number(p.tax_cents),c.amount_refunded,null)},updated_at=now() where payment_key=${p.payment_key}`;
    }
   }
   await tx`update os_welcome_stripe_inbox set status='done',attempts=attempts+1 where event_id=${row.event_id}`;processed++;
  }catch{await tx`update os_welcome_stripe_inbox set attempts=attempts+1,status=case when attempts>=3 then 'needs_review' else 'queued' end,next_attempt_at=now()+interval '10 minutes' where event_id=${row.event_id}`;}
  return {processed};
 });
}
