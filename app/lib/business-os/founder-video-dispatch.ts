import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {db} from '../affiliate-db';
import {founderVideoSourceLimit} from './founder-video-source-transport';
import {getFounderMediaAsset,getFounderMediaBytes} from './founder-media';
import {hasFounderPublicationAttempt} from './founder-publication';
import type {FounderContentItem} from './founder-content-model';
import {validateFounderVideoSettings,type FounderVideoSettings} from './founder-video-publication-policy';
import {videoDraftRequest,verifyVideoDraft,videoPublishRequest,instagramVideoRequest,type VideoDraftEvidence} from './founder-video-protocol';
import {withFounderVideoMcp,type FounderVideoManifest} from './founder-video-mcp';
type Sql=ReturnType<typeof db>;
type Row=Record<string,unknown>;
type VideoReceipt={network:string;state:string;providerId:string;url:string|null;checkedAt:string;contentVersion:number};
type Snapshot={itemId:string;version:number;mediaAssetId:string;mediaSha256:string;coverAssetId:string;coverSha256:string;coverBytes:number;coverMimeType:string;consentScope:['video','cover'];coverApplied:false;previewSelection:'per_platform';coverAssignment:{youtube:'custom_thumbnail_requested';tiktok:'platform_selected';instagram:'platform_selected'};bytes:number;mimeType:string;caption:string;title:string;publishAt:string;settings:FounderVideoSettings};
export const videoDispatchSchema=`create table if not exists os_founder_video_publications(
 id uuid primary key,item_id uuid not null,content_version integer not null,snapshot jsonb not null,snapshot_hash text not null,
 manifest jsonb not null,state text not null default 'needs_import',import_consented_at timestamptz,approved_at timestamptz,
 export_token text not null,export_expires_at timestamptz not null,upload_id text,video_url text,draft_request jsonb,draft_evidence jsonb,
 social_state text not null default 'waiting',ig_state text not null default 'waiting',ig_container_id text,ig_job_id text,
 receipts jsonb not null default '[]',error_code text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(item_id,content_version,snapshot_hash));
 create table if not exists os_founder_video_calls(
 publication_id uuid not null references os_founder_video_publications(id),stage text not null,state text not null,
 attempts integer not null default 0,started_at timestamptz not null,next_check_at timestamptz,updated_at timestamptz not null,
 primary key(publication_id,stage));
 alter table os_founder_video_publications add column if not exists cover_export_token text;
 alter table os_founder_video_publications add column if not exists cover_image_id text;`;
