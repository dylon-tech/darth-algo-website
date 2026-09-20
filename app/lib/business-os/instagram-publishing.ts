import {cachedScheduledReceipt} from './buffer-receipts';
import { mediaAutopilot } from "./media-policy";
import { randomUUID } from "node:crypto";
import { db } from "../affiliate-db";
import { createInstagramPost, getInstagramPost, instagramChannelReady, instagramPostMatches, verifyInstagramAssets } from "./buffer-instagram";
import { instagramPublicationPayload, isInstagramPublication, type InstagramPublication } from "./instagram-policy";
import { fingerprint } from "./policy";
import { queueApprovalNotice, deliverOwnerNotices, privateTelegramConfiguration } from "./delivery";

// One authorized launch campaign. Cron can prepare a private draft and an owner
// approval; only the authenticated owner decision can invoke public publishing.
export async function syncInstagramCampaign(payload=instagramPublicationPayload()) {
  if(process.env.VERCEL_ENV!=="production")return {status:"disabled"};
  const sql=db(), hash=fingerprint(payload), campaignId=payload.campaignId;
  if(!isInstagramPublication(payload))throw new Error("INSTAGRAM_PAYLOAD_INVALID");
  const [control]=await sql`select paused from os_control where id=1`;
  if(!control || control.paused)return {status:"paused"};
  const [prepared]=await sql`select details from os_activity where event='instagram_campaign_prepared' and entity_id=${campaignId} limit 1`;
  if(prepared) {
    const id=String(prepared.details.approvalId);
    const [notice]=await sql`select id,status from os_outbox where dedupe_key=${`approval:${id}:0`} limit 1`;
    if(!notice && !mediaAutopilot.enabled && privateTelegramConfiguration().ready)await queueApprovalNotice(id);
    if(privateTelegramConfiguration().ready)await deliverOwnerNotices(2);
    const [delivery]=await sql`select status from os_outbox where dedupe_key=${`approval:${id}:0`} limit 1`;
    return {status:"prepared",approvalId:id,noticeStatus:delivery?.status || "not_queued"};
  }
  await Promise.all([instagramChannelReady(payload),verifyInstagramAssets(payload)]);
  const claim=await sql.begin(async tx=>{
    await tx`select pg_advisory_xact_lock(730921)`;
    const [current]=await tx`select paused from os_control where id=1 for share`;
    if(!current || current.paused)throw new Error("OS_PAUSED");
    const [receipt]=await tx`select details from os_activity where event='instagram_draft_receipt' and entity_id=${campaignId} limit 1`;
    if(receipt)return {postId:String(receipt.details.postId),claimed:false};
    const [started]=await tx`select id from os_activity where event='instagram_draft_started' and entity_id=${campaignId} limit 1`;
    if(started)return {postId:undefined,claimed:false};
    await tx`insert into os_activity(actor,event,entity_id,details) values('content','instagram_draft_started',${campaignId},${tx.json({payloadHash:hash})})`;
    return {postId:undefined,claimed:true};
  });
  let postId=claim.postId;
  if(claim.claimed) {
    const post=await createInstagramPost(payload,true);
    postId=post.id;
    await sql`insert into os_activity(actor,event,entity_id,details) values('content','instagram_draft_receipt',${campaignId},${sql.json({postId,payloadHash:hash})})`;
  }
  if(!postId)return {status:"draft_unconfirmed"};
  const draft=await getInstagramPost(postId);
  if(draft.id!==postId || draft.status!=="draft" || draft.sentAt || draft.dueAt || !instagramPostMatches(draft,payload))throw new Error("INSTAGRAM_DRAFT_MISMATCH");
  const id=await sql.begin(async tx=>{
    await tx`select pg_advisory_xact_lock(730921)`;
    const [existing]=await tx`select details from os_activity where event='instagram_campaign_prepared' and entity_id=${campaignId} limit 1`;
    if(existing)return String(existing.details.approvalId);
    const approvalId=randomUUID();
    await tx`insert into os_activity(actor,event,entity_id,details) values('content','instagram_carousel_draft_verified',${campaignId},${tx.json({postId,payloadHash:hash,channelId:payload.channelId})})`;
    await tx`insert into os_approvals(id,payload,payload_hash,expires_at) values(${approvalId},${tx.json(payload)},${hash},now()+interval '24 hours')`;
    await tx`insert into os_activity(actor,event,entity_id,details) values('content','instagram_publication_prepared',${approvalId},${tx.json({payloadHash:hash,postId,campaignId})})`;
    await tx`insert into os_activity(actor,event,entity_id,details) values('content','instagram_campaign_prepared',${campaignId},${tx.json({approvalId,payloadHash:hash})})`;
    return approvalId;
  });
  if(!mediaAutopilot.enabled && privateTelegramConfiguration().ready){await queueApprovalNotice(id);await deliverOwnerNotices(2);}
  return {status:"prepared",approvalId:id,draftId:postId};
}

