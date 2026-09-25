import {randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {stripe} from '../stripe';
import {retentionClassification} from './retention-policy';
export {classifySupport,categoryNeedsFounder,supportCategories} from './support-classifier';

export const revenueOpsSchema=`
create table if not exists os_support_conversations (
 id uuid primary key, provider text not null, provider_thread_id text not null unique,
 customer_key text, category text not null,
 status text not null default 'open' check(status in ('open','waiting_customer','escalated','resolved','spam')),
 subject text, last_message_at timestamptz not null, summary text,
 requires_founder boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists os_support_open on os_support_conversations(status,last_message_at desc) where status in ('open','escalated');
create table if not exists os_retention_opportunities (
 id uuid primary key, opportunity_key text not null unique, stripe_customer_id text not null,
 subscription_id text, reason text not null,
 status text not null default 'open' check(status in ('open','contact_ready','contacted','recovered','closed')),
 authorized_offer text, last_contact_at timestamptz, recovered_at timestamptz,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists os_retention_open on os_retention_opportunities(status,updated_at desc) where status in ('open','contact_ready','contacted');
create table if not exists os_retention_reviews (
 id uuid primary key, opportunity_id uuid not null references os_retention_opportunities(id),
 draft_hash text not null, recipient text not null, subject text not null, body text not null,
 invoice_id text not null, state text not null default 'draft_ready'
 check(state in ('draft_ready','awaiting_approval','approved','sent','outcome_pending','resolved','suppressed','outcome_unknown')),
 eligibility jsonb not null default '{}', provider_receipt jsonb, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(opportunity_id,draft_hash));`;

export async function ensureRevenueOpsSchema(){await db().begin(async tx=>{await tx`select pg_advisory_xact_lock(730936)`;await tx.unsafe(revenueOpsSchema);});}

export async function syncRetentionOpportunities(){
 await ensureRevenueOpsSchema();const sql=db();
 const [recent]=await sql`select details from os_activity where event='retention_sync' and details->>'version'='2' and created_at>now()-interval '15 minutes' order by id desc limit 1`;
 if(recent)return {status:'recently_checked',...recent.details};
 let subscriptions:Awaited<ReturnType<ReturnType<typeof stripe>['subscriptions']['list']>>['data'];
 let hasMore=false;
 try{const batch=await stripe().subscriptions.list({status:'all',limit:100,expand:['data.latest_invoice']},{timeout:7000,maxNetworkRetries:0});subscriptions=batch.data;hasMore=batch.has_more;}
 catch{await sql`insert into os_activity(actor,event,details) values('retention','retention_sync',${sql.json({version:2,status:'stripe_unavailable',checkedAt:new Date().toISOString()})})`;return {status:'stripe_unavailable'};}
 let open=0,resolved=0,suppressed=0;
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730937)`;
  for(const sub of subscriptions){
   if(!sub.livemode)continue;const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
   const classification=retentionClassification(sub),reason=classification.reason;
   const key=`stripe-subscription:${sub.id}`;
   if(reason){if(classification.state==='suppressed')suppressed++;else open++;
    const i=classification.invoice;
    await tx`insert into os_retention_opportunities(id,opportunity_key,stripe_customer_id,subscription_id,reason,status,authorized_offer,details)
    values(${randomUUID()},${key},${customer},${sub.id},${reason},${classification.state==='suppressed'?'closed':'open'},null,${tx.json({workflowState:classification.state,subscriptionStatus:sub.status,cancelAtPeriodEnd:sub.cancel_at_period_end===true,verifiedAt:new Date().toISOString(),failureInvoiceId:i?.id||null,invoiceStatus:i?.status||null,eligibility:'Not verified against email, suppression and access history. No send authorization.',resolution:classification.resolution} as never)})
    on conflict(opportunity_key) do update set reason=excluded.reason,details=os_retention_opportunities.details||excluded.details,updated_at=now(),status=case when os_retention_opportunities.status in ('recovered','closed','contacted') then os_retention_opportunities.status else excluded.status end`;
    if(classification.state==='suppressed')await tx`update os_retention_reviews set state='suppressed',updated_at=now() where opportunity_id in(select id from os_retention_opportunities where opportunity_key=${key}) and state in ('draft_ready','awaiting_approval','approved')`;
   }else if(['active','trialing'].includes(sub.status)){
    const changed=await tx`update os_retention_opportunities set status='closed',details=details||${tx.json({workflowState:'resolved',subscriptionStatus:sub.status,verifiedAt:new Date().toISOString(),resolution:classification.resolution,recoveredRevenueCents:null,outreachAttribution:null})},updated_at=now() where opportunity_key=${key} and status in ('open','contact_ready','contacted') returning id`;resolved+=changed.length;
    await tx`update os_retention_reviews set state='resolved',updated_at=now() where opportunity_id in(select id from os_retention_opportunities where opportunity_key=${key}) and state in ('draft_ready','awaiting_approval','approved')`;
   }
  }
  await tx`insert into os_activity(actor,event,details) values('retention','retention_sync',${tx.json({version:2,status:'checked',open,resolved,suppressed,recovered:0,checkedAt:new Date().toISOString(),subscriptionsChecked:subscriptions.length,hasMore,scope:'Latest 100 live Stripe subscriptions; cancellations held, active/trial status is not recovered revenue. No email sent.'})})`;
 });
 return {status:'checked',open,resolved,suppressed,recovered:0,subscriptionsChecked:subscriptions.length,hasMore};
}
