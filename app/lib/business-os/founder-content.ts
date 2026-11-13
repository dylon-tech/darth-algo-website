import {createHash,randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {readContentQueue} from './daily-content-review';
import {getFounderMediaAsset} from './founder-media';
import {founderRendererStatus,wakeFounderRenderer,requestNativeRendererSetup,nativeRuntimeFingerprint} from './founder-renderer';
import {nativeApproval} from './founder-native-policy';
import {founderRenderBrief} from './founder-render-catalog';
import deploymentConfig from '../../../vercel.json';
import {
  FounderContentError,addCalendarDays,assertFounderVersion,founderClock,founderCoverage,
  founderDays,founderTemplates,founderTimeZone,founderUuid,isCalendarDay,isCalendarMonth,
  normalizeFounderDraft,safeFounderMediaUrl,type FounderContentItem,type FounderContentDraft,
  type FounderContentSnapshot,type FounderMediaType,type FounderRenderJob,
} from './founder-content-model';

type Sql=ReturnType<typeof db>;
let schemaReady:Promise<void>|undefined;
export const founderContentSchema=`
create table if not exists os_founder_content_items (
  id uuid primary key,version integer not null check(version>0),day text not null,
  media_type text not null check(media_type in ('image','video')),
  extra boolean not null default false,archived boolean not null default false,
  data jsonb not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists os_founder_content_slot on os_founder_content_items(day,media_type) where not extra and not archived;
create table if not exists os_founder_content_versions (
  item_id uuid not null references os_founder_content_items(id),version integer not null,
  data jsonb not null,operation text not null,created_at timestamptz not null default now(),
  primary key(item_id,version)
);
create table if not exists os_founder_content_requests (
  request_key text primary key,intent_hash text not null,result jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists os_founder_content_control (
  id integer primary key check(id=1),paused boolean not null default true,
  version integer not null default 1,updated_at timestamptz not null default now()
);
insert into os_founder_content_control(id) values(1) on conflict do nothing;
alter table os_founder_content_control add column if not exists last_seen_at timestamptz;
alter table os_founder_content_control add column if not exists last_success_at timestamptz;
alter table os_founder_content_control add column if not exists last_status text;
alter table os_founder_content_control add column if not exists last_created_count integer;
alter table os_founder_content_control add column if not exists global_paused boolean;
alter table os_founder_content_control add column if not exists last_error text;
alter table os_founder_content_control add column if not exists generation_mode integer not null default 0;
update os_founder_content_control set paused=true,version=case when paused then version else version+1 end,generation_mode=1 where generation_mode=0;
create table if not exists os_founder_render_jobs (
  id uuid primary key,item_id uuid not null references os_founder_content_items(id),
  content_version integer not null,media_type text not null check(media_type in ('image','video')),
  source text not null check(source in ('agent','owner')),
  status text not null check(status in ('queued','running','completed','failed','blocked','canceled','obsolete')),
  stage text not null default 'Queued',progress integer not null default 0 check(progress between 0 and 100),
  attempts integer not null default 0 check(attempts between 0 and 3),retryable boolean not null default true,
  lease_token uuid,lease_expires_at timestamptz,worker_id text,
  media_asset_id uuid,cover_asset_id uuid,error text,
  reserved_cost_usd numeric not null default 0 check(reserved_cost_usd=0),
  budget_day text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  started_at timestamptz,finished_at timestamptz,
  unique(item_id,content_version)
);
create index if not exists os_founder_render_jobs_pending on os_founder_render_jobs(status,created_at);
create unique index if not exists os_founder_render_worker_lease on os_founder_render_jobs(worker_id) where status='running' and worker_id is not null;
alter table os_founder_render_jobs add column if not exists proof_sha256 text;
`;
export function ensureFounderContentSchema() {
  return schemaReady??=db().begin(async tx=>{
    await tx`select pg_advisory_xact_lock(731012)`;
    await tx.unsafe(founderContentSchema);
  }).then(()=>{}).catch(error=>{schemaReady=undefined;throw error;});
}
function asItem(row:Record<string,unknown>):FounderContentItem {
  const data=row.data as FounderContentItem;
  const {renderStatus:_status,renderStage:_stage,renderProgress:_progress,...stored}=data;
  return {...stored,id:String(row.id),version:Number(row.version),deliveries:Array.isArray(data.deliveries)?data.deliveries:[]};
}
const rendererReason='Automatic creation needs a connected render server. No added spending approved.';
const publisherReason='Existing publishing records are retained below. Calendar drafts are not connected to an independently verified schedule/update executor yet; no new publisher or schedule is activated.';
const iso=(value:unknown)=>value?new Date(String(value)).toISOString():null;
function asJob(row:Record<string,unknown>):FounderRenderJob {
  return {id:String(row.id),itemId:String(row.item_id),contentVersion:Number(row.content_version),type:row.media_type as FounderMediaType,
    source:row.source as 'agent'|'owner',status:row.status as FounderRenderJob['status'],stage:String(row.stage),progress:Number(row.progress),
    attempts:Number(row.attempts),retryable:row.retryable===true,createdAt:iso(row.created_at)!,updatedAt:iso(row.updated_at)!,
    startedAt:iso(row.started_at),finishedAt:iso(row.finished_at),error:typeof row.error==='string'?row.error:null};
}
function withRenderState(item:FounderContentItem,job:FounderRenderJob|undefined):FounderContentItem {
  return {...item,renderStatus:job?.status||null,renderStage:job?.stage||null,renderProgress:job?.progress||0};
}
async function rendererAvailability() {
  try{return await founderRendererStatus();}
  catch{return {ready:false,budgetApproved:false,setupAvailable:false,budgetMessage:'No added spending approved.',incrementalCostUsd:null,image:{available:false,reason:rendererReason},video:{available:false,reason:rendererReason},reason:rendererReason,lastSeenAt:null};}
}
type RendererAvailability=Awaited<ReturnType<typeof rendererAvailability>>;
function requireRenderer(status:RendererAvailability,type?:FounderMediaType) {
  if(status.incrementalCostUsd!==0&&!(status.budgetApproved&&status.incrementalCostUsd===0.05))throw new FounderContentError(status.reason||'The worker’s free allowance has not been verified.',409,'RENDERER_NOT_CONNECTED');
  if(type?!status[type].available:!status.ready)throw new FounderContentError((type?status[type].reason:status.reason)||rendererReason,409,'RENDERER_NOT_CONNECTED');
}

export async function readFounderContent(month?:string,now=new Date()):Promise<FounderContentSnapshot> {
  const {day:today}=founderClock(now),selectedMonth=month||today.slice(0,7);
  if(!isCalendarMonth(selectedMonth))throw new FounderContentError('Choose a valid month.');
  await ensureFounderContentSchema();const sql=db();
  const start=selectedMonth+'-01',end=new Date(Date.UTC(Number(selectedMonth.slice(0,4)),Number(selectedMonth.slice(5,7)),1)).toISOString().slice(0,10);
  const futureEnd=addCalendarDays(today,6);
  const [rows,futureRows,archiveRows,controlResult,jobRows,jobCounts,renderStatus,legacyResult]=await Promise.all([
    sql`select id,version,data from os_founder_content_items where not archived and day>=${start} and day<${end} order by day,data->>'time',id limit 501`,
    // The month may contain many extras or be in the past. Its bounded read
    // must never evict the twelve original slots that drive today's/future
    // coverage. The unique slot index bounds this independent read to twelve.
    sql`select id,version,data from os_founder_content_items where not archived and not extra and day>=${today} and day<${futureEnd} order by day,data->>'time',id`,
    sql`select id,version,data from os_founder_content_items where archived order by updated_at desc limit 30`,
    sql`select * from os_founder_content_control where id=1`,
    sql`select j.* from os_founder_render_jobs j join os_founder_content_items i on i.id=j.item_id where not i.archived and i.data->>'jobId'=j.id::text order by case when j.status in ('queued','running') then 0 else 1 end,j.updated_at desc limit 100`,
    sql`select j.status,count(*)::int n from os_founder_render_jobs j join os_founder_content_items i on i.id=j.item_id where not i.archived and i.data->>'jobId'=j.id::text group by j.status`,
    rendererAvailability(),
    readContentQueue(now).then(value=>({value,error:null})).catch(()=>({value:null,error:'Existing provider receipts could not be read. Their status is unavailable, not canceled or failed.'})),
  ]);
  const merged=new Map([...rows.slice(0,500),...futureRows].map(row=>[String(row.id),asItem(row)]));
  const jobs=jobRows.map(asJob),byJob=new Map(jobs.map(job=>[job.id,job]));
  const items=[...merged.values()].map(item=>withRenderState(item,item.jobId?byJob.get(item.jobId):undefined)).sort((a,b)=>a.day.localeCompare(b.day)||a.time.localeCompare(b.time)||a.id.localeCompare(b.id)),control=controlResult[0];
  const coverage=founderCoverage(items,now);
  const counts={queued:0,running:0,failed:0,blocked:0,completed:0};
  for(const row of jobCounts)if(String(row.status) in counts)counts[row.status as keyof typeof counts]=Number(row.n);
  const lastSeen=iso(control.last_seen_at),fresh=Boolean(lastSeen&&now.getTime()-Date.parse(lastSeen)>=0&&now.getTime()-Date.parse(lastSeen)<=15*60000);
  const scheduled=deploymentConfig.crons.some(cron=>cron.path==='/api/cron/owner-work'&&cron.schedule==='*/5 * * * *');
  const nextRun=!control.paused&&control.global_paused===false&&fresh&&scheduled?new Date((Math.floor(now.getTime()/300000)+1)*300000).toISOString():null;
  const status=control.paused?'Off':control.global_paused===true?'Paused':!renderStatus.ready?'Needs attention':counts.running?'Creating':counts.queued?'Queued':counts.failed||counts.blocked?'Needs attention':coverage.generated===10?'Up to date':'On';
  const message=control.paused?(control.last_error||(!renderStatus.ready?renderStatus.reason:'Start to create images and videos for the next five days.')):control.global_paused===true?'The existing worker is paused.':!renderStatus.ready?renderStatus.reason:counts.running?'Creating your content.':counts.queued?`${counts.queued} ${counts.queued===1?'file':'files'} queued for the media worker.`:control.last_error||(!renderStatus.ready?renderStatus.reason:coverage.generated===10?'All ten files are saved. Review them before publishing.':'Watching the next five days for missing content.');
  const running=jobs.find(job=>job.status==='running'),runningItem=running?items.find(item=>item.id===running.itemId):undefined;
  const currentWork=running?(runningItem?`${running.stage}: ${runningItem.title.slice(0,160)}`:`Creating ${running.type==='image'?'an image':'a video'}`):null;
  return {checkedAt:now.toISOString(),today,timeZone:founderTimeZone,month:selectedMonth,
    items,archivedItems:archiveRows.map(asItem),days:founderDays(items,now),coverage,jobs,
    agent:{paused:control.paused===true,version:Number(control.version),status,lastSeenAt:lastSeen,lastCreatedCount:control.last_created_count===null?null:Number(control.last_created_count),lastSuccessfulRun:iso(control.last_success_at),nextRun,currentWork,incrementalBudgetUsd:renderStatus.budgetApproved?5:0,
      publishingPause:'not_confirmed',message,generated:coverage.generated,counts},
    templates:founderTemplates,capabilities:{drafts:true,uploads:true,imageGeneration:renderStatus.image.available&&(renderStatus.incrementalCostUsd===0||(renderStatus.budgetApproved&&renderStatus.incrementalCostUsd===0.05)),videoGeneration:renderStatus.video.available&&(renderStatus.incrementalCostUsd===0||(renderStatus.budgetApproved&&renderStatus.incrementalCostUsd===0.05)),rendererSetupAvailable:renderStatus.setupAvailable,renderBudgetMessage:renderStatus.budgetMessage,scheduling:false,publishingPause:false,rendererReason:renderStatus.reason||rendererReason,publisherReason},
    legacyQueue:legacyResult.value,legacyQueueError:legacyResult.error,truncated:rows.length>500};
}

/** The existing owner-work cron is the only replenisher. The remote media
 * worker can claim existing jobs, but cannot create calendar slots or publish. */
export async function founderContentPlannerTick(now=new Date()) {
  await ensureFounderContentSchema();
  const availability=await rendererAvailability();
  const result=await db().begin(async tx=>{
    await tx`select pg_advisory_xact_lock(731013)`;
    const sql=tx as unknown as Sql;
    const [global]=await tx`select paused from os_control where id=1 for share`;
    const [control]=await tx`select paused from os_founder_content_control where id=1 for update`;
    const globalPaused=!global||global.paused===true,stamp=now.toISOString();
    await expireRenderLeases(sql,now);
    if(globalPaused||control.paused){
      const status=globalPaused?'global_paused':'paused';
      await tx`update os_founder_content_control set last_seen_at=${stamp},last_status=${status},last_created_count=0,global_paused=${globalPaused} where id=1`;
      return {status,created:0,queued:0,scope:'media_generation'};
    }
    try{requireRenderer(availability);}catch(error){
      const reason=error instanceof FounderContentError?error.message:rendererReason;
      await tx`update os_founder_content_control set last_seen_at=${stamp},last_status='blocked',last_error=${reason},last_created_count=0,global_paused=false where id=1`;
      return {status:'blocked',created:0,queued:0,needsSetup:availability.setupAvailable,scope:'media_generation'};
    }
    const window=await queueMissingWindow(sql,now);
    const status=window.missing?'needs_input':window.jobs.length?'queued':'checked';
    const reason=window.missing?'Fresh source ideas are needed for the remaining slots.':null;
    await tx`update os_founder_content_control set last_seen_at=${stamp},last_status=${status},last_error=${reason},last_created_count=${window.created},global_paused=false where id=1`;
    const [pending]=await tx`select count(*)::int n from os_founder_render_jobs where status='queued' and source='agent'`;
    return {status,created:window.created,queued:Number(pending.n),missing:window.missing,scope:'media_generation'};
  });
  if('needsSetup' in result&&result.needsSetup){try{await requestNativeRendererSetup('auto-'+nativeRuntimeFingerprint.slice(0,32)+'-'+now.toISOString().slice(0,7));}catch{}}
  if(result.queued>0)await wakeRendererSafely();
  return result;
}
export async function readFounderContentHistory(id:string) {
  if(!founderUuid(id))throw new FounderContentError('Invalid content identifier.');
  await ensureFounderContentSchema();const sql=db();
  const [row]=await sql`select id,version,data from os_founder_content_items where id=${id}`;
  if(!row)throw new FounderContentError('This content was not found.',404,'NOT_FOUND');
  const versions=await sql`select version,data,operation,created_at from os_founder_content_versions where item_id=${id} order by version desc limit 30`;
  const item=asItem(row),[jobRow]=item.jobId?await sql`select * from os_founder_render_jobs where id=${item.jobId}`:[],job=jobRow?asJob(jobRow):undefined;
  return {item:withRenderState(item,job),job:job||null,versions:versions.map(v=>({version:v.version,item:v.data,operation:v.operation,createdAt:new Date(v.created_at).toISOString()})),historyLimit:30};
}

async function verifiedMedia(draft:FounderContentDraft) {
  const [asset,cover]=await Promise.all([
    draft.mediaAssetId?getFounderMediaAsset(draft.mediaAssetId):null,
    draft.coverAssetId?getFounderMediaAsset(draft.coverAssetId):null,
  ]);
  if(draft.mediaAssetId&&(!asset||asset.type!==draft.type||!asset.verifiedAt||!safeFounderMediaUrl(asset.url)))throw new FounderContentError('The uploaded media is missing, unverified, or a different type. Upload it again before saving.',409,'MEDIA_NOT_VERIFIED');
  if(draft.coverAssetId&&(!cover||cover.type!=='image'||!cover.verifiedAt||!safeFounderMediaUrl(cover.url)))throw new FounderContentError('Choose a verified image for the cover.',409,'COVER_NOT_VERIFIED');
  return {mediaAssetId:asset?.id||null,coverAssetId:cover?.id||null,mediaUrl:asset?safeFounderMediaUrl(asset.url):null,
    coverUrl:cover?safeFounderMediaUrl(cover.url):null,mediaVerifiedAt:asset?.verifiedAt||null};
}
function externallyInFlight(item:FounderContentItem) {
  return item.deliveries.some(d=>['scheduled','publishing','published','outcome_unknown'].includes(d.state));
}
async function writeVersion(sql:Sql,item:FounderContentItem,operation:string) {
  const {renderStatus:_status,renderStage:_stage,renderProgress:_progress,...stored}=item;
  await sql`insert into os_founder_content_items(id,version,day,media_type,extra,archived,data) values(${item.id},${item.version},${item.day},${item.type},${item.extra},${item.status==='archived'},${sql.json(stored)})
    on conflict(id) do update set version=excluded.version,day=excluded.day,media_type=excluded.media_type,extra=excluded.extra,archived=excluded.archived,data=excluded.data,updated_at=now()`;
  await sql`insert into os_founder_content_versions(item_id,version,data,operation) values(${item.id},${item.version},${sql.json(stored)},${operation})`;
}
async function currentItem(sql:Sql,id:unknown,expected:unknown) {
  if(!founderUuid(id))throw new FounderContentError('Invalid content identifier.');
  const [row]=await sql`select id,version,data from os_founder_content_items where id=${id} for update`;
  if(!row)throw new FounderContentError('This content was not found.',404,'NOT_FOUND');
  const item=asItem(row);assertFounderVersion(item,expected);return item;
}
async function ensureSlotAvailable(sql:Sql,day:string,type:FounderMediaType,id:string|undefined,extra:boolean) {
  if(extra)return;
  const [row]=await sql`select id,version,data from os_founder_content_items where day=${day} and media_type=${type} and not extra and not archived and (${id||null}::uuid is null or id<>${id||null}::uuid) limit 1`;
  if(row)throw new FounderContentError('This date already has an image/video slot, including any intentional skip. Open that item to edit it, or save this as extra content.',409,'SLOT_CONFLICT',asItem(row));
}

type Mutation = {operation:string;requestKey:string;[key:string]:unknown};
export async function mutateFounderContent(value:unknown,clockNow=new Date()) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new FounderContentError('Invalid request.');
  const input=value as Mutation;
  if(typeof input.operation!=='string'||!['save','skip_slot','skip','hold','restore','archive','unlock','review','agent','plan_missing','generate'].includes(input.operation))throw new FounderContentError('Choose a supported calendar action.');
  if(typeof input.requestKey!=='string'||!/^[-a-zA-Z0-9_:]{8,120}$/.test(input.requestKey))throw new FounderContentError('A unique request key is required for a safe retry.');
  const draft=input.operation==='save'?normalizeFounderDraft(input.item):null;
  const media=draft?await verifiedMedia(draft):null;
  const availability=input.operation==='generate'||input.operation==='plan_missing'||(input.operation==='agent'&&input.paused===false)?await rendererAvailability():null;
  await ensureFounderContentSchema();
  const intentHash=createHash('sha256').update(JSON.stringify({...input,requestKey:undefined})).digest('hex');
  const mutation:Record<string,unknown>=await db().begin(async tx=>{
    // One bounded calendar mutation at a time makes slot creation, versions,
    // pause changes and idempotent replay atomic across phones and computers.
    await tx`select pg_advisory_xact_lock(731013)`;
    const sql=tx as unknown as Sql;
    const [duplicate]=await tx`select intent_hash,result from os_founder_content_requests where request_key=${input.requestKey}`;
    if(duplicate){if(duplicate.intent_hash!==intentHash)throw new FounderContentError('This retry key belongs to a different edit.',409,'REQUEST_KEY_CONFLICT');return {...duplicate.result,duplicate:true};}
    let result:Record<string,unknown>;
    const now=clockNow.toISOString();
    if(input.operation==='save'&&draft&&media){
      const current=draft.id?await currentItem(sql,draft.id,draft.expectedVersion):null;
      if(current?.status==='archived')throw new FounderContentError('Restore this draft before editing.',409,'ARCHIVED');
      if(current&&externallyInFlight(current))throw new FounderContentError('This version already has a provider outcome. Reconcile or replace its external schedule before editing; no provider post was changed.',409,'PROVIDER_RECONCILIATION_REQUIRED');
      await ensureSlotAvailable(sql,draft.day,draft.type,draft.id,draft.extra);
      const item:FounderContentItem={...draft,...media,id:current?.id||randomUUID(),version:(current?.version||0)+1,
        status:media.mediaAssetId?'checking':'draft',locked:true,createdAt:current?.createdAt||now,updatedAt:now,
        deliveries:current?.deliveries||[],jobId:null,lastError:null};
      // expectedVersion is an input guard, never part of saved content.
      delete (item as unknown as Record<string,unknown>).expectedVersion;
      if(current)await cancelItemJobs(sql,current.id,now);
      await writeVersion(sql,item,'save');result={item,message:'Saved to account. Your edit is protected from agent changes.'};
    }else if(input.operation==='skip_slot'){
      if(!isCalendarDay(input.day)||(input.type!=='image'&&input.type!=='video'))throw new FounderContentError('Choose a date and an image/video slot.');
      await ensureSlotAvailable(sql,input.day,input.type,undefined,false);
      const item:FounderContentItem={id:randomUUID(),version:1,day:input.day,time:input.type==='image'?'09:00':'15:00',type:input.type,
        title:`${input.type==='image'?'Image':'Video'} slot skipped`,idea:'',script:'',caption:'',templateId:input.type==='image'?founderTemplates[0].id:founderTemplates[1].id,
        destinations:[],mediaAssetId:null,coverAssetId:null,mediaUrl:null,coverUrl:null,mediaVerifiedAt:null,status:'skipped',locked:true,extra:false,createdAt:now,updatedAt:now,deliveries:[],jobId:null,lastError:null};
      await writeVersion(sql,item,'skip_slot');result={item,message:'Intentional skip saved. The planner will preserve this slot.'};
    }else if(input.operation==='agent'){
      if(typeof input.paused!=='boolean')throw new FounderContentError('Choose pause or resume.');
      const [control]=await tx`select version from os_founder_content_control where id=1 for update`;
      if(input.expectedVersion!==control.version)throw new FounderContentError('The agent setting changed. Refresh before trying again.',409,'VERSION_CONFLICT');
      if(input.paused){
        await tx`update os_founder_content_control set paused=true,version=version+1,last_error=null,last_status='paused',updated_at=now() where id=1`;
        result={paused:true,version:Number(control.version)+1,message:'Agent paused. A file already being created may finish.'};
      }else{
        requireRenderer(availability!);await requireUnpausedWorker(sql);
        const window=await queueMissingWindow(sql,clockNow);
        await tx`update os_founder_content_control set paused=false,version=version+1,last_error=null,last_status='queued',last_created_count=${window.created},global_paused=false,updated_at=now() where id=1`;
        result={paused:false,version:Number(control.version)+1,items:window.items,jobs:window.jobs,message:window.jobs.length?`${window.jobs.length} files queued. The worker will create and save each one.`:window.missing?'Fresh source ideas are needed for the remaining slots.':'Agent started. Existing saved files and protected slots are preserved.'};
      }
    }else if(input.operation==='plan_missing'){
      const [control]=await tx`select paused from os_founder_content_control where id=1 for update`;
      if(control.paused)throw new FounderContentError('Start the agent before filling missing content.',409,'AGENT_PAUSED');
      requireRenderer(availability!);await requireUnpausedWorker(sql);
      const window=await queueMissingWindow(sql,clockNow);
      result={items:window.items,jobs:window.jobs,message:`${window.jobs.length} files queued for creation.`};
    }else if(input.operation==='generate'){
      const current=await currentItem(sql,input.id,input.expectedVersion);
      requireRenderer(availability!,current.type);await requireUnpausedWorker(sql);
      if(externallyInFlight(current))throw new FounderContentError('Reconcile this content’s existing provider outcome before replacing its media.',409,'PROVIDER_RECONCILIATION_REQUIRED');
      if(['skipped','held','archived'].includes(current.status))throw new FounderContentError('Restore this content before generating.',409,'CONTENT_HELD');
      if(!current.idea.trim())throw new FounderContentError('Add an idea before generating.',409,'IDEA_REQUIRED');
      const queued=await queueRenderItem(sql,current,'owner',clockNow);
      result={...queued,message:'Queued. The worker will create and save your file.'};
    }else{
      const current=await currentItem(sql,input.id,input.expectedVersion);
      if(externallyInFlight(current))throw new FounderContentError('Provider activity exists for this content. Reconcile it before changing its state; no external schedule was canceled.',409,'PROVIDER_RECONCILIATION_REQUIRED');
      const item={...current,version:current.version+1,updatedAt:now};
      if(current.status==='generating'){item.status='draft';item.jobId=null;item.lastError=null;}
      if(input.operation==='review'){
        if(!current.mediaAssetId||!current.mediaVerifiedAt)throw new FounderContentError('Upload and verify media before marking it reviewed.',409,'MEDIA_NOT_VERIFIED');
        if(current.type==='video'&&!current.coverAssetId)throw new FounderContentError('Add a designed cover image before reviewing this video.',409,'COVER_REQUIRED');
        if(input.confirmReviewed!==true)throw new FounderContentError('Confirm that you reviewed the complete media, copy, source and current offer.');
        if(['skipped','held','archived'].includes(current.status))throw new FounderContentError('Restore this content before reviewing it.',409,'CONTENT_HELD');
        item.status='ready';item.locked=true;
      }else if(input.operation==='skip'){item.status='skipped';item.locked=true;}
      else if(input.operation==='hold'){item.status='held';item.locked=true;}
      else if(input.operation==='archive'){item.status='archived';item.locked=true;}
      else if(input.operation==='restore'){
        await ensureSlotAvailable(sql,item.day,item.type,item.id,item.extra);
        item.status=item.mediaAssetId?'checking':'draft';item.locked=true;
      }else if(input.operation==='unlock'){
        if(['skipped','held','archived'].includes(current.status))throw new FounderContentError('Restore this slot before returning it to agent control.',409,'CONTENT_HELD');
        item.locked=false;
      }else throw new FounderContentError('Invalid action.');
      await cancelItemJobs(sql,item.id,now);
      await writeVersion(sql,item,input.operation);
      result={item,message:input.operation==='review'?'Review saved for this media and copy version. No publishing or scheduling action was taken.':input.operation==='archive'?'Draft moved to recoverable archive.':input.operation==='unlock'?'Returned to agent control. Existing versions remain in history.':'Saved to account. Existing versions remain in history.'};
    }
    await tx`insert into os_founder_content_requests(request_key,intent_hash,result) values(${input.requestKey},${intentHash},${tx.json(result as Parameters<typeof tx.json>[0])})`;
    return {...result,duplicate:false};
  });
  if((input.operation==='agent'&&mutation.paused===false)||(Array.isArray(mutation.jobs)&&mutation.jobs.length>0)||('job' in mutation&&mutation.job)){
    const wake=await wakeRendererSafely();return {...mutation,wake};
  }
  return mutation;
}

