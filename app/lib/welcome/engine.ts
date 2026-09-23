import {randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {ensureWelcomeSchema} from './schema';
import {contactKey, gate, intent, message, opening, retryDelay, type Platform} from './policy';
import {classifySupport} from '../business-os/support-classifier';
export type Incoming={platform:Platform;account:string;recipient:string;eventId:string;at:number;kind:'message'|'follower'|'opt_in';text?:string;windowUntil:number};
export type SendResult={status:'accepted'|'delivered';id:string}|{status:'rejected';retryable:boolean;retryAfter?:number;reason:string}|{status:'unknown'};
export interface WelcomeAdapter {
 platform:Platform;
 // Implement only against a documented, account-tested provider. No browser DMs.
 check(account:string,recipient:string):Promise<{eligible:boolean;credentialExpires:number|null;windowUntil:number;optedOut:boolean}>;
 send(account:string,recipient:string,text:string):Promise<SendResult>;
}
// No production messaging adapter is registered until account-level verification.
// Provider-native owners never enter the backend sender.
export const productionAdapters:ReadonlyArray<WelcomeAdapter>=[];
export async function ingestVerifiedEvent(e:Incoming){
 if(!['instagram','x','tiktok'].includes(e.platform)||![e.account,e.recipient,e.eventId].every(x=>typeof x==='string'&&x.length>0&&x.length<=200)||!Number.isFinite(e.at)||e.at>Date.now()+30000||e.at<Date.now()-86400000||!Number.isFinite(e.windowUntil)||e.windowUntil>e.at+86400000||!['message','follower','opt_in'].includes(e.kind)||(e.text?.length||0)>4000)throw Error('INVALID_EVENT');
 await ensureWelcomeSchema();const sql=db(),key=contactKey(e.platform,e.account,e.recipient),kind=e.kind==='message'?intent(e.text||''):e.kind;
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${key},0))`;
  const [p]=await tx`select * from os_welcome_platforms where platform=${e.platform}`;
  if(!p||p.account_id!==e.account)return {status:'account_mismatch'};
  const added=await tx`insert into os_welcome_events(platform,account_id,event_id,contact_key,kind,occurred_at) values(${e.platform},${e.account},${e.eventId},${key},${kind},${new Date(e.at)}) on conflict do nothing returning event_id`;
  if(!added.length)return {status:'duplicate'};
  await tx`insert into os_welcome_contacts(contact_key,platform,account_id,recipient_id) values(${key},${e.platform},${e.account},${e.recipient}) on conflict(contact_key) do update set recipient_id=excluded.recipient_id`;
  await tx`update os_welcome_platforms set last_event_at=now() where platform=${e.platform}`;
  if(kind==='stop'){
   await tx`update os_welcome_contacts set opted_out=true,last_event_at=${new Date(e.at)} where contact_key=${key}`;
   await tx`update os_welcome_outbox set status='suppressed',reason='opted_out' where contact_key=${key} and status='queued'`;
   return {status:'suppressed'};
  }
  const [c]=await tx`select * from os_welcome_contacts where contact_key=${key} for update`;
  if(c.opted_out)return {status:'suppressed'}; // WELCOME is not automatic re-subscription after STOP.
  if(kind==='support'){
   const category=classifySupport('',e.text||'');
   // All uncertain, billing, complaint and trading-advice replies stay human-routed.
   await tx`insert into os_support_conversations(id,provider,provider_thread_id,customer_key,category,status,subject,last_message_at,summary,requires_founder) values(${randomUUID()},${e.platform},${'welcome:'+key},${key},${category},'escalated','Welcome Agent question',now(),${(e.text||'').slice(0,2000)},true) on conflict(provider_thread_id) do update set category=excluded.category,status='escalated',last_message_at=now(),summary=excluded.summary,requires_founder=true`;
   return {status:'support_routed'};
  }
  // Only an account-verified Instagram provider may own a follower trigger.
  // Native provider workflows own their own sending; this inbox is observation only.
  if(p.sending_owner!=='backend')return {status:'provider_owned_or_unconnected'};
  if(kind==='follower')return {status:'follower_requires_verified_native_provider'};
  const automatic=kind==='opt_in';
  if(automatic&&!c.automatic_started)return {status:'no_verified_opener'};
  await tx`update os_welcome_contacts set window_until=greatest(window_until,${new Date(e.windowUntil)}),last_event_at=greatest(last_event_at,${new Date(e.at)}) where contact_key=${key}`;
  const requestKey=automatic?`${key}:automatic:offer`:`${key}:request:${e.eventId}`;
  await tx`insert into os_welcome_outbox(id,contact_key,request_key,automatic,stage,message_version,body) values(${randomUUID()},${key},${requestKey},${automatic},'offer',${p.message_version},${p.message||message(e.platform)}) on conflict do nothing`;
  return {status:'queued'};
 });
}
export async function runWelcomeQueue(adapter:WelcomeAdapter){
 await ensureWelcomeSchema();const sql=db();
 // A lost response or crashed process must never automatically re-send.
 await sql`update os_welcome_outbox set status='unknown',reason='lease_expired_reconcile_provider' where status='sending' and claimed_at<now()-interval '2 minutes'`;
 const claimed=await sql.begin(async tx=>{
  const [j]=await tx`select o.id,o.contact_key from os_welcome_outbox o join os_welcome_contacts c using(contact_key) where o.status='queued' and o.next_attempt_at<=now() and c.platform=${adapter.platform} order by o.created_at for update of o skip locked limit 1`;
  if(!j)return null;
  await tx`select pg_advisory_xact_lock(hashtextextended(${j.contact_key},0))`;
  const [row]=await tx`update os_welcome_outbox set status='sending',attempts=attempts+1,claimed_at=now() where id=${j.id} and status='queued' returning *`;
  return row||null;
 });
 if(!claimed)return {status:'idle'};
 const [contact]=await sql`select * from os_welcome_contacts where contact_key=${claimed.contact_key}`;
 let checked:Awaited<ReturnType<WelcomeAdapter['check']>>;
 try {checked=await adapter.check(contact.account_id,contact.recipient_id);}catch{
  await sql`update os_welcome_outbox set status=${claimed.attempts>=4?'failed':'queued'},reason='preflight_failed',next_attempt_at=now()+${retryDelay(claimed.attempts)}*interval '1 second' where id=${claimed.id}`;return {status:'preflight_failed'};
 }
 // STOP, pause, config/terms changes and expiry are re-read immediately before send.
 const allowed=await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${claimed.contact_key},0))`;
  const [c]=await tx`select * from os_welcome_contacts where contact_key=${claimed.contact_key}`;
  const [p]=await tx`select * from os_welcome_platforms where platform=${adapter.platform} for update`;
  const [discount]=await tx`select details,checked_at from os_welcome_checks where id='discount'`;
  const [control]=await tx`select paused from os_control where id=1`;
  const reason=claimed.message_version!==p.message_version?'message_changed':gate({paused:p.paused||control?.paused!==false,owner:p.sending_owner,connected:p.connected,eligible:p.eligible&&checked.eligible,verifiedUntil:new Date(p.verified_until||0).getTime(),credentialExpires:checked.credentialExpires,discountVerified:discount?.details?.ready===true&&Date.now()-new Date(discount.checked_at).getTime()<900000,optedOut:c.opted_out||checked.optedOut,windowUntil:Math.min(new Date(c.window_until||0).getTime(),checked.windowUntil),now:Date.now()});
  if(reason){await tx`update os_welcome_outbox set status='suppressed',reason=${reason} where id=${claimed.id}`;return false;}
  return true;
 });
 if(!allowed)return {status:'suppressed'};
 let result:SendResult;try{result=await adapter.send(contact.account_id,contact.recipient_id,claimed.body);}catch{result={status:'unknown'};}
 if(result.status==='accepted'||result.status==='delivered'){
  if(!result.id){result={status:'unknown'};}else{await sql`update os_welcome_outbox set status=${result.status},provider_id=${result.id},sent_at=now() where id=${claimed.id}`;return {status:result.status};}
 }
 if(result.status==='rejected'){
  const retry=result.retryable&&claimed.attempts<4;
  await sql`update os_welcome_outbox set status=${retry?'queued':'failed'},reason=${result.reason.replace(/[^a-z0-9_]/gi,'').slice(0,80)},next_attempt_at=now()+${retryDelay(claimed.attempts,result.retryAfter)}*interval '1 second' where id=${claimed.id}`;
  return {status:retry?'retry_scheduled':'failed'};
 }
 await sql`update os_welcome_outbox set status='unknown',reason='provider_result_unknown' where id=${claimed.id}`;return {status:'unknown'};
}
export {opening};
