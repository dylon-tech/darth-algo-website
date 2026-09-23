import {randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {fingerprint} from './policy';
import {bufferStatus,bufferCooldown} from './buffer';
import {cachedScheduledReceipt} from './buffer-receipts';
import {verifyInstagramAssets} from './buffer-instagram';
import {instagramPublicationPayload} from './instagram-policy';
import {communityReadiness} from './community-readiness';
import {dailySocialPolicy,dailySocialPayload,isDailySocialPayload,socialPostUrl,type DailyCampaign,type SocialNetwork,type DailySocialPayload} from './daily-social-policy';
import {selectSocialChannel,socialPreflight,createSocialPost,getSocialPost,socialPostMatches} from './buffer-social';
import {syncDailyWhop} from './whop-daily';
import {currentCreativeVersion,isCurrentCreative} from './creative-version';
import {socialSchedule,campaignKey,withinSocialWindow} from './social-schedule';
import {reviewedCreativeFor,campaignMatchesReview,loadReviewedImages} from './reviewed-social';
import {incidentCatchup} from './publishing-recovery-policy';
const sendWindow=(c:DailyCampaign)=>withinSocialWindow(c)||incidentCatchup(c);
export async function prepareDailyCampaign(now=new Date()):Promise<DailyCampaign>{
 const sql=db(),schedule=socialSchedule(now),day=schedule.day,key=campaignKey(schedule);
 const reviewed=reviewedCreativeFor(day,schedule.slot);
 if(!reviewed)throw Error('CREATIVE_ASSETS_REQUIRED');
 const [saved]=await sql`select details from os_activity where event='daily_social_ready' and entity_id=${key} order by id desc limit 1`;
 if(saved&&campaignMatchesReview(saved.details))return saved.details as DailyCampaign;
 // Never replace a campaign after any destination has begun sending it. An
 // uncertain outcome is also an attempt; retain its exact bytes for readback.
 const attempted=async (q:typeof sql)=>{
  const [attempt]=await q`select id from os_activity where (event in ('buffer_publish_started','buffer_publish_receipt') and entity_id in (select id::text from os_approvals where payload->'campaign'->>'day'=${day} and payload->'campaign'->>'slot'=${schedule.slot})) or (event in ('whop_home_publish_started','whop_home_publish_receipt') and entity_id=${`daily-whop:${key}`}) limit 1`;
  return Boolean(attempt);
 };
 if(saved&&await attempted(sql))return saved.details as DailyCampaign;
 const assetId=randomUUID(),text=reviewed.text,slides=await loadReviewedImages(reviewed);
 const campaign:DailyCampaign={day,slot:schedule.slot,contentId:reviewed.id,reviewHash:reviewed.review.sha256,assetId,theme:reviewed.theme,text,creativeVersion:currentCreativeVersion,assets:slides.map(({sha256,altText})=>({sha256,altText,url:`https://www.darthalgo.com/api/social-media/${assetId}/${sha256}`}))};
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730924)`;
  await tx`select pg_advisory_xact_lock(730928)`;
  const [existing]=await tx`select details from os_activity where event='daily_social_ready' and entity_id=${key} order by id desc limit 1`;
  if(existing&&(campaignMatchesReview(existing.details)||await attempted(tx as unknown as typeof sql)))return existing.details as DailyCampaign;
  const [control]=await tx`select paused from os_control where id=1 for share`;if(!control||control.paused)throw Error('OS_PAUSED');
  if(existing){
   await tx`update os_approvals set status='expired',decision_note='Superseded by the owner-approved premium creative version' where payload->'campaign'->>'day'=${day} and payload->'campaign'->>'slot'=${schedule.slot} and payload->>'executor'='buffer_social_v2' and status in ('pending','approved')`;
   await tx`insert into os_activity(actor,event,entity_id,details) values('content','daily_social_creative_superseded',${key},${tx.json({oldAssetId:existing.details.assetId,newAssetId:assetId,creativeVersion:currentCreativeVersion,skillVersion:'1.0.0'})})`;
  }
  await tx`insert into os_activity(actor,event,entity_id,details) values('content','social_media_asset',${assetId},${tx.json({...slides[0],slides,text,caption:text,creativePlan:reviewed.id,reviewHash:reviewed.review.sha256,referenceVersion:reviewed.review.referenceVersion,creativeVersion:currentCreativeVersion})})`;
  await tx`insert into os_activity(actor,event,entity_id,details) values('content','daily_social_ready',${key},${tx.json(campaign)})`;
  return campaign;
 });
}
export async function prepareSocialDelivery(campaign:DailyCampaign,network:SocialNetwork,channelId:string){
 const sql=db(),payload=dailySocialPayload(campaign,network,channelId),hash=fingerprint(payload),key=`${campaignKey(campaign)}:${network}`;
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730924)`;
  const [existing]=await tx`select details from os_activity where event='daily_social_prepared' and entity_id=${key} order by id desc limit 1`;
  if(existing&&existing.details.payloadHash===hash)return String(existing.details.approvalId);
  if(existing){
   const [attempt]=await tx`select id from os_activity where entity_id=${String(existing.details.approvalId)} and event in ('buffer_publish_started','buffer_publish_receipt') limit 1`;
   if(attempt)throw Error('DAILY_SOCIAL_EXISTING_ATTEMPT');
   await tx`update os_approvals set status='expired',decision_note='Superseded creative payload' where id=${String(existing.details.approvalId)} and status in ('pending','approved')`;
  }
  if(!campaignMatchesReview(campaign))throw Error('DAILY_SOCIAL_CREATIVE_RETIRED');
  const [control]=await tx`select paused from os_control where id=1 for share`;if(!control||control.paused)throw Error('OS_PAUSED');
  const id=randomUUID();
  await tx`insert into os_approvals(id,payload,payload_hash,status,decided_by,decided_at,decision_note,expires_at) values(${id},${tx.json(payload)},${hash},'approved','owner_policy',now(),'Owner: morning and afternoon posts, same campaign across X, Instagram and Threads',now()+interval '24 hours')`;
  await tx`insert into os_activity(actor,event,entity_id,details) values('owner','daily_social_prepared',${key},${tx.json({approvalId:id,payloadHash:hash,policyId:dailySocialPolicy.id})})`;
  return id;
 });
}
function authorized(row:Record<string,unknown>|undefined):DailySocialPayload{
 if(!row||row.status!=='approved'||row.decided_by!=='owner_policy'||!isDailySocialPayload(row.payload)||row.payload_hash!==fingerprint(row.payload))throw Error('DAILY_SOCIAL_NOT_AUTHORIZED');
 return row.payload;
}
export async function checkSocialDelivery(id:string,options:{scheduled?:boolean}={}){
 const sql=db(),[row]=await sql`select * from os_approvals where id=${id}`,payload=authorized(row);
 const [receipt]=await sql`select details from os_activity where entity_id=${id} and event='buffer_publish_receipt' order by id desc limit 1`;
 if(!receipt)return {state:'unknown',published:false};
 if(options.scheduled){
  const checked=await cachedScheduledReceipt(id);
  if(checked?.reconciliationVersion===2)return checked;
 }
 try{
  const postId=String(receipt.details.postId),post=await getSocialPost(postId);
  if(post.id!==postId||post.channelId!==payload.channelId)throw Error('BUFFER_RECEIPT_MISMATCH');
  const matches=socialPostMatches(post,payload);
  if((post.status==='sent'&&post.sentAt&&!matches)||post.status==='error'){
   const details={payloadHash:row.payload_hash,channelId:payload.channelId,network:payload.network,postId,
    state:post.status==='sent'?'sent_content_changed':'provider_failed',published:false,outcomeResolved:true,
    sentAt:post.sentAt||null,externalLink:socialPostUrl(post.externalLink,payload.network),checkedAt:new Date().toISOString(),
    contentMatches:matches,reconciliationVersion:2,reason:post.status==='sent'?'Provider confirms this receipt was sent, but exact approved content differs. Do not resend.':'Provider confirms terminal failure. No automatic replay.'};
   await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_reconciled',${id},${sql.json(details)})`;
   await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_checked',${id},${sql.json(details)})`;
   console.info(JSON.stringify({event:'social_receipt_reconciled',approvalId:id,...details}));
   return details;
  }
  if(!matches)throw Error('BUFFER_RECEIPT_MISMATCH');
  const published=post.status==='sent'&&Boolean(post.sentAt),externalLink=published?socialPostUrl(post.externalLink,payload.network):null;
  const details={payloadHash:row.payload_hash,channelId:payload.channelId,network:payload.network,postId,state:post.status,published,sentAt:post.sentAt||null,externalLink,checkedAt:new Date().toISOString(),reconciliationVersion:2};
  await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_checked',${id},${sql.json(details)})`;
  return details;
 }catch{
  const details={state:'unconfirmed',published:false,checkedAt:new Date().toISOString(),reconciliationVersion:2};
  await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_checked',${id},${sql.json(details)})`;
  return details;
 }
}
export async function executeSocialDelivery(id:string){
 if(process.env.VERCEL_ENV!=='production'||!dailySocialPolicy.enabled||process.env.AI_OS_AUTONOMY_ENABLED!=='true')throw Error('DAILY_SOCIAL_DISABLED');
 const sql=db(),[row]=await sql`select * from os_approvals where id=${id}`,payload=authorized(row);
 const [done]=await sql`select details from os_activity where entity_id=${id} and event='buffer_publish_checked' and details->>'published'='true' order by id desc limit 1`;
 if(done)return {...done.details,state:'sent',published:true};
 const [receipt]=await sql`select id from os_activity where entity_id=${id} and event='buffer_publish_receipt' limit 1`;
 if(receipt)return checkSocialDelivery(id,{scheduled:true});
 const [started]=await sql`select id from os_activity where entity_id=${id} and event='buffer_publish_started' limit 1`;
 if(started)return {state:'unknown',published:false};
 if(!campaignMatchesReview(payload.campaign))return {state:'creative_review_required',published:false};
 if(!sendWindow(payload.campaign))return {state:'waiting_for_daily_window',published:false};
 if(!isCurrentCreative(payload.campaign))return {state:'retired_creative_held',published:false};
 // Avoid downloading the carousel every cron tick while a platform is within its cadence window.
 const [cooldown]=await sql`select id from os_activity where event='media_auto_authorized' and details->>'network'=${payload.network} and created_at>now()-interval '4 hours' limit 1`;
 if(cooldown)return {state:'waiting_for_daily_window',published:false};
 // A previous uncertain submission blocks this channel before any API/asset reads.
 const [priorUncertain]=await sql`select a.id from os_approvals a where a.id<>${id} and a.payload->>'channelId'=${payload.channelId} and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_started') and not exists(select 1 from os_activity where entity_id=a.id::text and (event='buffer_publish_checked' and details->>'published'='true' or event='buffer_publish_reconciled' and details->>'outcomeResolved'='true')) limit 1`;
 if(priorUncertain)return {state:'waiting_for_prior_receipt',published:false};
 // Missing connections/assets are preflight failures, not ambiguous external writes.
 await socialPreflight(payload);
 const claimed=await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730924)`;
  const [current]=await tx`select * from os_approvals where id=${id} for update`;authorized(current);
  if(current.payload_hash!==row.payload_hash)throw Error('DAILY_SOCIAL_VERSION_CHANGED');
  if(!campaignMatchesReview((current.payload as DailySocialPayload).campaign))throw Error('DAILY_SOCIAL_CREATIVE_RETIRED');
  if(!sendWindow((current.payload as DailySocialPayload).campaign))return false;
  const [control]=await tx`select paused from os_control where id=1 for share`;if(!control||control.paused)throw Error('OS_PAUSED');
  if(new Date(current.expires_at).getTime()<=Date.now())throw Error('DAILY_SOCIAL_EXPIRED');
  const [prepared]=await tx`select id from os_activity where event='daily_social_prepared' and details->>'approvalId'=${id} and details->>'payloadHash'=${String(row.payload_hash)} and details->>'policyId'=${dailySocialPolicy.id} limit 1`;
  if(!prepared)throw Error('DAILY_SOCIAL_NOT_AUTHORIZED');
  const [attempt]=await tx`select id from os_activity where entity_id=${id} and event='buffer_publish_started' limit 1`;if(attempt)return false;
  const [uncertain]=await tx`select a.id from os_approvals a where a.id<>${id} and a.payload->>'channelId'=${payload.channelId} and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_started') and not exists(select 1 from os_activity where entity_id=a.id::text and (event='buffer_publish_checked' and details->>'published'='true' or event='buffer_publish_reconciled' and details->>'outcomeResolved'='true')) limit 1`;
  if(uncertain)return false;
  // One campaign per slot and platform. Shared lock prevents overlapping submissions.
  const [recent]=await tx`select id from os_activity where event='media_auto_authorized' and details->>'network'=${payload.network} and created_at>now()-interval '4 hours' limit 1`;
  if(recent)return false;
  await tx`insert into os_activity(actor,event,entity_id,details) values('owner','media_auto_authorized',${id},${tx.json({policyId:dailySocialPolicy.id,payloadHash:row.payload_hash,network:payload.network,campaignKey:campaignKey(payload.campaign)})})`;
  await tx`insert into os_activity(actor,event,entity_id,details) values('owner','buffer_publish_started',${id},${tx.json({payloadHash:row.payload_hash,channelId:payload.channelId,network:payload.network,state:'sending'})})`;
  return true;
 });
 if(!claimed)return {state:'waiting_or_started',published:false};
 try{
  const post=await createSocialPost(payload);
  await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_receipt',${id},${sql.json({payloadHash:row.payload_hash,channelId:payload.channelId,network:payload.network,postId:post.id,state:'accepted'})})`;
 }catch{
  try{await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_unknown',${id},${sql.json({network:payload.network,state:'unknown'})})`;}catch{/* Committed attempt already prevents another write. */}
  return {state:'unknown',published:false};
 }
 return checkSocialDelivery(id);
}
export async function syncDailySocial(now=new Date()){
 if(process.env.VERCEL_ENV!=='production'||process.env.AI_OS_AUTONOMY_ENABLED!=='true'||!dailySocialPolicy.enabled)return {status:'disabled'};
 const sql=db(),[control]=await sql`select paused from os_control where id=1`;if(!control||control.paused)return {status:'paused'};
 // Re-read saved provider receipts; never recreate an accepted post.
 const waiting=await sql`select a.id from os_approvals a where payload->>'executor'='buffer_social_v2' and created_at>now()-interval '7 days' and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_receipt') and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and (details->>'published'='true' or details->>'outcomeResolved'='true' or created_at>now()-interval '5 minutes')) order by created_at limit 3`;
 for(const r of waiting)await checkSocialDelivery(r.id,{scheduled:true});
 const [missed]=await sql`select details from os_activity where event='daily_social_ready' and entity_id='2026-09-23-afternoon' order by id desc limit 1`;
 if(missed&&incidentCatchup(missed.details,now)&&campaignMatchesReview(missed.details)){
  const recovery=await sql`select id from os_approvals where payload->>'executor'='buffer_social_v2' and payload->>'network'='threads' and payload->'campaign'->>'day'='2026-09-23' and payload->'campaign'->>'slot'='afternoon' and status='approved' order by created_at desc limit 1`;
  if(recovery[0]){
   const result=await executeSocialDelivery(recovery[0].id);
   console.info(JSON.stringify({event:'social_incident_catchup',network:'threads',state:result.state,published:result.published}));
  }
  const whop=await syncDailyWhop(missed.details,now);
  console.info(JSON.stringify({event:'social_incident_catchup',network:'whop',...whop}));
 }
 const schedule=socialSchedule(now),key=campaignKey(schedule);
 let campaign:DailyCampaign;
 try{campaign=await prepareDailyCampaign(now);}
 catch(error){
  const reason=error instanceof Error?error.message:'CREATIVE_PREPARATION_FAILED';
  const [last]=await sql`select details from os_activity where event='daily_social_status' and entity_id=${key} order by id desc limit 1`;
  if(last?.details.reason!==reason)await sql`insert into os_activity(actor,event,entity_id,details) values('content','daily_social_status',${key},${sql.json({status:'creative_assets_required',reason,day:schedule.day,slot:schedule.slot})})`;
  return {status:'creative_assets_required',day:schedule.day,slot:schedule.slot,reason};
 }
 if(!campaignMatchesReview(campaign))return {status:'retired_creative_held',day:campaign.day,slot:campaign.slot,reason:'Attempted earlier version retained for reconciliation; no new send.'};
 if(await bufferCooldown())throw Error('BUFFER_RATE_LIMIT_COOLDOWN');
 const state=await bufferStatus(),community=await communityReadiness(),deliveries:Record<string,string>={};
 const [checkedAssets]=await sql`select id from os_activity where event='daily_social_assets_checked' and entity_id=${campaign.assetId} limit 1`;
 let assetsReady=Boolean(checkedAssets);
 if(!assetsReady){
  try{
   await verifyInstagramAssets(instagramPublicationPayload({campaignId:`daily-${campaignKey(campaign)}`,text:campaign.text,assets:campaign.assets}));
   await sql`insert into os_activity(actor,event,entity_id,details) values('operations','daily_social_assets_checked',${campaign.assetId},'{"verified":true}'::jsonb)`;
   assetsReady=true;
  }catch{/* Failed read is recoverable before any external write. */}
 }
 for(const network of ['x','instagram','threads'] as const){
  const channel=selectSocialChannel(state.channels,network);
  if(!channel){deliveries[network]='connection_required';continue;}
  try{
   const id=await prepareSocialDelivery(campaign,network,channel.id);
   if(!assetsReady){deliveries[network]='assets_need_check';continue;}
   if(!schedule.open){deliveries[network]='ready_for_daily_window';continue;}
   const result=await executeSocialDelivery(id);deliveries[network]=result.published?'published':result.state;
  }
  catch{deliveries[network]='needs_check';}
 }
 const whop=await syncDailyWhop(campaign,now);
 deliveries.whop=whop.published?'published':whop.state;
 const [previous]=await sql`select details from os_activity where event='daily_social_status' and entity_id=${key} order by id desc limit 1`;
 if(fingerprint({deliveries:previous?.details.deliveries,community:previous?.details.community})!==fingerprint({deliveries,community:community.state}))await sql`insert into os_activity(actor,event,entity_id,details) values('operations','daily_social_status',${key},${sql.json({deliveries,day:campaign.day,slot:campaign.slot,theme:campaign.theme,community:community.state})})`;
 return {status:!schedule.open?'prepared_for_daily_window':'active',day:campaign.day,slot:campaign.slot,theme:campaign.theme,creativeVersion:campaign.creativeVersion,deliveries,communityReadiness:community.state,assetsReady,previewUrl:campaign.assets[0].url};
}