const renderLimits={pending:24,newJobsPerDay:36,attempts:3,leaseMinutes:10,attemptMinutes:45} as const;
async function requireUnpausedWorker(sql:Sql) {
  const [control]=await sql`select paused from os_control where id=1 for share`;
  if(!control||control.paused)throw new FounderContentError('The existing worker is paused. Resume it before creating media.',409,'WORKER_PAUSED');
}
async function wakeRendererSafely() {
  try{return await wakeFounderRenderer();}
  catch{return {accepted:false,reason:'Saved in the queue. Waiting for the media worker to check in.'};}
}
async function cancelItemJobs(sql:Sql,id:string,now:string) {
  await sql`update os_founder_render_jobs set status='canceled',stage='Canceled',retryable=false,error='Replaced by a newer owner edit.',finished_at=${now},updated_at=${now} where item_id=${id} and status in ('queued','running')`;
}
async function writeRenderNotice(sql:Sql,jobId:string,item:FounderContentItem,outcome:'completed'|'failed'|'blocked',retryable:boolean,now:string) {
  // Reuse the native Inbox ledger without creating an outbound notification.
  // A calendar-only installation can still save the file when that ledger is
  // unavailable; its source is reported separately by the Inbox read path.
  const [table]=await sql`select to_regclass('public.os_messages') is not null as present`;
  if(!table?.present)return;
  const title=item.title.replace(/\s+/g,' ').slice(0,100),kind=item.type==='image'?'Image':'Video';
  const result=outcome==='completed'?`${kind} saved: ${title}.`:`${kind} creation needs attention: ${title}.`;
  const next=outcome==='completed'?'Review the file and caption in Content.':outcome==='blocked'?'Open Content to check the last attempt.':retryable?'Retry in Content.':'Open Content to review the idea or source.';
  const body=`Result: ${result}\nNext: ${next}\nSource: /owner?tab=content&item=${item.id}\nJob: ${jobId}`;
  // One message per durable render job, including retries. A repeated terminal
  // callback neither duplicates it nor marks the same result unread again.
  await sql`insert into os_messages(id,department,role,body,run_id,created_at) values(${jobId},'content','agent',${body},null,${now}) on conflict(id) do update set body=excluded.body,created_at=excluded.created_at where os_messages.department='content' and os_messages.role='agent' and os_messages.body<>excluded.body`;
}
async function queueRenderItem(sql:Sql,current:FounderContentItem,source:'agent'|'owner',now:Date) {
  if(nativeApproval().enabled){const brief=founderRenderBrief(current);if(!brief.supported)throw new FounderContentError(brief.reason,409,'RENDER_SOURCE_REVIEW_REQUIRED');}
  const stamp=now.toISOString(),budgetDay=founderClock(now).day;
  if(current.jobId){
    const [pending]=await sql`select * from os_founder_render_jobs where id=${current.jobId} and status in ('queued','running')`;
    if(pending&&Number(pending.content_version)===current.version)return {item:withRenderState(current,asJob(pending)),job:asJob(pending)};
  }
  const [pending]=await sql`select count(*)::int n from os_founder_render_jobs where status in ('queued','running')`;
  if(Number(pending.n)>=renderLimits.pending)throw new FounderContentError('The creation queue is full. Let a few files finish first.',409,'QUEUE_FULL');
  const [prior]=current.jobId?await sql`select * from os_founder_render_jobs where id=${current.jobId} and item_id=${current.id}`:[];
  const retry=prior&&prior.status==='failed';
  if(prior?.status==='blocked')throw new FounderContentError('The previous worker attempt needs checking before retrying. Your saved idea is preserved.',409,'RENDER_OUTCOME_UNKNOWN');
  if(retry&&(!prior.retryable||Number(prior.attempts)>=renderLimits.attempts))throw new FounderContentError('This attempt cannot be retried. Update the idea or source before generating again.',409,'RENDER_RETRY_LIMIT');
  if(!retry){
    const [daily]=await sql`select count(*)::int n from os_founder_render_jobs where budget_day=${budgetDay}`;
    if(Number(daily.n)>=renderLimits.newJobsPerDay)throw new FounderContentError('Today’s creation limit is reached. Try again tomorrow.',409,'CREATION_LIMIT');
  }
  const id=retry?String(prior.id):randomUUID();
  const item:FounderContentItem={...current,version:current.version+1,status:'generating',jobId:id,lastError:null,
    mediaAssetId:null,coverAssetId:null,mediaUrl:null,coverUrl:null,mediaVerifiedAt:null,updatedAt:stamp};
  await writeVersion(sql,item,retry?'retry_generation':'queue_generation');
  const [job]=retry?await sql`update os_founder_render_jobs set content_version=${item.version},source=${source},status='queued',stage='Queued',progress=0,retryable=true,error=null,lease_token=null,lease_expires_at=null,worker_id=null,started_at=null,finished_at=null,updated_at=${stamp},budget_day=${budgetDay} where id=${id} returning *`
    :await sql`insert into os_founder_render_jobs(id,item_id,content_version,media_type,source,status,budget_day,created_at,updated_at) values(${id},${item.id},${item.version},${item.type},${source},'queued',${budgetDay},${stamp},${stamp}) returning *`;
  return {item:withRenderState(item,asJob(job)),job:asJob(job)};
}
async function queueMissingWindow(sql:Sql,now:Date) {
  const planned=await planMissingIdeas(sql,now.toISOString()),clock=founderClock(now),end=addCalendarDays(clock.day,6);
  const rows=await sql`select id,version,data from os_founder_content_items where not archived and not extra and day>=${clock.day} and day<${end} order by day,data->>'time',id`;
  const originals=rows.map(asItem),items:FounderContentItem[]=[],jobs:FounderRenderJob[]=[];
  for(const item of originals){
    if(item.locked||item.mediaAssetId||!['idea','draft'].includes(item.status)||(item.day===clock.day&&item.time<=clock.time))continue;
    const brief=founderRenderBrief(item);if(nativeApproval().enabled&&!brief.supported){await writeVersion(sql,{...item,version:item.version+1,status:'needs_input',lastError:brief.reason,updatedAt:now.toISOString()},'source_review_required');continue;}
    const queued=await queueRenderItem(sql,item,'agent',now);items.push(queued.item);jobs.push(queued.job);
  }
  const missing=founderDays(originals,now).flatMap(day=>day.slots.filter(slot=>!slot.itemId&&(!day.isToday||slot.remainingToday))).length;
  return {created:planned.length,items,jobs,missing};
}

