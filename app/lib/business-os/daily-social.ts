import {createHash,randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {fingerprint} from './policy';
import {bufferStatus} from './buffer';
import {photoPlanForDay} from './photo-plan';
import {syncDailyCreative,dailyCreativeCaption} from './daily-creative';
import {dailySocialPolicy,dailySocialPayload,isDailySocialPayload,socialPostUrl,type DailyCampaign,type SocialNetwork,type DailySocialPayload} from './daily-social-policy';
import {selectSocialChannel,socialPreflight,createSocialPost,getSocialPost,socialPostMatches} from './buffer-social';
const dayFor=(now:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:dailySocialPolicy.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export async function prepareDailyCampaign(now=new Date()):Promise<DailyCampaign>{
 const sql=db(),day=dayFor(now);
 const [saved]=await sql`select details from os_activity where event='daily_social_ready' and entity_id=${day} limit 1`;
 if(saved)return saved.details as DailyCampaign;
 const plan=photoPlanForDay(now),text=await dailyCreativeCaption(now),assetId=randomUUID();
 const [preference]=await sql`select details from os_activity where event='media_style_changed' order by id desc limit 1`;
 const {renderSocialCarousel}=await import('./social-art');
 const images=await renderSocialCarousel(plan,preference?.details.style||'crimson');
 const slides=images.map(({png,altText})=>({sha256:createHash('sha256').update(png).digest('hex'),png:png.toString('base64'),altText}));
 const campaign:DailyCampaign={day,assetId,theme:plan.id,text,assets:slides.map(({sha256,altText})=>({sha256,altText,url:`https://www.darthalgo.com/api/social-media/${assetId}/${sha256}`}))};
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730924)`;
  const [existing]=await tx`select details from os_activity where event='daily_social_ready' and entity_id=${day} limit 1`;
  if(existing)return existing.details as DailyCampaign;
  const [control]=await tx`select paused from os_control where id=1 for share`;if(!control||control.paused)throw Error('OS_PAUSED');
  await tx`insert into os_activity(actor,event,entity_id,details) values('content','social_media_asset',${assetId},${tx.json({...slides[0],slides,text,caption:text,creativePlan:plan.id,creativeVersion:3})})`;
  await tx`insert into os_activity(actor,event,entity_id,details) values('content','daily_social_ready',${day},${tx.json(campaign)})`;
  return campaign;
 });
}
export async function prepareSocialDelivery(campaign:DailyCampaign,network:SocialNetwork,channelId:string){
 const sql=db(),payload=dailySocialPayload(campaign,network,channelId),hash=fingerprint(payload),key=`${campaign.day}:${network}`;
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730924)`;
  const [existing]=await tx`select details from os_activity where event='daily_social_prepared' and entity_id=${key} limit 1`;
  if(existing)return String(existing.details.approvalId);
  const [control]=await tx`select paused from os_control where id=1 for share`;if(!control||control.paused)throw Error('OS_PAUSED');
  const id=randomUUID();
  await tx`insert into os_approvals(id,payload,payload_hash,status,decided_by,decided_at,decision_note,expires_at) values(${id},${tx.json(payload)},${hash},'approved','owner_policy',now(),'Owner: same daily photo on X, Instagram and Threads',now()+interval '24 hours')`;
  await tx`insert into os_activity(actor,event,entity_id,details) values('owner','daily_social_prepared',${key},${tx.json({approvalId:id,payloadHash:hash,policyId:dailySocialPolicy.id})})`;
  return id;
 });
}
function authorized(row:Record<string,unknown>|undefined):DailySocialPayload{
 if(!row||row.status!=='approved'||row.decided_by!=='owner_policy'||!isDailySocialPayload(row.payload)||row.payload_hash!==fingerprint(row.payload))throw Error('DAILY_SOCIAL_NOT_AUTHORIZED');
 return row.payload;
}
export async function checkSocialDelivery(id:string){
 const sql=db(),[row]=await sql`select * from os_approvals where id=${id}`,payload=authorized(row);
 const [receipt]=await sql`select details from os_activity where entity_id=${id} and event='buffer_publish_receipt' order by id desc limit 1`;
 if(!receipt)return {state:'unknown',published:false};
 try{
  const postId=String(receipt.details.postId),post=await getSocialPost(postId);
  if(post.id!==postId||!socialPostMatches(post,payload))throw Error('BUFFER_RECEIPT_MISMATCH');
  const published=post.status==='sent'&&Boolean(post.sentAt),externalLink=published?socialPostUrl(post.externalLink,payload.network):null;
  const details={payloadHash:row.payload_hash,channelId:payload.channelId,network:payload.network,postId,state:post.status,published,sentAt:post.sentAt||null,externalLink,checkedAt:new Date().toISOString()};
  await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_checked',${id},${sql.json(details)})`;
  return details;
 }catch{return {state:'unconfirmed',published:false};}
}
export async function executeSocialDelivery(id:string){
 if(process.env.VERCEL_ENV!=='production'||!dailySocialPolicy.enabled||process.env.AI_OS_AUTONOMY_ENABLED!=='true')throw Error('DAILY_SOCIAL_DISABLED');
 const sql=db(),[row]=await sql`select * from os_approvals where id=${id}`,payload=authorized(row);
 const [done]=await sql`select details from os_activity where entity_id=${id} and event='buffer_publish_checked' and details->>'published'='true' order by id desc limit 1`;
 if(done)return {...done.details,state:'sent',published:true};
 const [receipt]=await sql`select id from os_activity where entity_id=${id} and event='buffer_publish_receipt' limit 1`;
 if(receipt)return checkSocialDelivery(id);
 const [started]=await sql`select id from os_activity where entity_id=${id} and event='buffer_publish_started' limit 1`;
 if(started)return {state:'unknown',published:false};
 // Avoid downloading the carousel every cron tick while a platform is within its cadence window.
 const [cooldown]=await sql`select id from os_activity where event='media_auto_authorized' and details->>'network'=${payload.network} and (created_at>now()-interval '20 hours' or (created_at at time zone 'America/New_York')::date=(now() at time zone 'America/New_York')::date) limit 1`;
 if(cooldown)return {state:'waiting_for_daily_window',published:false};
 // Missing connections/assets are preflight failures, not ambiguous external writes.
 await socialPreflight(payload);
 const claimed=await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730924)`;
  const [current]=await tx`select * from os_approvals where id=${id} for update`;authorized(current);
  if(current.payload_hash!==row.payload_hash)throw Error('DAILY_SOCIAL_VERSION_CHANGED');
  const [control]=await tx`select paused from os_control where id=1 for share`;if(!control||control.paused)throw Error('OS_PAUSED');
  if(new Date(current.expires_at).getTime()<=Date.now())throw Error('DAILY_SOCIAL_EXPIRED');
  const [prepared]=await tx`select id from os_activity where event='daily_social_prepared' and details->>'approvalId'=${id} and details->>'payloadHash'=${String(row.payload_hash)} and details->>'policyId'=${dailySocialPolicy.id} limit 1`;
  if(!prepared)throw Error('DAILY_SOCIAL_NOT_AUTHORIZED');
  const [attempt]=await tx`select id from os_activity where entity_id=${id} and event='buffer_publish_started' limit 1`;if(attempt)return false;
  const [uncertain]=await tx`select a.id from os_approvals a where a.id<>${id} and a.payload->>'channelId'=${payload.channelId} and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_started') and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and details->>'published'='true') limit 1`;
  if(uncertain)return false;
  // One shared daily campaign per network; preserve existing cadence during cutover.
  const [recent]=await tx`select id from os_activity where event='media_auto_authorized' and details->>'network'=${payload.network} and (created_at>now()-interval '20 hours' or (created_at at time zone 'America/New_York')::date=(now() at time zone 'America/New_York')::date) limit 1`;
  if(recent)return false;
  await tx`insert into os_activity(actor,event,entity_id,details) values('owner','media_auto_authorized',${id},${tx.json({policyId:dailySocialPolicy.id,payloadHash:row.payload_hash,network:payload.network})})`;
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
 const waiting=await sql`select a.id from os_approvals a where payload->>'executor'='buffer_social_v2' and created_at>now()-interval '7 days' and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_receipt') and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and (details->>'published'='true' or created_at>now()-interval '5 minutes')) order by created_at limit 3`;
 for(const r of waiting)await checkSocialDelivery(r.id);
 const creative=await syncDailyCreative(now);
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:dailySocialPolicy.timezone,hour:'numeric',hourCycle:'h23'}).format(now));
 if(hour<dailySocialPolicy.hour)return {status:'waiting_for_daily_window',creative:creative.status};
 if(creative.waiting)return {status:'preparing_daily_caption'};
 const campaign=await prepareDailyCampaign(now),state=await bufferStatus(),deliveries:Record<string,string>={};
 for(const network of ['x','instagram','threads'] as const){
  const channel=selectSocialChannel(state.channels,network);
  if(!channel){deliveries[network]='connection_required';continue;}
  try{const id=await prepareSocialDelivery(campaign,network,channel.id);const result=await executeSocialDelivery(id);deliveries[network]=result.published?'published':result.state;}
  catch{deliveries[network]='needs_check';}
 }
 const [previous]=await sql`select details from os_activity where event='daily_social_status' and entity_id=${campaign.day} order by id desc limit 1`;
 if(fingerprint(previous?.details.deliveries||{})!==fingerprint(deliveries))await sql`insert into os_activity(actor,event,entity_id,details) values('operations','daily_social_status',${campaign.day},${sql.json({deliveries,theme:campaign.theme})})`;
 return {status:'active',day:campaign.day,theme:campaign.theme,deliveries};
}
