import {randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {stripe} from '../stripe';
import {ensureWelcomeSchema} from './schema';
import {capabilityInventory,ownerActions} from './inventory';
import {message,platforms,validateMessage,type Platform} from './policy';
import {productionAdapters,runWelcomeQueue} from './engine';
export async function verifyWelcomeDiscount(){
 const client=stripe();const promos=await client.promotionCodes.list({code:'WELCOME',active:true,limit:10},{timeout:6000,maxNetworkRetries:0});
 const p=promos.data.length===1?promos.data[0]:null;
 // SDK shape differs across API versions. Read the coupon through its supported API.
 const raw=p as unknown as {coupon?:string|{id:string};promotion?:{coupon?:string|{id:string}}}|null;
 const couponRef=raw?.coupon||raw?.promotion?.coupon;
 const id=typeof couponRef==='string'?couponRef:couponRef?.id;
 const c=id?await client.coupons.retrieve(id,{},{timeout:6000,maxNetworkRetries:0}):null;
 const details={ready:false,code:'WELCOME',active:p?.active===true,livemode:p?.livemode===true,percentOff:c?.percent_off??null,duration:c?.duration??null,firstTimeOnly:p?.restrictions.first_time_transaction??null,maxRedemptions:c?.max_redemptions??null,redeemed:c?.times_redeemed??null,expiresAt:p?.expires_at??null,productRestrictions:c?.applies_to?.products??null,reason:!p||!c?'WELCOME_NOT_VERIFIED':c.max_redemptions===1?'COUPON_LIMIT_ONE_TOTAL':'CHECKOUT_AND_TRIAL_TEST_REQUIRED',checkedAt:new Date().toISOString()};
 const sql=db();await sql`insert into os_welcome_checks(id,details) values('discount',${sql.json(details)}) on conflict(id) do update set details=excluded.details,checked_at=now()`;return details;
}
export async function welcomeSnapshot(){
 await ensureWelcomeSchema();const sql=db();
 const [rows,checks,outcomes,visits,purchases,inbox]=await Promise.all([
 sql`select platform,account_label,sending_owner,paused,mode,provider,connected,eligible,verified_until,credential_expires_at,last_event_at,message,message_version,evidence from os_welcome_platforms order by platform`,
 sql`select id,details,checked_at from os_welcome_checks`,
 sql`select c.platform,o.status,count(*)::int n from os_welcome_outbox o join os_welcome_contacts c using(contact_key) where (coalesce(o.sent_at,o.created_at) at time zone 'America/New_York')::date=(now() at time zone 'America/New_York')::date group by c.platform,o.status`,
 sql`select platform,count(*)::int visits,count(checkout_started_at)::int checkouts from os_welcome_visits where not is_test and created_at>now()-interval '30 days' group by platform`,
 sql`select source,currency,count(*)::int payments,count(distinct customer_id) filter(where first_paid=true)::int customers,sum(net_cents)::text net,count(*) filter(where net_cents is null)::int incomplete,sum(refunded_cents)::text refunds,count(*) filter(where welcome_code)::int redemptions from os_welcome_purchases where paid_at>now()-interval '30 days' group by source,currency`,
 sql`select count(*) filter(where status<>'done')::int pending from os_welcome_stripe_inbox`
 ]);
 const metricsReady=checks.some(c=>c.id==='payments'&&c.details?.verified===true);
 return {checkedAt:new Date().toISOString(),name:'Welcome Agent',department:'growth',timezone:'America/New_York',platforms:rows.map(p=>({platform:String(p.platform),account_label:String(p.account_label),sending_owner:String(p.sending_owner),connected:p.connected===true,last_event_at:p.last_event_at?String(p.last_event_at):null,message:p.message||message(p.platform as Platform),status:p.sending_owner==='none'?'Needs connection':p.mode==='pending_review'?'Pending platform review':p.paused?'Paused':'Tracking limited',inventory:capabilityInventory.find(x=>x.platform===p.platform),acceptedToday:p.sending_owner==='none'?null:outcomes.filter(o=>o.platform===p.platform&&['accepted','delivered'].includes(o.status)).reduce((s,o)=>s+o.n,0),deliveredToday:p.sending_owner==='none'?null:outcomes.find(o=>o.platform===p.platform&&o.status==='delivered')?.n??0,readReceipts:null})),checks,outcomes,visits,purchases:metricsReady?purchases:null,pendingPaymentEvents:inbox[0]?.pending??null,ownerActions,analytics:{sending:'No provider telemetry connected',visits:'Unique browser-tab visits over 30 days; not unique people. Client-controlled source labels; no cross-device joining.',conversionDenominator:'Verified first paid customers / observed unique browser-tab visits, 30-day cohort. Unavailable until payment coverage verified.',revenue:'Collected after discounts, excluding tax, less refunds. Partial refunds with unverified tax split make revenue unavailable. Fees and operating costs not deducted.',paidCoverage:metricsReady?'Verified events since activation; not full historical coverage':'Tracking limited — payment event coverage not yet verified'}};
}
export async function welcomeControl(platform:Platform,action:string,body?:unknown){
 if(!platforms.includes(platform))throw Error('INVALID_PLATFORM');await ensureWelcomeSchema();const sql=db();
 if(action==='pause'){await sql.begin(async tx=>{await tx`update os_welcome_platforms set paused=true,updated_at=now() where platform=${platform}`;await tx`update os_welcome_outbox set status='suppressed',reason='owner_paused' where status='queued' and contact_key in(select contact_key from os_welcome_contacts where platform=${platform})`;});return {message:'Paused. Queued offers cancelled. An already submitted message may complete.'};}
 if(action==='edit'){
  if(!validateMessage(body))throw Error('MESSAGE_MUST_KEEP_VERIFIED_OFFER_TERMS');
  await sql`update os_welcome_platforms set message=${body as string},message_version=message_version+1,paused=true,verified_until=null,updated_at=now() where platform=${platform}`;
  return {message:'Draft saved. Provider review and verification required before sending.'};
 }
 if(action==='test')return {message:'No message sent. Connect and verify the provider, discount and an owner-controlled test recipient first.',blocked:true};
 if(action==='resume')return {message:'Cannot resume: provider access, discount terms and controlled messaging test are not verified.',blocked:true};
 throw Error('INVALID_ACTION');
}
export async function welcomeTick(){
 await ensureWelcomeSchema();const sql=db();
 await sql`insert into os_tasks(id,department,title,priority,status,dedupe_key,evidence,result_kind,result) select ${randomUUID()},'growth','Activate Welcome Agent after discount and provider verification',1,'blocked','DA-WELCOME-20260923-v1','["docs/welcome/README.md","owner-request-2026-09-23"]'::jsonb,'activation_pending','Messaging is off. WELCOME has one total redemption; provider sign-ins and Stripe sandbox test remain required. See /owner/welcome.' where not exists(select 1 from os_tasks where dedupe_key='DA-WELCOME-20260923-v1') on conflict do nothing`;
 const shouldCheck=await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(730951)`;const [r]=await tx`select checked_at from os_welcome_checks where id='discount_attempt'`;if(r&&Date.now()-new Date(r.checked_at).getTime()<900000)return false;await tx`insert into os_welcome_checks(id,details) values('discount_attempt','{}') on conflict(id) do update set checked_at=now()`;return true;});
 if(shouldCheck)try{await verifyWelcomeDiscount();}catch{await sql`insert into os_welcome_checks(id,details) values('discount','{"ready":false,"reason":"STRIPE_CHECK_UNAVAILABLE"}') on conflict(id) do update set details=excluded.details,checked_at=now()`;}
 await sql`update os_welcome_outbox set status='unknown',reason='lease_expired_reconcile_provider' where status='sending' and claimed_at<now()-interval '2 minutes'`;
 await sql`update os_welcome_platforms set paused=true where credential_expires_at<now() or verified_until<now()`;
 // Bounded retention, preserving hashed opt-out/lifecycle tombstones.
 await sql`delete from os_welcome_events where created_at<now()-interval '90 days'`;
 await sql`delete from os_welcome_visits where created_at<now()-interval '90 days'`;
 await sql`update os_welcome_contacts set recipient_id=null where last_event_at<now()-interval '90 days' and not exists(select 1 from os_welcome_outbox o where o.contact_key=os_welcome_contacts.contact_key and o.status in ('queued','sending','unknown'))`;
 await sql`update os_welcome_outbox set body='[retained outcome only]' where created_at<now()-interval '90 days' and status in ('accepted','delivered','suppressed','failed') and body<>'[retained outcome only]'`;
 for(const adapter of productionAdapters)await runWelcomeQueue(adapter);
 return {status:'blocked',reason:'PROVIDER_CONNECTION_AND_DISCOUNT_REVIEW',sendingAdapters:productionAdapters.length};
}
export async function welcomeBrief(){try{const s=await welcomeSnapshot();const alerts=s.outcomes.filter(o=>['failed','unknown'].includes(o.status)).reduce((n,o)=>n+o.n,0);return `Welcome Agent · ${s.platforms.map(p=>p.platform+': '+p.status).join(' · ')}\nOffers accepted: unavailable · paid customers: unavailable · attributed revenue: unavailable\n${alerts?alerts+' failed/unknown sends need review. ':''}Needs you: discount and provider setup — /owner/welcome.`;}catch{return 'Welcome Agent · status unavailable; no sending is assumed.';}}