type RenderLeaseKey={jobId:string;leaseToken:string};
export type FounderRenderLease={job:FounderRenderJob&{leaseToken:string;leaseExpiresAt:string;attempt:number;workerId:string};item:FounderContentItem};
function checkJobLease(row:Record<string,unknown>|undefined,key:RenderLeaseKey,now:Date) {
  if(!row||row.status!=='running'||row.lease_token!==key.leaseToken||!row.lease_expires_at||Date.parse(String(row.lease_expires_at))<=now.getTime())throw new FounderContentError('This worker lease has ended. Stop this attempt.',409,'LEASE_LOST');
}
function checkLeaseKey(key:RenderLeaseKey) {
  if(!founderUuid(key.jobId)||!founderUuid(key.leaseToken))throw new FounderContentError('A valid worker lease is required.',409,'LEASE_LOST');
}
function leaseResult(row:Record<string,unknown>,item:FounderContentItem):FounderRenderLease {
  return {job:{...asJob(row),leaseToken:String(row.lease_token),leaseExpiresAt:iso(row.lease_expires_at)!,attempt:Number(row.attempts),workerId:String(row.worker_id)},item};
}
/** Only call from the OIDC-authenticated renderer transport. Owner routes never
 * receive lease tokens or private worker authorization material. */
export async function assertFounderRenderLease(key:RenderLeaseKey,now=new Date()):Promise<FounderRenderLease> {
  checkLeaseKey(key);await ensureFounderContentSchema();const sql=db();
  const [job]=await sql`select * from os_founder_render_jobs where id=${key.jobId}`;checkJobLease(job,key,now);
  const [row]=await sql`select id,version,data from os_founder_content_items where id=${job.item_id}`;
  const item=row?asItem(row):null;
  if(!item||item.version!==Number(job.content_version)||item.jobId!==String(job.id)||item.status!=='generating')throw new FounderContentError('This content changed. Stop this attempt.',409,'LEASE_LOST');
  return leaseResult(job,item);
}
async function expireRenderLeases(sql:Sql,now:Date) {
  const stamp=now.toISOString(),rows=await sql`select * from os_founder_render_jobs where status='running' and lease_expires_at<=${stamp} for update`;
  for(const job of rows){
    const error='The worker stopped responding. Check this attempt before retrying.';
    await sql`update os_founder_render_jobs set status='blocked',stage='Needs checking',retryable=false,error=${error},finished_at=${stamp},updated_at=${stamp} where id=${job.id}`;
    const [row]=await sql`select id,version,data from os_founder_content_items where id=${job.item_id} for update`;
    if(row&&Number(row.version)===Number(job.content_version)){
      const item=asItem(row);
      if(item.jobId===String(job.id)){
        await writeVersion(sql,{...item,version:item.version+1,status:'needs_input',lastError:error,updatedAt:stamp},'generation_lease_expired');
        await writeRenderNotice(sql,String(job.id),item,'blocked',false,stamp);
      }
    }
  }
}
export async function claimFounderRenderJob(input:{workerId:string;now?:Date}):Promise<FounderRenderLease|null> {
  if(typeof input.workerId!=='string'||!/^[-A-Za-z0-9_.:/]{1,120}$/.test(input.workerId))throw new FounderContentError('Invalid worker identifier.');
  const availability=await rendererAvailability();
  if(availability.incrementalCostUsd!==0&&!(availability.budgetApproved&&availability.incrementalCostUsd===0.05))return null;
  await ensureFounderContentSchema();const now=input.now||new Date(),stamp=now.toISOString();
  return db().begin(async tx=>{
    await tx`select pg_advisory_xact_lock(731013)`;const sql=tx as unknown as Sql;
    await expireRenderLeases(sql,now);
    // A committed claim may lose its HTTP response. Return that same lease
    // before looking for another job, so a retry cannot strand or duplicate it.
    const [outstanding]=await tx`select * from os_founder_render_jobs where status='running' and worker_id=${input.workerId} for update`;
    if(outstanding){
      const [row]=await tx`select id,version,data from os_founder_content_items where id=${outstanding.item_id}`;
      const item=row?asItem(row):null;
      if(item&&item.version===Number(outstanding.content_version)&&item.jobId===String(outstanding.id)&&item.status==='generating')return availability[item.type].available?leaseResult(outstanding,item):null;
      await tx`update os_founder_render_jobs set status='obsolete',stage='Replaced',retryable=false,finished_at=${stamp},updated_at=${stamp} where id=${outstanding.id}`;
    }
    if(nativeApproval().enabled){const [active]=await tx`select id from os_founder_render_jobs where status='running' and worker_id like 'native:%' limit 1`;if(active)return null;}
    const [global]=await tx`select paused from os_control where id=1 for share`;
    if(!global||global.paused)return null;
    const [control]=await tx`select paused from os_founder_content_control where id=1 for share`;
    const rows=await tx`select j.* from os_founder_render_jobs j join os_founder_content_items i on i.id=j.item_id where j.status='queued' and (j.source='owner' or ${!control.paused}) order by case when j.source='owner' then 0 else 1 end,i.day,i.data->>'time',j.created_at,j.id limit 24 for update of j skip locked`;
    for(const candidate of rows){
      const [row]=await tx`select id,version,data from os_founder_content_items where id=${candidate.item_id} for update`;
      const item=row?asItem(row):null;
      const clock=founderClock(now),past=Boolean(item&&candidate.source==='agent'&&(item.day<clock.day||(item.day===clock.day&&item.time<=clock.time)));
      if(past&&item&&item.jobId===String(candidate.id)&&item.version===Number(candidate.content_version)){
        const error='The planned time passed. Choose a new date to create this content.';
        await tx`update os_founder_render_jobs set status='obsolete',stage='Time passed',retryable=false,error=${error},finished_at=${stamp},updated_at=${stamp} where id=${candidate.id}`;
        await writeVersion(sql,{...item,version:item.version+1,status:'needs_input',lastError:error,updatedAt:stamp},'generation_time_passed');continue;
      }
      if(!item||item.version!==Number(candidate.content_version)||item.jobId!==String(candidate.id)||item.status!=='generating'||(candidate.source==='agent'&&item.locked)||externallyInFlight(item)){
        await tx`update os_founder_render_jobs set status='obsolete',stage='Replaced',retryable=false,finished_at=${stamp},updated_at=${stamp} where id=${candidate.id}`;continue;
      }
      if(!availability[item.type].available)continue;
      const token=randomUUID(),expires=new Date(now.getTime()+renderLimits.leaseMinutes*60000).toISOString();
      const [job]=await tx`update os_founder_render_jobs set status='running',stage='Preparing',progress=1,attempts=attempts+1,lease_token=${token},lease_expires_at=${expires},worker_id=${input.workerId},started_at=${stamp},finished_at=null,updated_at=${stamp} where id=${candidate.id} and attempts<${renderLimits.attempts} returning *`;
      if(job)return leaseResult(job,item);
    }
    return null;
  });
}
export async function heartbeatFounderRenderJob(input:RenderLeaseKey&{stage:string;progress:number},now=new Date()) {
  checkLeaseKey(input);
  if(!['Preparing','Rendering','Uploading','Checking'].includes(input.stage)||!Number.isInteger(input.progress)||input.progress<0||input.progress>99)throw new FounderContentError('Invalid worker progress.');
  await ensureFounderContentSchema();
  return db().begin(async tx=>{
    await tx`select pg_advisory_xact_lock(731013)`;
    const [job]=await tx`select * from os_founder_render_jobs where id=${input.jobId} for update`;checkJobLease(job,input,now);
    const [row]=await tx`select id,version,data from os_founder_content_items where id=${job.item_id}`;
    if(!row||Number(row.version)!==Number(job.content_version)||asItem(row).jobId!==String(job.id))throw new FounderContentError('This content changed. Stop this attempt.',409,'LEASE_LOST');
    const maximum=Date.parse(String(job.started_at))+renderLimits.attemptMinutes*60000;
    const expires=new Date(Math.min(now.getTime()+renderLimits.leaseMinutes*60000,maximum)).toISOString();
    if(Date.parse(expires)<=now.getTime())throw new FounderContentError('This render attempt reached its time limit.',409,'LEASE_LOST');
    await tx`update os_founder_render_jobs set stage=${input.stage},progress=greatest(progress,${input.progress}),lease_expires_at=${expires},updated_at=${now.toISOString()} where id=${input.jobId}`;
    return {leaseExpiresAt:expires};
  });
}
export async function completeFounderRenderJob(input:RenderLeaseKey&{mediaAssetId:string;coverAssetId?:string|null;caption?:string;script?:string;proofHash?:string},now=new Date()) {
  checkLeaseKey(input);await ensureFounderContentSchema();const sql=db();
  const [prior]=await sql`select * from os_founder_render_jobs where id=${input.jobId}`;
  if(!prior)throw new FounderContentError('This worker job was not found.',404,'NOT_FOUND');
  for(const [name,maximum] of [['script',18000],['caption',10000]] as const){const value=input[name];if(value!==undefined&&(typeof value!=='string'||value.length>maximum||/\u0000/.test(value)))throw new FounderContentError('The rendered copy is invalid.');}
  if(input.proofHash!==undefined&&!/^[a-f0-9]{64}$/.test(input.proofHash))throw new FounderContentError('The render proof is invalid.');
  if(prior.media_type==='video'&&!input.coverAssetId)throw new FounderContentError('The video needs its designed cover.',409,'COVER_REQUIRED');
  const media=await verifiedMedia({type:prior.media_type,mediaAssetId:input.mediaAssetId,coverAssetId:input.coverAssetId||null} as FounderContentDraft);
  if(!media.mediaAssetId)throw new FounderContentError('The rendered file has not been verified.',409,'MEDIA_NOT_VERIFIED');
  return sql.begin(async tx=>{
    await tx`select pg_advisory_xact_lock(731013)`;const scoped=tx as unknown as Sql;
    const [job]=await tx`select * from os_founder_render_jobs where id=${input.jobId} for update`;
    const [row]=await tx`select id,version,data from os_founder_content_items where id=${job.item_id} for update`;
    const current=row?asItem(row):null;
    if(job.status==='completed'&&job.lease_token===input.leaseToken&&job.media_asset_id===input.mediaAssetId&&(job.cover_asset_id||null)===(input.coverAssetId||null))return {status:'completed' as const,job:asJob(job),item:current||undefined};
    checkJobLease(job,input,now);
    const stamp=now.toISOString();
    if(!current||current.version!==Number(job.content_version)||current.jobId!==String(job.id)||current.status!=='generating'){
      const [obsolete]=await tx`update os_founder_render_jobs set status='obsolete',stage='Replaced',retryable=false,finished_at=${stamp},updated_at=${stamp} where id=${job.id} returning *`;
      return {status:'obsolete' as const,job:asJob(obsolete)};
    }
    if((current.script&&input.script!==undefined&&current.script!==input.script)||(current.caption&&input.caption!==undefined&&current.caption!==input.caption))throw new FounderContentError('The worker changed saved copy. Review the source before retrying.',409,'RENDER_COPY_MISMATCH');
    const item:FounderContentItem={...current,...media,version:current.version+1,status:'checking',script:input.script??current.script,caption:input.caption??current.caption,lastError:null,updatedAt:stamp};
    await writeVersion(scoped,item,'generation_completed');
    const [finished]=await tx`update os_founder_render_jobs set status='completed',stage='Saved · review next',progress=100,retryable=false,media_asset_id=${media.mediaAssetId},cover_asset_id=${media.coverAssetId},proof_sha256=${input.proofHash||null},error=null,finished_at=${stamp},updated_at=${stamp} where id=${job.id} returning *`;
    await tx`update os_founder_content_control set last_success_at=${stamp},last_error=null where id=1`;
    await writeRenderNotice(scoped,String(job.id),item,'completed',false,stamp);
    return {status:'completed' as const,job:asJob(finished),item:withRenderState(item,asJob(finished))};
  });
}
export async function failFounderRenderJob(input:RenderLeaseKey&{error:string;retryable:boolean;ambiguous?:boolean},now=new Date()) {
  checkLeaseKey(input);await ensureFounderContentSchema();
  const error=typeof input.error==='string'?input.error.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,500):'';
  if(!error||typeof input.retryable!=='boolean')throw new FounderContentError('A clear worker failure is required.');
  return db().begin(async tx=>{
    await tx`select pg_advisory_xact_lock(731013)`;const sql=tx as unknown as Sql;
    const [job]=await tx`select * from os_founder_render_jobs where id=${input.jobId} for update`;
    if(job&&['failed','blocked'].includes(job.status)&&job.lease_token===input.leaseToken)return {status:job.status,job:asJob(job)};
    checkJobLease(job,input,now);
    const status=input.ambiguous?'blocked':'failed',retryable=!input.ambiguous&&input.retryable&&Number(job.attempts)<renderLimits.attempts,stamp=now.toISOString();
    const [finished]=await tx`update os_founder_render_jobs set status=${status},stage=${input.ambiguous?'Needs checking':'Failed'},retryable=${retryable},error=${error},finished_at=${stamp},updated_at=${stamp} where id=${job.id} returning *`;
    const [row]=await tx`select id,version,data from os_founder_content_items where id=${job.item_id} for update`;
    if(row&&Number(row.version)===Number(job.content_version)){
      const item=asItem(row);
      if(item.jobId===String(job.id)){
        await writeVersion(sql,{...item,version:item.version+1,status:retryable?'failed':'needs_input',lastError:error,updatedAt:stamp},'generation_failed');
        await writeRenderNotice(sql,String(job.id),item,status,retryable,stamp);
      }
    }
    await tx`update os_founder_content_control set last_error=${error} where id=1`;
    return {status,job:asJob(finished)};
  });
}