let ready:Promise<void>|undefined;
export const founderVideoPublishingEnabled=()=>process.env.VERCEL_ENV==='production'&&process.env.FOUNDER_VIDEO_PUBLISHING_ENABLED==='true';
export function ensureVideoDispatchSchema(){return ready??=db().begin(async tx=>{await tx`select pg_advisory_xact_lock(73111512)`;await tx.unsafe(videoDispatchSchema);}).then(()=>{}).catch(e=>{ready=undefined;throw e;});}
function stable(v:unknown):unknown{return Array.isArray(v)?v.map(stable):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;}
const snapshotHash=(v:unknown)=>sha(JSON.stringify(stable(v)));
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const item=(r:Row)=>({...r.data as FounderContentItem,id:String(r.id),version:Number(r.version)});
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
const providerId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&!/[\s\x00-\x1f]/.test(v);
const object=(v:unknown):v is Row=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
function https(v:unknown){if(typeof v!=='string'||v.length>16000)return false;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash;}catch{return false;}}
function matches(i:FounderContentItem,s:Snapshot){return i.id===s.itemId&&i.version===s.version&&i.type==='video'&&i.mediaAssetId===s.mediaAssetId&&i.coverAssetId===s.coverAssetId&&Boolean(i.mediaVerifiedAt)&&i.caption===s.caption&&i.title===s.title&&['checking','ready'].includes(i.status)&&i.destinations.length===3&&['youtube','tiktok','instagram'].every(n=>i.destinations.includes(n as typeof i.destinations[number]))&&!i.deliveries?.some(d=>['scheduled','publishing','published','outcome_unknown'].includes(d.state));}
export async function hasFounderVideoAttempt(itemId:string,sql:Sql=db()){
 const [table]=await sql`select to_regclass('public.os_founder_video_publications') is not null as present`;if(!table?.present)return false;
 const [r]=await sql`select id from os_founder_video_publications where item_id=${itemId} and import_consented_at is not null and state<>'discarded' limit 1`;return Boolean(r);
}
function view(r:Row){return {id:r.id,itemId:r.item_id,version:r.content_version,snapshot:r.snapshot,hash:r.snapshot_hash,state:r.state,importConsentedAt:r.import_consented_at,approvedAt:r.approved_at,socialState:r.social_state,instagramState:r.ig_state,draftEvidence:r.draft_evidence,receipts:r.receipts,errorCode:r.error_code,updatedAt:r.updated_at,enabled:founderVideoPublishingEnabled()};}
export async function listFounderVideoPublications(itemId?:string){await ensureVideoDispatchSchema();const rows=itemId?await db()`select * from os_founder_video_publications where item_id=${itemId} order by created_at desc limit 30`:await db()`select * from os_founder_video_publications order by created_at desc limit 30`;return rows.map(view);}
async function load(id:string){await ensureVideoDispatchSchema();const [r]=await db()`select * from os_founder_video_publications where id=${id}`;if(!r)throw Error('VIDEO_NOT_FOUND');return r;}
function enabled(){if(!founderVideoPublishingEnabled())throw Error('VIDEO_PUBLISHING_DISABLED');}
async function locked(tx:Sql,p:Row,now:Date,allowAfterDue=false){
 const s=p.snapshot as Snapshot,[r]=await tx`select id,version,data from os_founder_content_items where id=${s.itemId} for update`;
 if(!r||!matches(item(r),s)||snapshotHash(s)!==p.snapshot_hash||await hasFounderPublicationAttempt(s.itemId,tx))throw Error('VIDEO_VERSION_CHANGED');
 const [control]=await tx`select paused from os_control where id=1 for update`;if(!control||control.paused)throw Error('VIDEO_WORKER_PAUSED');
 const [current]=await tx`select * from os_founder_video_publications where id=${String(p.id)} for update`;if(!current||current.state==='superseded')throw Error('VIDEO_SUPERSEDED');
 if(!allowAfterDue&&now.getTime()>Date.parse(s.publishAt)+15*60000)throw Error('VIDEO_TIME_EXPIRED');return current;
}
export async function prepareFounderVideoPublication(input:{itemId:string;expectedVersion:number;publishAt:string;settings:unknown},now=new Date()){
 enabled();const settings=validateFounderVideoSettings(input.settings),at=Date.parse(input.publishAt);if(!Number.isFinite(at)||at<now.getTime()||at>now.getTime()+7*86400000)throw Error('VIDEO_TIME_INVALID');
 const [r]=await db()`select id,version,data from os_founder_content_items where id=${input.itemId}`;if(!r)throw Error('VIDEO_NOT_FOUND');const i=item(r),a=i.mediaAssetId?await getFounderMediaAsset(i.mediaAssetId):null;
 if(i.version!==input.expectedVersion||!a||a.type!=='video'||!a.validation.fullDecode||!a.durationSeconds||a.durationSeconds<3||a.durationSeconds>900)throw Error('VIDEO_MEDIA_NOT_READY');
 const cover=i.coverAssetId?await getFounderMediaAsset(i.coverAssetId):null;if(!cover||cover.type!=='image'||!cover.validation.fullDecode||!['image/png','image/jpeg'].includes(cover.mimeType)||cover.bytes>4_000_000)throw Error('VIDEO_COVER_NOT_VERIFIED');
 if(a.bytes>founderVideoSourceLimit())throw Error('VIDEO_LARGE_SOURCE_UNVERIFIED');
 const snapshot:Snapshot={itemId:i.id,version:i.version,mediaAssetId:a.id,mediaSha256:a.sha256,coverAssetId:cover.id,coverSha256:cover.sha256,coverBytes:cover.bytes,coverMimeType:cover.mimeType,consentScope:['video','cover'],coverApplied:false,previewSelection:'per_platform',coverAssignment:{youtube:'custom_thumbnail_requested',tiktok:'platform_selected',instagram:'platform_selected'},bytes:a.bytes,mimeType:a.mimeType,caption:i.caption,title:i.title,publishAt:new Date(at).toISOString(),settings};
 if(!matches(i,snapshot)||!i.caption.trim()||i.caption.length>2200)throw Error('VIDEO_VERSION_NOT_READY');
 const manifest=await withFounderVideoMcp(async m=>{await m.verifyAccounts(settings);return m.manifest();});
 const hash=snapshotHash(snapshot);await ensureVideoDispatchSchema();return db().begin(async transaction=>{const tx=transaction as unknown as Sql;
 const [current]=await tx`select id,version,data from os_founder_content_items where id=${i.id} for update`;if(!current||!matches(item(current),snapshot))throw Error('VIDEO_VERSION_CHANGED');
 const [existing]=await tx`select * from os_founder_video_publications where item_id=${i.id} and content_version=${i.version} and snapshot_hash=${hash}`;if(existing)return view(existing);
 if(await hasFounderVideoAttempt(i.id,tx)||await hasFounderPublicationAttempt(i.id,tx))throw Error('VIDEO_EXISTING_ATTEMPT');
 await tx`update os_founder_video_publications set state='superseded' where item_id=${i.id} and import_consented_at is null`;
 const id=randomUUID();const [p]=await tx`insert into os_founder_video_publications(id,item_id,content_version,snapshot,snapshot_hash,manifest,export_token,cover_export_token,export_expires_at) values(${id},${i.id},${i.version},${tx.json(snapshot)},${hash},${tx.json(manifest)},${randomBytes(32).toString('base64url')},${randomBytes(32).toString('base64url')},${new Date(now.getTime()+3600000).toISOString()}) returning *`;return view(p);});
}
export async function readFounderVideoSource(id:string,token:string,now=new Date()){
 if(!founderVideoPublishingEnabled()||!validId(id)||!/^[\w-]{43}$/.test(token))return null;
 try{const p=await load(id),s=p.snapshot as Snapshot;if(!p.import_consented_at||!['import_started','import_processing','import_ready','draft_started','needs_review','approved','publishing','complete'].includes(String(p.state))||Date.parse(String(p.export_expires_at))<=now.getTime()||!timingSafeEqual(Buffer.from(sha(token),'hex'),Buffer.from(sha(String(p.export_token)),'hex')))return null;
 const [r]=await db()`select id,version,data from os_founder_content_items where id=${s.itemId}`;if(!r||!matches(item(r),s)||snapshotHash(s)!==p.snapshot_hash)return null;
 const media=await getFounderMediaBytes(s.mediaAssetId);if(!media||media.bytes.length!==s.bytes||s.bytes>founderVideoSourceLimit()||sha(media.bytes)!==s.mediaSha256||media.asset.mimeType!==s.mimeType)return null;return media;
 }catch{return null;}
}
export async function readFounderVideoCover(id:string,token:string,now=new Date()){
 if(!founderVideoPublishingEnabled()||!validId(id)||!/^[\w-]{43}$/.test(token))return null;
 try{const p=await load(id),s=p.snapshot as Snapshot;
  if(!p.import_consented_at||!p.cover_export_token||JSON.stringify(s.consentScope)!==JSON.stringify(['video','cover'])||!['cover_import_started','import_ready','draft_started','needs_review','approved','publishing','complete'].includes(String(p.state))||Date.parse(String(p.export_expires_at))<=now.getTime()||!timingSafeEqual(Buffer.from(sha(token),'hex'),Buffer.from(sha(String(p.cover_export_token)),'hex')))return null;
  const [r]=await db()`select id,version,data from os_founder_content_items where id=${s.itemId}`;if(!r||!matches(item(r),s)||snapshotHash(s)!==p.snapshot_hash)return null;
  const cover=await getFounderMediaBytes(s.coverAssetId);if(!cover||cover.bytes.length!==s.coverBytes||s.coverBytes>4_000_000||sha(cover.bytes)!==s.coverSha256||cover.asset.mimeType!==s.coverMimeType||!['image/png','image/jpeg'].includes(s.coverMimeType))return null;return cover;
 }catch{return null;}
}