function approved(row: Record<string,unknown> | undefined, hash:string): InstagramPublication {
  if(!row || row.status!=="approved" || !["owner","owner_policy"].includes(String(row.decided_by)))throw new Error("BUFFER_APPROVAL_REQUIRED");
  if(row.payload_hash!==hash || fingerprint(row.payload)!==hash || !isInstagramPublication(row.payload))throw new Error("BUFFER_APPROVAL_VERSION_CHANGED");
  return row.payload;
}
async function readReceipt(id:string,hash:string,payload:InstagramPublication,postId:string) {
  try {
    const post=await getInstagramPost(postId);
    if(post.id!==postId || !instagramPostMatches(post,payload))throw new Error("BUFFER_RECEIPT_MISMATCH");
    const published=post.status==="sent" && Boolean(post.sentAt);
    const details={payloadHash:hash,channelId:payload.channelId,postId,state:post.status,published,sentAt:post.sentAt || null,checkedAt:new Date().toISOString()};
    await db()`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_checked',${id},${db().json(details)})`;
    return {...details,message:published ? "Buffer confirms the approved carousel was published on Instagram." : "Buffer has the carousel. Publication is not confirmed yet. Check the receipt again; it will not send another post."};
  } catch {
    const sql=db(),details={postId,state:"unconfirmed",published:false,checkedAt:new Date().toISOString()};
    await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_checked',${id},${sql.json(details)})`;
    return {postId,state:"unconfirmed",published:false,message:"The Buffer receipt is saved, but publication could not be verified. Check the receipt or Buffer; this will not submit another post."};}
}
export async function executeInstagramPublication(id:string,hash:string) {
  if(process.env.VERCEL_ENV!=="production")throw new Error("BUFFER_PUBLISH_PRODUCTION_ONLY");
  const sql=db();
  const claim=await sql.begin(async tx=>{
    const [row]=await tx`select * from os_approvals where id=${id} for update`;
    const payload=approved(row,hash);
    if(row!.decided_by==="owner_policy") {
      const [grant]=await tx`select id from os_activity where event='media_auto_authorized' and entity_id=${id} and details->>'payloadHash'=${hash} and details->>'policyId'=${mediaAutopilot.id} limit 1`;
      if(!mediaAutopilot.enabled || !grant)throw new Error("BUFFER_APPROVAL_REQUIRED");
    }
    const [prepared]=await tx`select id from os_activity where event='instagram_publication_prepared' and entity_id=${id} and details->>'payloadHash'=${hash} limit 1`;
    if(!prepared)throw new Error("BUFFER_PREPARED_APPROVAL_REQUIRED");
    const [receipt]=await tx`select details from os_activity where entity_id=${id} and event='buffer_publish_receipt' order by id desc limit 1`;
    if(receipt)return {payload,claimed:false,postId:String(receipt.details.postId)};
    const [started]=await tx`select id from os_activity where entity_id=${id} and event='buffer_publish_started' limit 1`;
    if(started)return {payload,claimed:false,postId:undefined};
    if(new Date(row!.expires_at).getTime()<=Date.now())throw new Error("BUFFER_APPROVAL_EXPIRED");
    const [control]=await tx`select paused from os_control where id=1 for share`;
    if(!control || control.paused)throw new Error("OS_PAUSED");
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','buffer_publish_started',${id},${tx.json({payloadHash:hash,channelId:payload.channelId,state:"sending"})})`;
    return {payload,claimed:true,postId:undefined};
  });
  if(claim.postId)return readReceipt(id,hash,claim.payload,claim.postId);
  if(!claim.claimed)return {state:"unknown",published:false,message:"An attempt already started. Check Buffer and Instagram; duplicate submission is blocked."};
  try {
    const post=await createInstagramPost(claim.payload,false);
    await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_receipt',${id},${sql.json({payloadHash:hash,channelId:claim.payload.channelId,postId:post.id,state:"accepted"})})`;
    return readReceipt(id,hash,claim.payload,post.id);
  } catch {
    try{await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_unknown',${id},${sql.json({payloadHash:hash,state:"unknown"})})`;}catch{/* The committed started event blocks replay. */}
    return {state:"unknown",published:false,message:"Publication could not be confirmed. Check Buffer and Instagram. This approval cannot submit another post."};
  }
}
export async function checkInstagramPublication(id:string,hash:string,options:{scheduled?:boolean}={}) {
  const sql=db();
  const [row]=await sql`select * from os_approvals where id=${id}`;
  const payload=approved(row,hash);
  const [receipt]=await sql`select details from os_activity where entity_id=${id} and event='buffer_publish_receipt' order by id desc limit 1`;
  if(!receipt)return {state:"unknown",published:false,message:"No receipt was saved. Check Buffer and Instagram directly. This check does not send a post."};
  if(options.scheduled){const cached=await cachedScheduledReceipt(id);if(cached)return cached;}
  return readReceipt(id,hash,payload,String(receipt.details.postId));
}