const suggestedIdeas=[
  ['Find your indicator','Show how to locate an invite-only Darth Algo indicator after access is confirmed. Use the current TradingView interface and genuine product source.'],
  ['Read the trend cloud','Explain what the trend cloud adds to chart context using a genuine approved capture. Do not promise a trade outcome.'],
  ['Build a plan before entry','Walk through the entry, stop and target levels visible in an authentic source chart. Describe the displayed plan, not a guaranteed fill.'],
  ['Scalp or Swing?','Explain the verified use case of each current indicator with a genuine product view. Verify current plan terms before including any price.'],
  ['Check the chart context','Teach one chart-context check before acting on an indicator signal. Retain the original symbol and timeframe.'],
  ['Keep the chart readable','Show a phone-friendly view of one genuine indicator feature without covering price or signal context.'],
  ['A signal is the starting point','Explain the difference between a displayed signal and an executed trade. Use the real source labels and no invented result.'],
  ['Set up your TradingView view','Demonstrate one current setup step with the approved video language and authentic interface.'],
  ['Review the levels together','Explain how the visible entry, stop and targets relate to the displayed chart. Preserve source context.'],
  ['Spot your active tool','Show where the current Darth Algo indicator appears on the chart and how the owner can identify its name.'],
  ['One feature, one clear lesson','Choose a verified product feature and teach one action with an uncluttered genuine chart crop.'],
  ['Check access after purchase','Show the current documented setup path and the correct TradingView username check. Avoid implying an unverified customer grant.'],
] as const;
async function planMissingIdeas(sql:Sql,now:string) {
  const clock=founderClock(new Date(now)),end=addCalendarDays(clock.day,6);
  const rows=await sql`select id,version,data from os_founder_content_items where not archived and day>=${clock.day} and day<${end}`;
  const existing=rows.map(asItem);
  // Keep full retained titles for deduplication. Replenishment never reuses a
  // title merely because its old date fell outside the visible calendar.
  const usedRows=await sql`select distinct data->>'title' as title from os_founder_content_items`;
  const used=new Set(usedRows.map(row=>String(row.title)));
  const choices=suggestedIdeas.filter(([title])=>!used.has(title));
  const created:FounderContentItem[]=[];
  for(const day of founderDays(existing,new Date(now))){
    for(const slot of day.slots){
      if(slot.itemId||(day.isToday&&!slot.remainingToday))continue;
      const choice=choices.shift();if(!choice)return created;
      const item:FounderContentItem={id:randomUUID(),version:1,day:day.day,time:slot.time,type:slot.type,title:choice[0],idea:choice[1],script:'',caption:'',
        templateId:slot.type==='image'?founderTemplates[0].id:founderTemplates[1].id,destinations:[],mediaAssetId:null,coverAssetId:null,
        mediaUrl:null,coverUrl:null,mediaVerifiedAt:null,status:'idea',locked:false,extra:false,createdAt:now,updatedAt:now,deliveries:[],jobId:null,
        lastError:null};
      await writeVersion(sql,item,'plan_missing');created.push(item);
    }
  }
  return created;
}