async function notice(p:Row,message:string,now:Date){const [t]=await db()`select to_regclass('public.os_messages') is not null as present`;if(!t?.present)return;const body=`Result: Video posting update.\nNext: ${message}\nSource: /owner?tab=content&item=${p.item_id}\nVersion: ${p.content_version}`;await db()`insert into os_messages(id,department,role,body,run_id,created_at) values(${String(p.id)},'content','agent',${body},null,${now.toISOString()}) on conflict(id) do update set body=excluded.body,created_at=excluded.created_at where os_messages.body<>excluded.body`;}
async function fail(p:Row,code:string,now:Date){await db()`update os_founder_video_publications set state='attention',error_code=${code},updated_at=${now.toISOString()} where id=${String(p.id)}`;await notice(p,'An action needs review. No automatic replacement or retry will be made.',now);}
// Claims are durable before network. A timeout after claim NEVER authorizes a replay.
async function claim(p:Row,stage:string,expected:string,next:string,now:Date,read=false){return db().begin(async transaction=>{const tx=transaction as unknown as Sql,current=await locked(tx,p,now,read);if(String(current.state)!==expected)return false;
 const [prior]=await tx`select * from os_founder_video_calls where publication_id=${String(p.id)} and stage=${stage} for update`;
 if(read){if(prior&&(Number(prior.attempts)>=6||now.getTime()-Date.parse(String(prior.started_at))>86400000)){
  await tx`update os_founder_video_publications set state='attention',error_code='VIDEO_CHECK_LIMIT',social_state=case when ${stage}='social_check' then 'needs_reconciliation' else social_state end,ig_state=case when ${stage}='ig_continue' then 'needs_reconciliation' else ig_state end where id=${String(p.id)}`;return false;}
  if(prior&&prior.state==='started'){
   if(now.getTime()-Date.parse(String(prior.updated_at))<300000)return false;
   if(stage==='ig_continue'){await tx`update os_founder_video_publications set state='attention',ig_state='outcome_unknown',error_code='VIDEO_INSTAGRAM_CONTINUATION_UNKNOWN' where id=${String(p.id)}`;return false;}
  }
  if(prior&&Date.parse(String(prior.next_check_at))>now.getTime())return false;
 }
 else if(prior)return false;
 await tx`insert into os_founder_video_calls(publication_id,stage,state,attempts,started_at,next_check_at,updated_at) values(${String(p.id)},${stage},'started',1,${now.toISOString()},${new Date(now.getTime()+30000).toISOString()},${now.toISOString()}) on conflict(publication_id,stage) do update set state='started',attempts=os_founder_video_calls.attempts+1,next_check_at=excluded.next_check_at,updated_at=excluded.updated_at`;
 await tx`update os_founder_video_publications set state=${next},updated_at=${now.toISOString()} where id=${String(p.id)}`;return true;});}
