import {createHash} from "node:crypto";
import {db} from "../affiliate-db";
import {createWhopHomePost,whopStatus} from "./whop";
import type {DailyCampaign} from "./daily-social-policy";

const dayKey=(day:string)=>`daily-whop:${day}`;

export async function syncDailyWhop(campaign:DailyCampaign, hour:number){
  if(process.env.VERCEL_ENV!=="production"||process.env.AI_OS_AUTONOMY_ENABLED!=="true"||process.env.WHOP_PUBLISHING_ENABLED==="false")return {state:"disabled",published:false};
  if(hour<9)return {state:"ready_for_daily_window",published:false};
  const sql=db(),key=dayKey(campaign.day);
  const [done]=await sql`select details from os_activity where event='whop_home_publish_receipt' and entity_id=${key} limit 1`;
  if(done)return {...done.details,state:"published",published:true};
  const status=await whopStatus();
  if(!status.connected||!status.companyId)return {state:status.error||"connection_required",published:false};
  const [started]=await sql`select id from os_activity where event='whop_home_publish_started' and entity_id=${key} limit 1`;
  if(started)return {state:"unknown",published:false};
  const text=campaign.text.trim();
  if(!text)return {state:"caption_missing",published:false};
  const idem=createHash("sha256").update(`darth-whop-home-v1:${campaign.day}:${text}`).digest("hex").slice(0,48);
  const claimed=await sql.begin(async tx=>{
    await tx`select pg_advisory_xact_lock(730928)`;
    const [control]=await tx`select paused from os_control where id=1 for share`;
    if(!control||control.paused)return false;
    const [existing]=await tx`select id from os_activity where event in ('whop_home_publish_started','whop_home_publish_receipt') and entity_id=${key} limit 1`;
    if(existing)return false;
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','whop_home_publish_started',${key},${tx.json({day:campaign.day,policy:"owner_daily_whop_2026-09-21",companyId:status.companyId,state:"sending"})})`;
    return true;
  });
  if(!claimed)return {state:"waiting_or_started",published:false};
  try{
    const post=await createWhopHomePost(text,{idempotencyKey:idem,pinned:false});
    const details={day:campaign.day,postId:post.id,companyId:post.companyId,username:post.username||null,createdAt:post.createdAt||null,published:true};
    await sql`insert into os_activity(actor,event,entity_id,details) values('operations','whop_home_publish_receipt',${key},${sql.json(details)})`;
    return {...details,state:"published"};
  }catch(error){
    const code=error instanceof Error&&/^WHOP_[A-Z0-9_]+$/.test(error.message)?error.message:"WHOP_PUBLISH_UNKNOWN";
    await sql`insert into os_activity(actor,event,entity_id,details) values('operations','whop_home_publish_unknown',${key},${sql.json({day:campaign.day,code})})`;
    return {state:code,published:false};
  }
}
