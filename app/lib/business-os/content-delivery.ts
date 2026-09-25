import {db} from '../affiliate-db';
import {campaignKey,type SocialSlot} from './social-schedule';
import {publicOperationUrl} from './operations-model';
import type {ContentDelivery} from './daily-content-model';

type Receipt={event:string;details:Record<string,unknown>;created_at:Date|string};
const time=(v:unknown)=>v instanceof Date?v.toISOString():typeof v==='string'?v:null;
// A receipt for another version is still a real external outcome, but it must
// never be represented as verification of the artwork currently displayed.
export function deliveryEvidence(network:string,events:Receipt[],expectedHash:string,savedHash:unknown,held=false):ContentDelivery {
 const latest=events[0],d=latest?.details||{},versionMatches=typeof savedHash==='string'?savedHash===expectedHash:null;
 const verified=events.find(r=>r.details.published===true&&typeof r.details.postId==='string');
 const receipt=verified||events.find(r=>typeof r.details.postId==='string');
 const r=receipt?.details||{},postId=typeof r.postId==='string'?r.postId:null;
 const changed=d.state==='sent_content_changed';
 let state=verified?(versionMatches===true?'Publication verified':'Published · version differs or unbound')
  :changed?'Published · content differs'
  :d.state==='provider_failed'?'Failed · provider confirmed'
  :/permission|missing|required|rejected|failed|HTTP_4/i.test(String(d.code||d.state||''))?'Blocked · '+String(d.code||d.state).replaceAll('_',' ')
  :events.some(e=>/unknown/.test(e.event)||e.details.state==='unconfirmed')?'Outcome unknown · reconcile before retry'
  :postId?'Provider accepted · checking publication'
  :events.some(e=>/started$/.test(e.event))?'Sending · outcome not yet verified'
  :held?'Held · no new send'
  :events.length?'Prepared · not published':'No delivery recorded';
 if(!verified&&versionMatches===false&&state==='Prepared · not published')state='Older version prepared · current version held';
 return {network,state,postId,url:(verified||changed)?publicOperationUrl(r.externalLink,network):null,checkedAt:time(r.checkedAt)||time(receipt?.created_at)||time(latest?.created_at),versionMatches};
}
export function communityDeliveryEvidence(events:Receipt[],expectedHash:string,held:boolean):ContentDelivery{
 const sent=events.find(e=>e.event==='community_social_sent'&&typeof e.details.messageId==='number'),latest=events[0];
 const hash=(sent||events.find(e=>e.details.reviewHash))?.details.reviewHash;
 return {network:'telegram community',state:sent?'Telegram accepted · recipient read unverified':events.some(e=>e.event==='community_social_unknown')?'Outcome unknown · check Telegram before retry':events.length?'Sending · outcome unverified':held?'Held · no new send':'No delivery recorded',postId:sent?String(sent.details.messageId):null,url:null,checkedAt:time(sent?.created_at)||time(latest?.created_at),versionMatches:typeof hash==='string'?hash===expectedHash:null};
}
export async function campaignDeliveries(c:{day:string;slot:SocialSlot;review:{sha256:string}},held:boolean):Promise<ContentDelivery[]> {
 const sql=db(),key=campaignKey(c);
 const [approvals,whop,status,community]=await Promise.all([
  sql`select id::text,payload->>'network' as network,payload->'campaign'->>'reviewHash' as review_hash from os_approvals where payload->>'executor'='buffer_social_v2' and payload->'campaign'->>'day'=${c.day} and payload->'campaign'->>'slot'=${c.slot}`,
  sql`select event,details,created_at from os_activity where entity_id=${'daily-whop:'+key} and event in ('whop_home_publish_started','whop_home_publish_accepted','whop_home_publish_unknown','whop_home_publish_receipt','whop_home_readback_pending') order by id desc limit 15`,
  sql`select details,created_at from os_activity where event='daily_social_status' and entity_id=${key} order by id desc limit 1`,
  sql`select event,details,created_at from os_activity where entity_id=${key} and event in ('community_social_started','community_social_sent','community_social_unknown') order by id desc limit 8`,
 ]);
 const deliveries=await Promise.all(['x','instagram','threads','whop'].map(async network=>{
  if(network==='whop') {
   const rows=Array.from(whop) as unknown as Receipt[];
   if(!rows.length&&status[0]?.details?.deliveries?.whop)rows.push({event:'status',details:{state:status[0].details.deliveries.whop},created_at:status[0].created_at});
   // Whop legacy receipts have no review hash. Label that evidence limitation.
   return deliveryEvidence(network,rows,c.review.sha256,rows.find(r=>r.details.reviewHash)?.details.reviewHash,held);
  }
  const candidates=approvals.filter(a=>a.network===network);
  if(!candidates.length)return deliveryEvidence(network,[],c.review.sha256,null,held);
  const ids=candidates.map(a=>a.id);
  const rows=await sql`select event,details,created_at,entity_id from os_activity where entity_id=any(${ids}) and event in ('buffer_publish_started','buffer_publish_receipt','buffer_publish_checked','buffer_publish_unknown','buffer_publish_reconciled') order by id desc limit 20`;
  const receipt=rows.find(r=>r.details?.published===true)||rows[0];
  const binding=candidates.find(a=>a.id===receipt?.entity_id)||candidates.find(a=>a.review_hash===c.review.sha256)||candidates[0];
  const selected=rows.filter(r=>r.entity_id===binding.id) as unknown as Receipt[];
  if(!selected.length)selected.push({event:'prepared',details:{},created_at:''});
  return deliveryEvidence(network,selected,c.review.sha256,binding.review_hash,held);
 }));
 return [...deliveries,communityDeliveryEvidence(Array.from(community) as unknown as Receipt[],c.review.sha256,held)];
}
