import {randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {stripe} from '../stripe';
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
create index if not exists os_retention_open on os_retention_opportunities(status,updated_at desc) where status in ('open','contact_ready','contacted');`;

export async function ensureRevenueOpsSchema(){await db().begin(async tx=>{await tx`select pg_advisory_xact_lock(730936)`;await tx.unsafe(revenueOpsSchema);});}

export async function syncRetentionOpportunities(){
 await ensureRevenueOpsSchema();const sql=db();
 const [recent]=await sql`select details from os_activity where event='retention_sync' and created_at>now()-interval '15 minutes' order by id desc limit 1`;
 if(recent)return {status:'recently_checked',...recent.details};
 let subscriptions:Awaited<ReturnType<ReturnType<typeof stripe>['subscriptions']['list']>>['data'];
 try{subscriptions=(await stripe().subscriptions.list({status:'all',limit:100},{timeout:7000,maxNetworkRetries:0})).data;}
 catch{await sql`insert into os_activity(actor,event,details) values('retention','retention_sync',${sql.json({status:'stripe_unavailable',checkedAt:new Date().toISOString()})})`;return {status:'stripe_unavailable'};}
 let open=0,recovered=0;
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730937)`;
  for(const sub of subscriptions){
   if(!sub.livemode)continue;const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
   const reason=sub.status==='past_due'||sub.status==='unpaid'?'failed_payment':sub.status==='canceled'?'cancellation':null;
   const key=`stripe-subscription:${sub.id}`;
   if(reason){open++;await tx`insert into os_retention_opportunities(id,opportunity_key,stripe_customer_id,subscription_id,reason,status,authorized_offer,details)
    values(${randomUUID()},${key},${customer},${sub.id},${reason},'contact_ready',${reason==='failed_payment'?'Restore access after successful payment; no unapproved discount.':null},${tx.json({subscriptionStatus:sub.status,cancelAtPeriodEnd:sub.cancel_at_period_end===true} as never)})
    on conflict(opportunity_key) do update set reason=excluded.reason,details=excluded.details,updated_at=now(),status=case when os_retention_opportunities.status in ('recovered','closed') then os_retention_opportunities.status else 'contact_ready' end`;
   }else if(['active','trialing'].includes(sub.status)){
    const changed=await tx`update os_retention_opportunities set status='recovered',recovered_at=now(),updated_at=now() where opportunity_key=${key} and status in ('open','contact_ready','contacted') returning id`;recovered+=changed.length;
   }
  }
  await tx`insert into os_activity(actor,event,details) values('retention','retention_sync',${tx.json({status:'checked',open,recovered,checkedAt:new Date().toISOString(),scope:'Latest 100 live Stripe subscriptions; no email sent.'})})`;
 });
 return {status:'checked',open,recovered};
}
