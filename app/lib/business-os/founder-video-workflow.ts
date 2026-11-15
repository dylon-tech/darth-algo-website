import {randomUUID,createHash} from 'node:crypto';
import {db} from '../affiliate-db';
import {getFounderMediaAsset} from './founder-media';
import {validateFounderVideoSettings} from './founder-video-publication-policy';
import {videoSourceGate} from './founder-video-protocol';
import type {FounderContentItem} from './founder-content-model';
/** Durable local plans only. This module cannot import, draft, approve or publish externally. */
export const founderVideoWorkflowSchema=`create table if not exists os_founder_video_plans (
 id uuid primary key,item_id uuid not null,content_version integer not null,
 snapshot jsonb not null,snapshot_hash text not null,state text not null default 'blocked' check(state in ('blocked','superseded')),
 created_at timestamptz not null default now(),unique(item_id,content_version,snapshot_hash)
);`;
let ready:Promise<void>|undefined;
export function ensureFounderVideoWorkflowSchema(){return ready??=db().begin(async tx=>{await tx`select pg_advisory_xact_lock(73111511)`;await tx.unsafe(founderVideoWorkflowSchema);}).then(()=>{}).catch(e=>{ready=undefined;throw e;});}
export const founderVideoExecutionStatus=()=>({enabled:false as const,canApprove:false as const,blockers:['The website import source must pass an end-to-end Content-Length and byte-identity check.','Live website tool schemas and zero-credit publishing capability must be verified.','YouTube verification requires an owner handoff; the website has no verified handoff transport.']});
export async function prepareFounderVideoPlan(input:{itemId:string;expectedVersion:number;publishAt:string;settings:unknown},now=new Date()){
 const settings=validateFounderVideoSettings(input.settings),at=Date.parse(input.publishAt);
 if(!Number.isFinite(at)||at<now.getTime()||at>now.getTime()+7*86400000)throw Error('VIDEO_TIME_INVALID');
 const [row]=await db()`select id,version,data from os_founder_content_items where id=${input.itemId}`;
 const item=row?{...row.data,id:row.id,version:Number(row.version)} as FounderContentItem:null;
 if(!item||item.version!==input.expectedVersion||item.type!=='video'||!item.mediaAssetId||!item.mediaVerifiedAt||!['checking','ready'].includes(item.status))throw Error('VIDEO_VERSION_NOT_READY');
 if(item.deliveries?.some(d=>['scheduled','publishing','published','outcome_unknown'].includes(d.state)))throw Error('VIDEO_ALREADY_DISPATCHED');
 if(item.destinations.length!==3||!['youtube','tiktok','instagram'].every(n=>item.destinations.includes(n as typeof item.destinations[number])))throw Error('VIDEO_DESTINATIONS_REQUIRED');
 const asset=await getFounderMediaAsset(item.mediaAssetId);
 if(!asset||asset.type!=='video'||!asset.validation.fullDecode||!asset.durationSeconds||asset.durationSeconds<3||asset.durationSeconds>900)throw Error('VIDEO_MEDIA_NOT_VERIFIED');
 const snapshot={itemId:item.id,contentVersion:item.version,mediaAssetId:asset.id,mediaSha256:asset.sha256,bytes:asset.bytes,mimeType:asset.mimeType,caption:item.caption,publishAt:new Date(at).toISOString(),settings};
 if(!snapshot.caption.trim()||snapshot.caption.length>2200)throw Error('VIDEO_CAPTION_REQUIRED');
 const hash=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),source=videoSourceGate(asset.bytes);
 await ensureFounderVideoWorkflowSchema();
 return db().begin(async tx=>{
  const [current]=await tx`select id,version,data from os_founder_content_items where id=${item.id} for update`;
  if(!current||Number(current.version)!==item.version||JSON.stringify(current.data)!==JSON.stringify(row.data))throw Error('VIDEO_VERSION_CHANGED');
  const [previous]=await tx`select id,state from os_founder_video_plans where item_id=${item.id} and content_version=${item.version} and snapshot_hash=${hash}`;
  if(previous)return {id:String(previous.id),hash,snapshot,state:String(previous.state),source,...founderVideoExecutionStatus()};
  await tx`update os_founder_video_plans set state='superseded' where item_id=${item.id} and state='blocked'`;
  const id=randomUUID();await tx`insert into os_founder_video_plans(id,item_id,content_version,snapshot,snapshot_hash) values(${id},${item.id},${item.version},${tx.json(snapshot)},${hash})`;
  return {id,hash,snapshot,state:'blocked' as const,source,...founderVideoExecutionStatus()};
 });
}
export async function listFounderVideoPlans(itemId:string){await ensureFounderVideoWorkflowSchema();const plans=await db()`select id,item_id,content_version,snapshot,snapshot_hash,state,created_at from os_founder_video_plans where item_id=${itemId} order by created_at desc limit 20`;return {...founderVideoExecutionStatus(),plans};}
