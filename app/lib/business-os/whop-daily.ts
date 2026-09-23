import {createHash} from "node:crypto";
import {db} from "../affiliate-db";
import {createWhopHomePost,whopStatus,verifyWhopPost} from "./whop";
import {campaignKey,withinSocialWindow} from './social-schedule';
import {incidentCatchup} from './publishing-recovery-policy';
const sendWindow=(c:DailyCampaign,now=new Date())=>withinSocialWindow(c,now)||incidentCatchup(c,now);
import {campaignMatchesReview} from './reviewed-social';
import type {DailyCampaign} from "./daily-social-policy";

const dayKey=(day:string)=>`daily-whop:${day}`;

export async function syncDailyWhop(campaign:DailyCampaign, now=new Date()){
  if(process.env.VERCEL_ENV!=="production"||process.env.AI_OS_AUTONOMY_ENABLED!=="true"||process.env.WHOP_PUBLISHING_ENABLED==="false")return {state:"disabled",published:false};
  const sql=db(),key=dayKey(campaignKey(campaign));
  const [done]=await sql`select details from os_activity where event='whop_home_publish_receipt' and entity_id=${key} limit 1`;
  if(done)return {...done.details,state:"published",published:true};
  const [accepted]=await sql`select details from os_activity where event='whop_home_publish_accepted' and entity_id=${key} order by id desc limit 1`;
  if(accepted){
    const [recent]=await sql`select details from os_activity where event='whop_home_readback_pending' and entity_id=${key} and created_at>now()-interval '15 minutes' order by id desc limit 1`;
    if(recent)return {state:'readback_pending',published:false};
    return confirmWhop(key,campaign,accepted.details);
  }
  const [started]=await sql`select id from os_activity where event='whop_home_publish_started' and entity_id=${key} order by id desc limit 1`;
  const [failure]=await sql`select id,details from os_activity where event='whop_home_publish_unknown' and entity_id=${key} order by id desc limit 1`;
  // One corrected attempt only after a recorded 400 validation rejection. A
  // timeout, server error, or missing response continues to hold the send.
  const [repair]=await sql`select id from os_activity where event='whop_payload_repair_started' and entity_id=${key} limit 1`;
  const [diagnostic]=await sql`select id from os_activity where event='whop_rejection_diagnostic_started' and entity_id=${key} limit 1`;
  const diagnosticRetry=Boolean(repair&&!diagnostic&&incidentCatchup(campaign,now));
  const repairable=started&&failure&&BigInt(failure.id)>BigInt(started.id)&&failure.details.code==='WHOP_FORUM_HTTP_400'&&(!repair||diagnosticRetry);
  if(started&&!repairable)return {state:failure?.details.code||'unknown',published:false};
  // Cache the read-only Accounts API preflight, including failures. The version
  // invalidates only old connection reads; it never resets publication receipts.
  const [cached]=await sql`select details from os_activity where event='whop_home_preflight' and entity_id=${key} and details->>'version'='2' and created_at>now()-interval '15 minutes' order by id desc limit 1`;
  let preflight: {version:number;connected:boolean;companyId:string|null;error:string|null;checkedAt:string};
  if(cached)preflight=cached.details as typeof preflight;
  else {
    try {
      const status=await whopStatus();
      preflight={version:2,connected:status.connected,companyId:status.companyId,error:status.error||null,checkedAt:new Date().toISOString()};
    } catch {preflight={version:2,connected:false,companyId:null,error:'WHOP_CONNECTION_CHECK_FAILED',checkedAt:new Date().toISOString()};}
    await sql`insert into os_activity(actor,event,entity_id,details) values('operations','whop_home_preflight',${key},${sql.json(preflight)})`;
  }
  if(!preflight.connected||!preflight.companyId||preflight.error)return {state:preflight.error||"connection_required",published:false};
  if(!campaignMatchesReview(campaign)||!sendWindow(campaign,now))return {state:"connection_checked_waiting_for_window",published:false,permissionVerified:false};
  const text=campaign.text.trim();
  if(!text)return {state:"caption_missing",published:false};
  const idem=createHash("sha256").update(`darth-whop-home-v2:${campaignKey(campaign)}:${text}`).digest("hex").slice(0,48);
  const claimed=await sql.begin(async tx=>{
    await tx`select pg_advisory_xact_lock(730928)`;
    const [control]=await tx`select paused from os_control where id=1 for share`;
    if(!control||control.paused||!campaignMatchesReview(campaign)||!sendWindow(campaign))return false;
    const [existing]=await tx`select id from os_activity where event in ('whop_home_publish_started','whop_home_publish_receipt') and entity_id=${key} limit 1`;
    if(existing&&!repairable)return false;
    if(repairable){
      const repairEvent=diagnosticRetry?'whop_rejection_diagnostic_started':'whop_payload_repair_started';
      const [again]=await tx`select id from os_activity where event=${repairEvent} and entity_id=${key} limit 1`;
      if(again)return false;
      await tx`insert into os_activity(actor,event,entity_id,details) values('owner',${repairEvent},${key},${tx.json({reason:diagnosticRetry?'Recorded HTTP 400; replay same idempotency key once to capture sanitized rejection detail':'Recorded HTTP 400; corrected free-post payload',priorAttempt:started.id,incident:'DA-RECOVERY-20260923',reviewHash:campaign.reviewHash})})`;
    }
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','whop_home_publish_started',${key},${tx.json({day:campaign.day,slot:campaign.slot,policy:"owner_twice_daily_2026-09-22",companyId:preflight.companyId,state:"sending"})})`;
    return true;
  });
  if(!claimed)return {state:"waiting_or_started",published:false};
  try{
    const post=await createWhopHomePost(text,{idempotencyKey:repairable?idem+"-free-v3":idem,pinned:false});
    const details={day:campaign.day,postId:post.id,companyId:post.companyId,username:post.username||null,createdAt:post.createdAt||null,published:false};
    await sql`insert into os_activity(actor,event,entity_id,details) values('operations','whop_home_publish_accepted',${key},${sql.json(details)})`;
    return confirmWhop(key,campaign,details);
  }catch(error){
    const code=error instanceof Error&&/^WHOP_[A-Z0-9_]+$/.test(error.message)?error.message:"WHOP_PUBLISH_UNKNOWN";
    await sql`insert into os_activity(actor,event,entity_id,details) values('operations','whop_home_publish_unknown',${key},${sql.json({day:campaign.day,code})})`;
    return {state:code,published:false};
  }
}

async function confirmWhop(key:string,campaign:DailyCampaign,receipt:Record<string,unknown>){
 const sql=db();
 try{
  const verified=await verifyWhopPost(String(receipt.postId),campaign.text);
  const details={...receipt,...verified,checkedAt:new Date().toISOString()};
  await sql`insert into os_activity(actor,event,entity_id,details) values('operations','whop_home_publish_receipt',${key},${sql.json(details)})`;
  console.info(JSON.stringify({event:'whop_publication_verified',key,postId:verified.postId}));
  return {...details,state:'published',published:true};
 }catch{
  await sql`insert into os_activity(actor,event,entity_id,details) values('operations','whop_home_readback_pending',${key},${sql.json({postId:String(receipt.postId)})})`;
  return {state:'readback_pending',published:false};
 }
}