async function finished(p:Row,stage:string,now:Date){await db()`update os_founder_video_calls set state='returned',updated_at=${now.toISOString()} where publication_id=${String(p.id)} and stage=${stage}`;}
async function importResult(p:Row,result:Row,now:Date){
 if((p.upload_id&&p.upload_id!==result.uploadId)||!providerId(result.uploadId)||!['waiting','processing','ready'].includes(String(result.status))||(result.status==='ready'&&!https(result.videoUrl)))return fail(p,'VIDEO_IMPORT_UNVERIFIED',now);
 await db()`update os_founder_video_publications set upload_id=${result.uploadId},video_url=${result.status==='ready'?String(result.videoUrl):null},state=${result.status==='ready'?'import_ready':'import_processing'},updated_at=${now.toISOString()} where id=${String(p.id)}`;
}
export async function consentFounderVideoImport(input:{id:string;expectedHash:string;confirmImport:boolean},now=new Date()){
 enabled();if(input.confirmImport!==true)throw Error('VIDEO_IMPORT_CONSENT_REQUIRED');const p=await load(input.id);if(p.snapshot_hash!==input.expectedHash)throw Error('VIDEO_REVIEW_CHANGED');
 if(p.state!=='needs_import')return view(p);const s=p.snapshot as Snapshot;if(JSON.stringify(s.consentScope)!==JSON.stringify(['video','cover']))throw Error('VIDEO_COVER_CONSENT_REQUIRED');
 return withFounderVideoMcp(async m=>{await m.verifyAccounts(s.settings);m.assertWriteReady();
 // Consent, byte check and claim precede exposing the capability or importing.
 const media=await getFounderMediaBytes(s.mediaAssetId);if(!media||media.bytes.length!==s.bytes||sha(media.bytes)!==s.mediaSha256)throw Error('VIDEO_MEDIA_CHANGED');
 await db().begin(async transaction=>{const tx=transaction as unknown as Sql,current=await locked(tx,p,now);if(current.state!=='needs_import')return;await tx`update os_founder_video_publications set import_consented_at=${now.toISOString()},export_expires_at=${new Date(now.getTime()+3600000).toISOString()} where id=${String(p.id)}`;});
 if(!await claim(p,'import','needs_import','import_started',now))return view(await load(input.id));
 try{const result=await m.importVideo(`https://www.darthalgo.com/api/founder-video-source/${String(p.id)}/${p.export_token}`,s.title);await importResult(p,result,now);await finished(p,'import',now);}catch{await fail(p,'VIDEO_IMPORT_OUTCOME_UNKNOWN',now);}return view(await load(input.id));
 },{expectedManifest:p.manifest as FounderVideoManifest});
}
export async function advanceFounderVideoPreparation(id:string,now=new Date()){
 enabled();let p=await load(id);const s=p.snapshot as Snapshot;
 return withFounderVideoMcp(async m=>{await m.verifyAccounts(s.settings);m.assertWriteReady();
 if(p.state==='import_processing'&&providerId(p.upload_id)&&await claim(p,'import_check','import_processing','import_processing',now,true)){
  try{await importResult(p,await m.uploadStatus(String(p.upload_id)),now);await finished(p,'import_check',now);}catch{await finished(p,'import_check',now);}return view(await load(id));
 }
 if(p.state==='import_ready'){
  if(JSON.stringify(s.consentScope)!==JSON.stringify(['video','cover']))throw Error('VIDEO_COVER_CONSENT_REQUIRED');
  if(!p.cover_image_id){
   if(!providerId(p.cover_export_token)||Date.parse(String(p.export_expires_at))<=now.getTime())throw Error('VIDEO_COVER_SOURCE_EXPIRED');
   const cover=await getFounderMediaBytes(s.coverAssetId);
   if(!cover||cover.bytes.length!==s.coverBytes||sha(cover.bytes)!==s.coverSha256||cover.asset.mimeType!==s.coverMimeType)throw Error('VIDEO_COVER_CHANGED');
   if(!await claim(p,'cover_import','import_ready','cover_import_started',now))return view(await load(id));
   try{
    const imported=await m.importCover(`https://www.darthalgo.com/api/founder-video-cover/${String(p.id)}/${p.cover_export_token}`,`darth-cover-${String(p.id)}.${s.coverMimeType==='image/png'?'png':'jpg'}`);
    if(!providerId(imported.imageId)||imported.sizeBytes!==s.coverBytes||imported.mimeType!==s.coverMimeType)throw Error('VIDEO_COVER_IMPORT_UNVERIFIED');
    await db()`update os_founder_video_publications set cover_image_id=${imported.imageId},state='import_ready',updated_at=${now.toISOString()} where id=${id}`;await finished(p,'cover_import',now);p=await load(id);
   }catch{await fail(p,'VIDEO_COVER_IMPORT_OUTCOME_UNKNOWN',now);return view(await load(id));}
  }
  const request=videoDraftRequest({caption:s.caption,settings:s.settings},String(p.upload_id),String(p.cover_image_id));
  if(!await claim(p,'draft','import_ready','draft_started',now))return view(await load(id));
  await db()`update os_founder_video_publications set draft_request=${db().json(request)} where id=${id}`;
  try{const evidence=verifyVideoDraft(await m.createDraft(request),request);await db()`update os_founder_video_publications set draft_evidence=${db().json(evidence)},state='needs_review',updated_at=${now.toISOString()} where id=${id}`;await finished(p,'draft',now);await notice(p,'Review the imported video, exact platform settings and provider draft before approving publication.',now);}catch{await fail(p,'VIDEO_DRAFT_OUTCOME_UNKNOWN',now);}
 }
 return view(await load(id));
 },{expectedManifest:p.manifest as FounderVideoManifest});
}
export async function approveFounderVideoPublication(input:{id:string;expectedHash:string;providerRevision:string;confirmApproved:boolean},now=new Date()){
 enabled();if(input.confirmApproved!==true)throw Error('VIDEO_FINAL_APPROVAL_REQUIRED');const p=await load(input.id),s=p.snapshot as Snapshot,e=p.draft_evidence as VideoDraftEvidence;
 if(p.state!=='needs_review'||p.snapshot_hash!==input.expectedHash||!e||e.revision!==input.providerRevision)throw Error('VIDEO_REVIEW_CHANGED');
 return withFounderVideoMcp(async m=>{await m.verifyAccounts(s.settings);m.assertWriteReady();const current=verifyVideoDraft(await m.getDraft(e.postId),p.draft_request as ReturnType<typeof videoDraftRequest>);videoPublishRequest(e,current);
 const approved=await db().begin(async transaction=>{const tx=transaction as unknown as Sql,lockedRow=await locked(tx,p,now);if(lockedRow.state!=='needs_review'||JSON.stringify(lockedRow.draft_evidence)!==JSON.stringify(p.draft_evidence))throw Error('VIDEO_REVIEW_CHANGED');await tx`update os_founder_video_publications set state='approved',approved_at=${now.toISOString()},updated_at=${now.toISOString()} where id=${String(p.id)}`;return {...view(p),state:'approved',approvedAt:now.toISOString()};});
 await notice(p,'Final permission is saved for this exact video version. Automatic execution is not connected; check the saved posting plan and receipts.',now);return approved;
 },{expectedManifest:p.manifest as FounderVideoManifest});
}
function nativeUrl(value:unknown,platform:string){
 if(typeof value!=='string'||value.length>2000)return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;const host=u.hostname.toLowerCase();u.hash='';
 if(platform==='YOUTUBE'){
  if(host==='youtu.be'&&/^\/[A-Za-z0-9_-]{11}$/.test(u.pathname)){u.search='';return u.href;}
  if(!['youtube.com','www.youtube.com'].includes(host))return null;
  if(u.pathname==='/watch'&&/^[A-Za-z0-9_-]{11}$/.test(u.searchParams.get('v')||'')){const v=u.searchParams.get('v')!;u.search='';u.searchParams.set('v',v);return u.href;}
  if(/^\/(shorts|live)\/[A-Za-z0-9_-]{11}\/?$/.test(u.pathname)){u.search='';return u.href;}return null;
 }
 if(platform==='TIKTOK'&&['tiktok.com','www.tiktok.com'].includes(host)&&/^\/@[\w.-]+\/video\/\d+\/?$/.test(u.pathname)){u.search='';return u.href;}
 if(platform==='INSTAGRAM'&&['instagram.com','www.instagram.com'].includes(host)&&/^\/(reel|p)\/[\w-]+\/?$/.test(u.pathname)){u.search='';return u.href;}
 return null;
 }catch{return null;}
}
async function socialResult(p:Row,result:Row,now:Date){
 const e=p.draft_evidence as VideoDraftEvidence,s=p.snapshot as Snapshot;
 if(result.postId!==undefined&&result.postId!==e.postId)return fail(p,'VIDEO_PROVIDER_ID_CHANGED',now);
 if(result.status==='verification_required'){
  // The currently verified response contract provides no website verification URL.
  // Do not invent a link or replay a publish call. Existing IDs/revision are kept.
  await db()`update os_founder_video_publications set state='attention',social_state='verification_required',error_code='VIDEO_YOUTUBE_OWNER_VERIFICATION',updated_at=${now.toISOString()} where id=${String(p.id)}`;
  await notice(p,'YouTube requires owner verification. Complete it through vidIQ; no website handoff or automatic replay is available. The existing draft is retained.',now);return;
 }
 if(!Array.isArray(result.destinations)||result.destinations.length!==2)return fail(p,'VIDEO_RECEIPTS_UNVERIFIED',now);
 const receipts:VideoReceipt[]=[];for(const [index,platform] of ['YOUTUBE','TIKTOK'].entries()){
  const selected=result.destinations.filter((d:unknown)=>object(d)&&d.publicationId===e.publicationIds[index]);
  if(selected.length!==1)return fail(p,'VIDEO_RECEIPTS_UNVERIFIED',now);const d=selected[0];
  if((d.postId!==undefined&&d.postId!==e.postId)||d.platform!==platform||d.platformAccountId!==(platform==='YOUTUBE'?s.settings.youtube.platformAccountId:s.settings.tiktok.platformAccountId)||(d.credits!==undefined&&d.credits!==0))return fail(p,'VIDEO_ACCOUNT_OR_COST_CHANGED',now);
  const url=nativeUrl(d.postUrl,platform),publicChoice=platform==='YOUTUBE'?s.settings.youtube.privacyStatus==='public':s.settings.tiktok.privacyLevel==='PUBLIC_TO_EVERYONE';
  const state=d.status==='completed'?(url&&publicChoice?'published':'completed_unconfirmed'):['submitted','inProgress'].includes(d.status)?'submitted':['failed','cancelled','refused'].includes(d.status)?'failed':'needs_reconciliation';
  receipts.push({network:platform.toLowerCase(),state,providerId:e.publicationIds[index],url,checkedAt:now.toISOString(),contentVersion:s.version});
 }
 await db().begin(async transaction=>{const tx=transaction as unknown as Sql;
 const [current]=await tx`select receipts,ig_state from os_founder_video_publications where id=${String(p.id)} for update`;
 const saved=Array.isArray(current.receipts)?current.receipts as VideoReceipt[]:[];
 const merged=receipts.map(receipt=>{const prior=saved.find(r=>r.network===receipt.network);return prior&&['published','completed_unconfirmed','failed'].includes(String(prior.state))&&receipt.state==='submitted'?prior:receipt;});
 const state=merged.some(r=>r.state==='needs_reconciliation')?'needs_reconciliation':merged.some(r=>r.state==='submitted')?'submitted':merged.some(r=>r.state==='failed')?'failed':'completed';
 const combined=[...saved.filter(r=>r.network==='instagram'),...merged];
 await tx`update os_founder_video_publications set social_state=${state},state=case when ${state} in ('failed','needs_reconciliation') then 'attention' when ${state}='completed' and ig_state in ('published','completed_unconfirmed') then 'complete' else state end,receipts=${tx.json(combined)},updated_at=${now.toISOString()} where id=${String(p.id)}`;
 });
}
async function igResult(p:Row,result:Row,now:Date){
 const s=p.snapshot as Snapshot;if(result.platformAccountId!==s.settings.instagram.platformAccountId)return fail(p,'VIDEO_INSTAGRAM_ACCOUNT_CHANGED',now);
 if(result.status==='PUBLISHED'){
  const url=nativeUrl(result.permalink,'INSTAGRAM');if(!providerId(result.mediaId))return fail(p,'VIDEO_INSTAGRAM_RECEIPT_UNVERIFIED',now);
  // Receipt appended atomically, preserving concurrently recorded social receipts.
  await db()`update os_founder_video_publications set ig_state=${url?'published':'completed_unconfirmed'},state=case when social_state='completed' then 'complete' else state end,receipts=receipts || ${db().json([{network:'instagram',state:url?'published':'completed_unconfirmed',providerId:result.mediaId,url,checkedAt:now.toISOString(),contentVersion:s.version}])}::jsonb,updated_at=${now.toISOString()} where id=${String(p.id)}`;return;
 }
 if(result.status==='IN_PROGRESS'&&providerId(result.containerId)){
  if(p.ig_container_id&&p.ig_container_id!==result.containerId)return fail(p,'VIDEO_INSTAGRAM_CONTAINER_CHANGED',now);
  await db()`update os_founder_video_publications set ig_state='processing',ig_container_id=${result.containerId},updated_at=${now.toISOString()} where id=${String(p.id)}`;return;
 }
 if(result.status==='inprogress'&&providerId(result.mcpJobId)){
  await db()`update os_founder_video_publications set state='attention',ig_state='needs_reconciliation',ig_job_id=${result.mcpJobId},error_code='VIDEO_INSTAGRAM_JOB_HANDOFF_REQUIRED',updated_at=${now.toISOString()} where id=${String(p.id)}`;
  await notice(p,'Instagram preparation needs a provider handoff. The existing job is retained; no replacement or unverified publish continuation will run.',now);return;
 }
 await fail(p,'VIDEO_INSTAGRAM_OUTCOME_UNKNOWN',now);
}
async function reserveVideoSession(p:Row,now:Date){
 return db().begin(async transaction=>{const tx=transaction as unknown as Sql;
  await tx`select id from os_founder_video_publications where id=${String(p.id)} for update`;
  const [prior]=await tx`select attempts,started_at,next_check_at from os_founder_video_calls where publication_id=${String(p.id)} and stage='session' for update`;
  if(prior&&(Number(prior.attempts)>=12||now.getTime()-Date.parse(String(prior.started_at))>86400000)){
   await tx`update os_founder_video_publications set state='attention',social_state=case when social_state in ('waiting','started','submitted','outcome_unknown') then 'needs_reconciliation' else social_state end,ig_state=case when ig_state in ('waiting','started','processing') then 'needs_reconciliation' else ig_state end,error_code='VIDEO_SESSION_LIMIT' where id=${String(p.id)}`;return false;
  }
  if(prior&&Date.parse(String(prior.next_check_at))>now.getTime())return false;
  await tx`insert into os_founder_video_calls(publication_id,stage,state,attempts,started_at,next_check_at,updated_at) values(${String(p.id)},'session','reserved',1,${now.toISOString()},${new Date(now.getTime()+30000).toISOString()},${now.toISOString()}) on conflict(publication_id,stage) do update set attempts=os_founder_video_calls.attempts+1,next_check_at=excluded.next_check_at,updated_at=excluded.updated_at`;return true;
 });
}
export async function executeFounderVideoPublication(id:string,now=new Date()){
 enabled();let p=await load(id);const s=p.snapshot as Snapshot;
 if(!p.approved_at||!['approved','publishing','attention'].includes(String(p.state)))return view(p);
 if(p.state==='attention'&&!['submitted','outcome_unknown','started'].includes(String(p.social_state)))return view(p);
 const started=Date.now(),clock=()=>new Date(now.getTime()+Date.now()-started);
 if(now.getTime()<Date.parse(s.publishAt))return view(p);
 // New sends expire; receipt-only reconciliation remains possible for known IDs.
 if(now.getTime()>Date.parse(s.publishAt)+900000&&p.state==='approved'){await fail(p,'VIDEO_TIME_EXPIRED',now);return view(await load(id));}
 if(!await reserveVideoSession(p,clock()))return view(await load(id));
 return withFounderVideoMcp(async m=>{
 await m.verifyAccounts(s.settings);m.assertWriteReady();const e=p.draft_evidence as VideoDraftEvidence;
 if(p.social_state==='waiting'&&['approved','publishing'].includes(String(p.state))){
  const current=verifyVideoDraft(await m.getDraft(e.postId),p.draft_request as ReturnType<typeof videoDraftRequest>),args=videoPublishRequest(e,current);
  if(await claim(p,'social_publish',String(p.state),'publishing',clock())){
   await db()`update os_founder_video_publications set social_state='started' where id=${id}`;
   try{await socialResult(p,await m.publish(args.postId,args.revision,args.publicationIds),clock());await finished(p,'social_publish',clock());}catch{await db()`update os_founder_video_publications set social_state='outcome_unknown' where id=${id}`;await fail(p,'VIDEO_SOCIAL_OUTCOME_UNKNOWN',clock());}
  }
 }
 p=await load(id);
 if(p.ig_state==='waiting'&&p.state==='publishing'&&https(p.video_url)){
  const args=instagramVideoRequest({caption:s.caption,settings:s.settings},String(p.video_url),{platformAccountId:s.settings.instagram.platformAccountId,canPublish:true,publishingAvailable:true});
  if(await claim(p,'ig_publish','publishing','publishing',clock())){
   await db()`update os_founder_video_publications set ig_state='started' where id=${id}`;
   try{await igResult(p,await m.instagram(args),clock());await finished(p,'ig_publish',clock());}catch{await db()`update os_founder_video_publications set ig_state='outcome_unknown' where id=${id}`;await fail(p,'VIDEO_INSTAGRAM_OUTCOME_UNKNOWN',clock());}
  }
 }
 p=await load(id);
 if(['submitted','outcome_unknown','started'].includes(String(p.social_state))){
  // Never retry publish; known provider draft identity permits read-only status.
  if(await claim(p,'social_check',String(p.state),String(p.state),clock(),true)){
   try{await socialResult(p,await m.postStatus(e.postId),clock());}catch{/* Read-only failures consume the durable bounded budget. */}await finished(p,'social_check',clock());
  }
 }
 p=await load(id);
 if(p.ig_state==='processing'&&providerId(p.ig_container_id)&&p.state==='publishing'){
  if(await claim(p,'ig_continue','publishing','publishing',clock(),true)){
   try{await igResult(p,await m.instagram({platformAccountId:s.settings.instagram.platformAccountId,containerId:String(p.ig_container_id)}),clock());await finished(p,'ig_continue',clock());}catch{await db()`update os_founder_video_publications set ig_state='outcome_unknown' where id=${id}`;await fail(p,'VIDEO_INSTAGRAM_CONTINUATION_UNKNOWN',clock());}
  }
 }
 p=await load(id);
 if(p.social_state==='completed'&&['published','completed_unconfirmed'].includes(String(p.ig_state))){await db()`update os_founder_video_publications set state='complete',updated_at=${clock().toISOString()} where id=${id}`;await notice(p,'Provider delivery results are available. Check each receipt; private or unlinked deliveries are not claimed as publicly visible.',clock());}
 else if(p.state==='attention'||['verification_required','failed','needs_reconciliation'].includes(String(p.social_state))||['needs_reconciliation','outcome_unknown'].includes(String(p.ig_state)))await notice(p,'Some video destinations need owner attention. Check saved delivery states before any retry.',clock());
 return view(await load(id));
 },{expectedManifest:p.manifest as FounderVideoManifest,beforeWrite:async (_tool,args)=>{enabled();await db().begin(async transaction=>{const tx=transaction as unknown as Sql;await locked(tx,p,clock(),Boolean(args.containerId||args.mcpJobId));});}});
}
export async function executeDueFounderVideoPublications(now=new Date()){
 if(!founderVideoPublishingEnabled())return {enabled:false,checked:0};await ensureVideoDispatchSchema();
 // Interrupted mutation calls retain IDs and stop; never recreate on a later tick.
 await db()`update os_founder_video_publications set state='attention',error_code='VIDEO_INTERRUPTED_ACTION' where state in ('import_started','cover_import_started','draft_started') and updated_at<${new Date(now.getTime()-300000).toISOString()}`;
 await db()`update os_founder_video_publications set state='attention',ig_state='outcome_unknown',error_code='VIDEO_INSTAGRAM_OUTCOME_UNKNOWN' where ig_state='started' and updated_at<${new Date(now.getTime()-300000).toISOString()}`;
 const rows=await db()`select id from os_founder_video_publications where approved_at is not null and state in ('approved','publishing','attention') and (snapshot->>'publishAt')::timestamptz<=${now.toISOString()} and not exists(select 1 from os_founder_video_calls c where c.publication_id=os_founder_video_publications.id and c.stage='session' and c.next_check_at>${now.toISOString()}) and ((state in ('approved','publishing') and (social_state='waiting' or ig_state='waiting')) or (social_state in ('started','submitted','outcome_unknown') and not exists(select 1 from os_founder_video_calls c where c.publication_id=os_founder_video_publications.id and c.stage='social_check' and c.next_check_at>${now.toISOString()})) or (state='publishing' and ig_state='processing' and not exists(select 1 from os_founder_video_calls c where c.publication_id=os_founder_video_publications.id and c.stage='ig_continue' and c.next_check_at>${now.toISOString()}))) order by updated_at limit 2`;
 let checked=0;for(const r of rows){try{await executeFounderVideoPublication(String(r.id),now);}catch{/* Fail closed: no unchecked provider writes or unbounded retries. */}checked++;}return {enabled:true,checked};
}

