import {createHash,randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {readContentQueue} from './daily-content-review';
import {getFounderMediaAsset} from './founder-media';
import deploymentConfig from '../../../vercel.json';
import {
  FounderContentError,addCalendarDays,assertFounderVersion,founderClock,founderCoverage,
  founderDays,founderTemplates,founderTimeZone,founderUuid,isCalendarDay,isCalendarMonth,
  normalizeFounderDraft,safeFounderMediaUrl,type FounderContentItem,type FounderContentDraft,
  type FounderContentSnapshot,type FounderMediaType,
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
`;
export function ensureFounderContentSchema() {
  return schemaReady??=db().begin(async tx=>{
    await tx`select pg_advisory_xact_lock(731012)`;
    await tx.unsafe(founderContentSchema);
  }).then(()=>{}).catch(error=>{schemaReady=undefined;throw error;});
}
function asItem(row:Record<string,unknown>):FounderContentItem {
  const data=row.data as FounderContentItem;
  return {...data,id:String(row.id),version:Number(row.version),deliveries:Array.isArray(data.deliveries)?data.deliveries:[]};
}
const rendererReason='The approved template is available, but a durable media renderer and its existing allowance have not been verified. Saving an idea does not render an image or video.';
const publisherReason='Existing publishing records are retained below. Calendar drafts are not connected to an independently verified schedule/update executor yet; no new publisher or schedule is activated.';

export async function readFounderContent(month?:string,now=new Date()):Promise<FounderContentSnapshot> {
  const {day:today}=founderClock(now),selectedMonth=month||today.slice(0,7);
  if(!isCalendarMonth(selectedMonth))throw new FounderContentError('Choose a valid month.');
  await ensureFounderContentSchema();const sql=db();
  const start=selectedMonth+'-01',end=new Date(Date.UTC(Number(selectedMonth.slice(0,4)),Number(selectedMonth.slice(5,7)),1)).toISOString().slice(0,10);
  const futureEnd=addCalendarDays(today,6);
  const [rows,futureRows,archiveRows,controlResult,legacyResult]=await Promise.all([
    sql`select id,version,data from os_founder_content_items where not archived and day>=${start} and day<${end} order by day,data->>'time',id limit 501`,
    // The month may contain many extras or be in the past. Its bounded read
    // must never evict the twelve original slots that drive today's/future
    // coverage. The unique slot index bounds this independent read to twelve.
    sql`select id,version,data from os_founder_content_items where not archived and not extra and day>=${today} and day<${futureEnd} order by day,data->>'time',id`,
    sql`select id,version,data from os_founder_content_items where archived order by updated_at desc limit 30`,
    sql`select * from os_founder_content_control where id=1`,
    readContentQueue(now).then(value=>({value,error:null})).catch(()=>({value:null,error:'Existing provider receipts could not be read. Their status is unavailable, not canceled or failed.'})),
  ]);
  const merged=new Map([...rows.slice(0,500),...futureRows].map(row=>[String(row.id),asItem(row)]));
  const items=[...merged.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.time.localeCompare(b.time)||a.id.localeCompare(b.id)),control=controlResult[0];
  const time=(value:unknown)=>value?new Date(String(value)).toISOString():null;
  const lastSeen=time(control.last_seen_at),fresh=Boolean(lastSeen&&now.getTime()-Date.parse(lastSeen)>=0&&now.getTime()-Date.parse(lastSeen)<=15*60000);
  const scheduled=deploymentConfig.crons.some(cron=>cron.path==='/api/cron/owner-work'&&cron.schedule==='*/5 * * * *');
  const nextRun=!control.paused&&control.global_paused===false&&fresh&&scheduled?new Date((Math.floor(now.getTime()/300000)+1)*300000).toISOString():null;
  const status=control.paused?'Idea planning paused':control.global_paused===true?'Existing worker paused':!fresh?'Idea planner not yet observed':control.last_status==='needs_input'?'Fresh source ideas needed':'Idea planner checked · rendering unavailable';
  return {checkedAt:now.toISOString(),today,timeZone:founderTimeZone,month:selectedMonth,
    items,archivedItems:archiveRows.map(asItem),days:founderDays(items,now),coverage:founderCoverage(items,now),
    agent:{paused:control.paused===true,version:Number(control.version),status,lastSeenAt:lastSeen,lastCreatedCount:control.last_created_count===null?null:Number(control.last_created_count),lastSuccessfulRun:time(control.last_success_at),nextRun,currentWork:null,incrementalBudgetUsd:0,
      publishingPause:'not_confirmed',message:'This setting controls new calendar planning only. Previously accepted external schedules may still publish. Provider-wide stopping is not confirmed.'},
    templates:founderTemplates,capabilities:{drafts:true,uploads:true,imageGeneration:false,videoGeneration:false,scheduling:false,publishingPause:false,rendererReason,publisherReason},
    legacyQueue:legacyResult.value,legacyQueueError:legacyResult.error,truncated:rows.length>500};
}

/** Called only by the existing authenticated owner-work cron. This planner
 * creates idea records; it never invokes a model, renderer, upload or publisher.
 * A complete initial source list is deliberately finite. Exhaustion requires
 * fresh researched ideas, not recycling an old topic or claiming media exists.
 */
export async function founderContentPlannerTick(now=new Date()) {
  await ensureFounderContentSchema();
  return db().begin(async tx=>{
    await tx`select pg_advisory_xact_lock(731013)`;
    const sql=tx as unknown as Sql;
    const [global]=await tx`select paused from os_control where id=1 for share`;
    const [control]=await tx`select paused from os_founder_content_control where id=1 for update`;
    const globalPaused=!global||global.paused===true;
    const stamp=now.toISOString();
    if(globalPaused||control.paused){
      const status=globalPaused?'global_paused':'paused';
      await tx`update os_founder_content_control set last_seen_at=${stamp},last_status=${status},last_created_count=0,global_paused=${globalPaused} where id=1`;
      return {status,created:0,scope:'idea_planning_only'};
    }
    const items=await planMissingIdeas(sql,stamp);
    const clock=founderClock(now),end=addCalendarDays(clock.day,6);
    const rows=await tx`select id,version,data from os_founder_content_items where not archived and not extra and day>=${clock.day} and day<${end}`;
    const missing=founderDays(rows.map(asItem),now).flatMap(day=>day.slots.filter(slot=>!slot.itemId&&(!day.isToday||slot.remainingToday))).length;
    const status=missing?'needs_input':'checked';
    await tx`update os_founder_content_control set last_seen_at=${stamp},last_status=${status},last_created_count=${items.length},global_paused=false,last_success_at=case when ${items.length>0||missing===0} then ${stamp}::timestamptz else last_success_at end where id=1`;
    return {status,created:items.length,missing,scope:'idea_planning_only'};
  });
}
export async function readFounderContentHistory(id:string) {
  if(!founderUuid(id))throw new FounderContentError('Invalid content identifier.');
  await ensureFounderContentSchema();const sql=db();
  const [row]=await sql`select id,version,data from os_founder_content_items where id=${id}`;
  if(!row)throw new FounderContentError('This content was not found.',404,'NOT_FOUND');
  const versions=await sql`select version,data,operation,created_at from os_founder_content_versions where item_id=${id} order by version desc limit 30`;
  return {item:asItem(row),versions:versions.map(v=>({version:v.version,item:v.data,operation:v.operation,createdAt:new Date(v.created_at).toISOString()})),historyLimit:30};
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
  await sql`insert into os_founder_content_items(id,version,day,media_type,extra,archived,data) values(${item.id},${item.version},${item.day},${item.type},${item.extra},${item.status==='archived'},${sql.json(item)})
    on conflict(id) do update set version=excluded.version,day=excluded.day,media_type=excluded.media_type,extra=excluded.extra,archived=excluded.archived,data=excluded.data,updated_at=now()`;
  await sql`insert into os_founder_content_versions(item_id,version,data,operation) values(${item.id},${item.version},${sql.json(item)},${operation})`;
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
export async function mutateFounderContent(value:unknown) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new FounderContentError('Invalid request.');
  const input=value as Mutation;
  if(typeof input.operation!=='string'||!['save','skip_slot','skip','hold','restore','archive','unlock','review','agent','plan_missing','generate'].includes(input.operation))throw new FounderContentError('Choose a supported calendar action.');
  if(typeof input.requestKey!=='string'||!/^[-a-zA-Z0-9_:]{8,120}$/.test(input.requestKey))throw new FounderContentError('A unique request key is required for a safe retry.');
  // There is no executable renderer in this source. Never queue a brief under
  // a Generating label or consume a paid allowance merely because a key exists.
  if(input.operation==='generate')throw new FounderContentError(rendererReason,409,'RENDERER_NOT_CONNECTED');
  const draft=input.operation==='save'?normalizeFounderDraft(input.item):null;
  const media=draft?await verifiedMedia(draft):null;
  await ensureFounderContentSchema();
  const intentHash=createHash('sha256').update(JSON.stringify({...input,requestKey:undefined})).digest('hex');
  return db().begin(async tx=>{
    // One bounded calendar mutation at a time makes slot creation, versions,
    // pause changes and idempotent replay atomic across phones and computers.
    await tx`select pg_advisory_xact_lock(731013)`;
    const sql=tx as unknown as Sql;
    const [duplicate]=await tx`select intent_hash,result from os_founder_content_requests where request_key=${input.requestKey}`;
    if(duplicate){if(duplicate.intent_hash!==intentHash)throw new FounderContentError('This retry key belongs to a different edit.',409,'REQUEST_KEY_CONFLICT');return {...duplicate.result,duplicate:true};}
    let result:Record<string,unknown>;
    const now=new Date().toISOString();
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
      await tx`update os_founder_content_control set paused=${input.paused},version=version+1,updated_at=now() where id=1`;
      result={paused:input.paused,version:Number(control.version)+1,message:input.paused?'New calendar planning is paused. Existing provider schedules are unchanged and may still publish.':'New calendar planning is enabled. Media generation and scheduling remain blocked until their execution paths are verified.'};
    }else if(input.operation==='plan_missing'){
      const [control]=await tx`select paused from os_founder_content_control where id=1 for update`;
      if(control.paused)throw new FounderContentError('Calendar planning is paused. Resume planning before filling missing ideas.',409,'AGENT_PAUSED');
      const items=await planMissingIdeas(sql,now);
      result={items,message:`${items.length} new idea drafts saved. These are plans, not finished assets or accepted schedules.`};
    }else{
      const current=await currentItem(sql,input.id,input.expectedVersion);
      if(externallyInFlight(current))throw new FounderContentError('Provider activity exists for this content. Reconcile it before changing its state; no external schedule was canceled.',409,'PROVIDER_RECONCILIATION_REQUIRED');
      const item={...current,version:current.version+1,updatedAt:now};
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
      await writeVersion(sql,item,input.operation);
      result={item,message:input.operation==='review'?'Review saved for this media and copy version. No publishing or scheduling action was taken.':input.operation==='archive'?'Draft moved to recoverable archive.':input.operation==='unlock'?'Returned to agent control. Existing versions remain in history.':'Saved to account. Existing versions remain in history.'};
    }
    await tx`insert into os_founder_content_requests(request_key,intent_hash,result) values(${input.requestKey},${intentHash},${tx.json(result as Parameters<typeof tx.json>[0])})`;
    return {...result,duplicate:false};
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
        lastError:'Choose source media and destinations. A render worker is not connected.'};
      await writeVersion(sql,item,'plan_missing');created.push(item);
    }
  }
  return created;
}
