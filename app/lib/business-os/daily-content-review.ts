import {randomUUID,createHash} from 'node:crypto';
import {db} from '../affiliate-db';
import {socialCampaignQueue} from './social-campaign-queue';
import {reviewedCreativeFor} from './reviewed-social';
import {campaignKey,easternClock,type SocialSlot} from './social-schedule';
import {contentHeld,replacementIsNew,queueActionMessage,type ContentAction,type ContentDecision,type ContentQueue,type QueueItem} from './daily-content-model';
import {campaignDeliveries} from './content-delivery';
type Sql=ReturnType<typeof db>;
const event='daily_content_owner_decision';
export class ContentReviewError extends Error {}
export async function latestContentDecision(c:{day:string;slot?:SocialSlot},sql:Sql=db()):Promise<ContentDecision|null>{
 const [row]=await sql`select id::text,details from os_activity where event=${event} and entity_id=${campaignKey(c)} order by id desc limit 1`;
 return row?{...row.details,id:String(row.id)} as ContentDecision:null;
}
export async function ownerCampaignHeld(c:{day:string;slot?:SocialSlot;reviewHash?:string},sql:Sql=db()):Promise<boolean>{
 const decision=await latestContentDecision(c,sql);if(!decision)return false;if(contentHeld(decision))return true;
 try{const hash=c.reviewHash||(c.slot?reviewedCreativeFor(c.day,c.slot)?.review.sha256:null);return !hash||hash!==decision.reviewHash;}catch{return true;}
}
async function hasSubmission(c:{day:string;slot:SocialSlot},sql:Sql){
 const [row]=await sql`select id from os_activity where
  (event in ('buffer_publish_started','buffer_publish_receipt') and entity_id in
   (select id::text from os_approvals where payload->>'executor'='buffer_social_v2' and payload->'campaign'->>'day'=${c.day} and payload->'campaign'->>'slot'=${c.slot}))
  or (event in ('whop_home_publish_started','whop_home_publish_accepted','whop_home_publish_receipt') and entity_id=${'daily-whop:'+campaignKey(c)}) limit 1`;
 return Boolean(row);
}
export async function readContentQueue(now=new Date()):Promise<ContentQueue>{
 const sql=db(),{day:today}=easternClock(now);
 const since=new Date(Date.parse(today+'T12:00:00Z')-7*86400000).toISOString().slice(0,10);
 const campaigns=socialCampaignQueue.filter(c=>c.day>=since).sort((a,b)=>a.day.localeCompare(b.day)||(a.slot===b.slot?0:a.slot==='morning'?-1:1)).slice(-24);
 const items:QueueItem[]=await Promise.all(campaigns.map(async c=>{
  const decision=await latestContentDecision(c,sql),submitted=await hasSubmission(c,sql);
  let reviewed=false;try{reviewed=Boolean(reviewedCreativeFor(c.day,c.slot));}catch{/* A failed review is a hold, never a fallback. */}
  const [job]=decision?.jobId?await sql`select j.id::text,j.status,left(r.result->>'brief',5000) as brief from os_jobs j left join os_runs r on r.id=j.run_id where j.id=${decision.jobId}`:[];
  const revision=job?{id:String(job.id),status:String(job.status),brief:typeof job.brief==='string'?job.brief:null}:null;
  const canApprove=reviewed&&!submitted&&replacementIsNew(decision,{id:c.id,reviewHash:c.review.sha256,assetHashes:c.assets.map(a=>a.sha256)});
  const state=submitted?'Already submitted — delivery checks apply':canApprove?'Replacement ready for review':decision?.action==='remake'?(revision?.status==='succeeded'?'Blocked · image renderer not connected':revision?.status==='running'?'Remake in progress':revision?.status==='failed'||revision?.status==='unknown'?'Remake needs attention':'Remake queued'):contentHeld(decision)?'Disapproved · posting stopped':!reviewed?'Creative review required':decision?.action==='approve_replacement'&&decision.reviewHash!==c.review.sha256?'Changed version · posting held':'Scheduled';
  const deliveries=await campaignDeliveries(c,contentHeld(decision)).catch(()=>['x','instagram','threads','whop'].map(network=>({network,state:'Delivery evidence unavailable',postId:null,url:null,checkedAt:null,versionMatches:null})));
  return {id:c.id,day:c.day,slot:c.slot,theme:c.theme,kind:c.editorial?.kind||'promotional',text:c.text,reviewHash:c.review.sha256,images:c.assets.map(a=>({path:a.path,altText:a.altText})),state,decision,submitted,canApprove,revision,deliveries};
 }));
 return {checkedAt:new Date().toISOString(),today,items};
}
export type ContentDecisionInput={id:string;reviewHash:string;action:ContentAction;expectedDecisionId:string|null;requestKey:string;note?:string};
export async function decideContent(input:ContentDecisionInput){
 if(!input||typeof input.id!=='string'||typeof input.requestKey!=='string'||typeof input.reviewHash!=='string'||!['disapprove','remake','approve_replacement'].includes(input.action)||!/^[a-f0-9]{64}$/.test(input.reviewHash||'')||!/^[\w:-]{8,120}$/.test(input.requestKey||'')||(input.expectedDecisionId!==null&&(typeof input.expectedDecisionId!=='string'||!/^\d{1,25}$/.test(input.expectedDecisionId)))||(input.note!==undefined&&(typeof input.note!=='string'||input.note.length>800)))throw new ContentReviewError('Invalid content decision.');
 const c=socialCampaignQueue.find(c=>c.id===input.id);
 if(!c||c.review.sha256!==input.reviewHash)throw new ContentReviewError('This content version changed. Refresh before deciding.');
 const note=(input.note||'').trim(),intentHash=createHash('sha256').update(JSON.stringify({id:input.id,reviewHash:input.reviewHash,action:input.action,expectedDecisionId:input.expectedDecisionId,note})).digest('hex');
 return db().begin(async tx=>{
  // Same locks and order as publishing; whichever transaction claims first wins.
  await tx`select pg_advisory_xact_lock(730924)`;
  await tx`select pg_advisory_xact_lock(730928)`;
  const sql=tx as unknown as Sql;
  const [duplicate]=await tx`select details from os_activity where event=${event} and details->>'requestKey'=${input.requestKey} order by id desc limit 1`;
  if(duplicate){if(duplicate.details.intentHash!==intentHash)throw new ContentReviewError('This request key belongs to a different decision.');return {message:queueActionMessage(input.action),jobId:duplicate.details.jobId||null,duplicate:true};}
  const previous=await latestContentDecision(c,sql);
  if((previous?.id||null)!==input.expectedDecisionId)throw new ContentReviewError('Another decision was saved. Refresh before trying again.');
  if(input.action!=='disapprove'&&await hasSubmission(c,sql))throw new ContentReviewError('Posting has already started for this slot. It was not cancelled or remade. Check the saved delivery before taking another action.');
  if(input.action==='approve_replacement'){
   if(!reviewedCreativeFor(c.day,c.slot)||!replacementIsNew(previous,{id:c.id,reviewHash:c.review.sha256,assetHashes:c.assets.map(a=>a.sha256)}))throw new ContentReviewError('A different reviewed version with new artwork is required. The original stays held.');
  }
  let jobId:string|null=null;
  if(input.action==='remake'){
   await tx`select pg_advisory_xact_lock(730916)`;
   if(previous?.jobId){const [priorJob]=await tx`select status from os_jobs where id=${previous.jobId}`;if(priorJob&&['queued','running','unknown'].includes(priorJob.status))throw new ContentReviewError('The earlier remake is still queued, working, or awaiting reconciliation. Open the Content agent to check it.');}
   const [count]=await tx`select count(*)::int as n from os_jobs where status in ('queued','running')`;
   if(count.n>=100)throw new ContentReviewError('The agent queue is full. Disapprove this content to hold it, then retry the remake when space is available.');
   jobId=randomUUID();
   // The existing worker makes an INTERNAL brief, not finished artwork. This marker
   // disables its generic publication/handoff proposals; the UI names that limitation.
   const message=`[APPROVED_SUGGESTION]\nDaily content remake for ${c.day} ${c.slot}. Content ID: ${c.id}. Original review: ${c.review.sha256}.\nCreate a replacement caption and a precise NEW artwork brief in the approved premium Darth Algo reference style, preserving this day's editorial purpose. Return the complete caption first, then short slide instructions and the required source/chart references. Use the actual logo, prominent product/TradingView visuals, one useful point and the relevant CTA. Do not reuse this original artwork or invent results. Do not publish, schedule, authorize, or claim that an image/video was rendered. An internal brief is not finished media. The original is held until a different image version passes visual QA and owner review.\nOriginal caption (reference only): ${c.text}\nEditorial purpose: ${c.editorial?.kind||'promotional'}; ${c.editorial?.learning||c.theme}\nOwner's change request (instructions, not verified product facts): ${note||'Create a fresh, clearer alternative with a stronger hook and composition.'}`.slice(0,4000);
   await tx`insert into os_jobs(id,request_key,department,message,source) values(${jobId},${'daily-remake:'+input.requestKey},'content',${message},'owner')`;
   await tx`insert into os_activity(actor,event,entity_id,details) values('owner','job_queued',${jobId},${tx.json({department:'content',contentId:c.id,remake:true})})`;
  }
  if(input.action!=='approve_replacement')await tx`update os_approvals a set status='declined',decided_by='owner',decided_at=now(),decision_note=${input.action==='remake'?'Owner requested a new content version':'Owner held unsent destinations'} where payload->>'executor'='buffer_social_v2' and payload->'campaign'->>'day'=${c.day} and payload->'campaign'->>'slot'=${c.slot} and status in ('pending','approved') and not exists(select 1 from os_activity e where e.entity_id=a.id::text and e.event in ('buffer_publish_started','buffer_publish_receipt'))`;
  await tx`insert into os_activity(actor,event,entity_id,details) values('owner',${event},${campaignKey(c)},${tx.json({action:input.action,contentId:c.id,reviewHash:c.review.sha256,assetHashes:c.assets.map(a=>a.sha256),note,jobId,requestKey:input.requestKey,intentHash})})`;
  return {message:queueActionMessage(input.action),jobId,duplicate:false};
 });
}