/** Discarding an unpublished known draft is local revocation, not provider deletion.
 * Uncertain mutations and any publish attempt remain locked for reconciliation. */
export async function discardFounderVideoPublication(input:{id:string;expectedHash:string;confirmDiscard:boolean},now=new Date()){
 if(input.confirmDiscard!==true)throw Error('VIDEO_DISCARD_CONFIRMATION_REQUIRED');const p=await load(input.id);
 if(p.snapshot_hash!==input.expectedHash)throw Error('VIDEO_REVIEW_CHANGED');
 const discarded=await db().begin(async transaction=>{const tx=transaction as unknown as Sql;
  await tx`select id from os_founder_content_items where id=${String(p.item_id)} for update`;
  const [current]=await tx`select * from os_founder_video_publications where id=${input.id} for update`;
  const [attempt]=await tx`select stage from os_founder_video_calls where publication_id=${input.id} and stage in ('social_publish','ig_publish') limit 1`;
  if(attempt||!['needs_import','import_ready','needs_review','approved'].includes(String(current.state)))throw Error('VIDEO_RECONCILIATION_REQUIRED');
  await tx`update os_founder_video_publications set state='discarded',export_expires_at=${now.toISOString()},updated_at=${now.toISOString()} where id=${input.id}`;
  return {...view(current),state:'discarded'};
 });
 await notice(p,'Preparation was discarded. Imported provider copies were not deleted. No permission remains for this preparation.',now);return discarded;
}
