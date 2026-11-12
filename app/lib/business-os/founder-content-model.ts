import type {ContentQueue} from './daily-content-model';

export const founderTimeZone = 'America/New_York' as const;
export const founderDestinations = ['instagram','tiktok','youtube','threads','x','telegram'] as const;
export type FounderDestination = typeof founderDestinations[number];
export type FounderMediaType = 'image'|'video';
export type FounderContentStatus = 'idea'|'draft'|'checking'|'ready'|'generating'|'needs_input'|'failed'|'held'|'skipped'|'archived';
export type FounderDelivery = {
  network: string; state: string; providerId: string|null; url: string|null;
  checkedAt: string|null; contentVersion: number; scheduledAt: string|null;
};
export type FounderContentItem = {
  id: string; version: number; day: string; time: string; type: FounderMediaType;
  title: string; idea: string; script: string; caption: string; templateId: string;
  destinations: FounderDestination[]; mediaAssetId: string|null; coverAssetId: string|null;
  mediaUrl: string|null; coverUrl: string|null; mediaVerifiedAt: string|null;
  status: FounderContentStatus; locked: boolean; extra: boolean; createdAt: string;
  updatedAt: string; deliveries: FounderDelivery[]; jobId: string|null;
  lastError: string|null;
};
export type FounderContentDraft = Pick<FounderContentItem,
  'day'|'time'|'type'|'title'|'idea'|'script'|'caption'|'templateId'|'destinations'|'mediaAssetId'|'coverAssetId'|'extra'> & {
  id?: string; expectedVersion?: number;
};
export type FounderContentSlot = {
  type: FounderMediaType; time: string; itemId: string|null;
  state: FounderContentStatus|'missing'; remainingToday: boolean;
};
export type FounderContentDay = {day: string; isToday: boolean; slots: FounderContentSlot[]};
export type FounderContentCoverage = {
  futureDays: number; expectedOriginals: number; planned: number; produced: number;
  scheduled: number; published: number; skipped: number; held: number; missing: number;
  expectedDeliveries: number; acceptedDeliveries: number; publishedDeliveries: number;
  todayRemaining: number; definition: string;
};
export type FounderContentSnapshot = {
  checkedAt: string; today: string; timeZone: typeof founderTimeZone; month: string;
  items: FounderContentItem[]; archivedItems: FounderContentItem[]; days: FounderContentDay[]; coverage: FounderContentCoverage;
  agent: {paused: boolean; version: number; status: string; lastSuccessfulRun: string|null;
    lastSeenAt: string|null; lastCreatedCount: number|null; nextRun: string|null; currentWork: string|null; incrementalBudgetUsd: 0;
    publishingPause: 'not_confirmed'; message: string};
  templates: typeof founderTemplates;
  capabilities: {drafts: boolean; uploads: boolean; imageGeneration: boolean; videoGeneration: boolean;
    scheduling: boolean; publishingPause: boolean; rendererReason: string; publisherReason: string};
  legacyQueue: ContentQueue|null; legacyQueueError: string|null; truncated: boolean;
};

export const founderTemplates = [
  {id:'DA-PHOTO-20261112-v4-REFINED',name:'Photo v4 · approved design',type:'image' as const,
    description:'Matte DARTH red / ALGO white, original emblem, large genuine product visual.'},
  {id:'DA-VIDEO-v15',name:'Video v15 · approved edit',type:'video' as const,
    description:'Chart-led, readable captions, smooth camera movement, normal listening level.'},
] as const;

export class FounderContentError extends Error {
  constructor(message: string, public status = 400, public code = 'INVALID_CONTENT', public current?: FounderContentItem) {
    super(message); this.name = 'FounderContentError';
  }
}
export const founderUuid = (v: unknown): v is string => typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export function isCalendarDay(v: unknown): v is string {
  if(typeof v!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(v))return false;
  const date=new Date(v+'T12:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===v;
}
export function isCalendarMonth(v: unknown): v is string {
  return typeof v==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(v);
}
export function founderClock(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:founderTimeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const get=(name:string)=>parts.find(p=>p.type===name)!.value;
  return {day:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`};
}
export function addCalendarDays(day:string,count:number) {
  if(!isCalendarDay(day))throw new FounderContentError('Choose a valid calendar date.');
  return new Date(Date.parse(day+'T12:00:00Z')+count*86400000).toISOString().slice(0,10);
}
function textField(value:unknown,name:string,maximum:number,required=false) {
  if(typeof value!=='string'||value.length>maximum||/\u0000/.test(value))throw new FounderContentError(`${name} must be text of no more than ${maximum.toLocaleString()} characters.`);
  const text=value.trim();if(required&&!text)throw new FounderContentError(`${name} is required.`);return text;
}
export function normalizeFounderDraft(value: unknown): FounderContentDraft {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new FounderContentError('Content details are required.');
  const v=value as Record<string,unknown>;
  if(v.id!==undefined&&!founderUuid(v.id))throw new FounderContentError('Invalid content identifier.');
  if(v.id&&(!Number.isInteger(v.expectedVersion)||Number(v.expectedVersion)<1))throw new FounderContentError('Refresh this content before editing. A saved version is required.',409,'VERSION_REQUIRED');
  if(!isCalendarDay(v.day)||typeof v.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time))throw new FounderContentError('Choose a valid date and time in America/New_York.');
  if(v.type!=='image'&&v.type!=='video')throw new FounderContentError('Choose image or video.');
  const template=founderTemplates.find(t=>t.id===v.templateId&&t.type===v.type);
  if(!template)throw new FounderContentError('Choose the approved template for this media type.');
  if(!Array.isArray(v.destinations)||v.destinations.some(d=>typeof d!=='string'||!founderDestinations.includes(d as FounderDestination)))throw new FounderContentError('Choose supported destinations.');
  const destinations=Array.from(new Set(v.destinations as FounderDestination[]));
  // The available YouTube delivery path is video-only; never count an image as
  // a destination that the eventual publisher can silently omit.
  if(v.type==='image'&&destinations.includes('youtube'))throw new FounderContentError('YouTube image delivery is unavailable. Choose video or remove YouTube.');
  for(const field of ['mediaAssetId','coverAssetId'])if(v[field]!==undefined&&v[field]!==null&&!founderUuid(v[field]))throw new FounderContentError('Choose a verified uploaded media file.');
  if(v.extra!==undefined&&typeof v.extra!=='boolean')throw new FounderContentError('Extra content must be true or false.');
  return {
    ...(v.id?{id:v.id as string,expectedVersion:Number(v.expectedVersion)}:{}),
    day:v.day,time:v.time,type:v.type,title:textField(v.title,'Title',160,true),
    idea:textField(v.idea??'','Idea',5000),script:textField(v.script??'','Script',24000),
    caption:textField(v.caption??'','Caption',12000),templateId:template.id,destinations,
    mediaAssetId:(v.mediaAssetId as string|null)||null,coverAssetId:(v.coverAssetId as string|null)||null,extra:v.extra===true,
  };
}
export function safeFounderMediaUrl(value: unknown): string|null {
  if(typeof value!=='string'||!value||value.length>2048||/[\u0000-\u0020\\]/.test(value))return null;
  if(value.startsWith('/')&&!value.startsWith('//'))return value;
  try {
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||url.hash)return null;
    const host=url.hostname.toLowerCase();
    if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.startsWith('[')||/^\d+(\.\d+){3}$/.test(host))return null;
    return url.toString();
  }catch{return null;}
}
export function founderDays(items:FounderContentItem[],now=new Date()):FounderContentDay[] {
  const clock=founderClock(now);
  return Array.from({length:6},(_,i)=>{
    const day=addCalendarDays(clock.day,i);
    return {day,isToday:i===0,slots:(['image','video'] as const).map(type=>{
      const item=items.find(row=>row.day===day&&row.type===type&&!row.extra&&row.status!=='archived');
      const time=item?.time||(type==='image'?'09:00':'15:00');
      return {type,time,itemId:item?.id||null,state:item?.status||'missing',remainingToday:i===0&&time>clock.time};
    })};
  });
}
export function deliveryIsAccepted(item:FounderContentItem,delivery:FounderDelivery) {
  return delivery.contentVersion===item.version&&Boolean(delivery.providerId)&&['scheduled','published'].includes(delivery.state);
}
export function deliveryIsPublished(item:FounderContentItem,delivery:FounderDelivery) {
  return deliveryIsAccepted(item,delivery)&&delivery.state==='published'&&Boolean(delivery.url)&&Boolean(delivery.checkedAt);
}
export function founderCoverage(items:FounderContentItem[],now=new Date()):FounderContentCoverage {
  const days=founderDays(items,now),future=days.slice(1),ids=new Set(future.flatMap(d=>d.slots.map(s=>s.itemId)).filter(Boolean));
  const originals=items.filter(i=>ids.has(i.id));
  const active=originals.filter(i=>!['skipped','held','archived'].includes(i.status));
  const produced=active.filter(i=>i.status==='ready'&&Boolean(i.mediaAssetId)&&Boolean(i.mediaVerifiedAt));
  const allDestinations=(item:FounderContentItem,predicate:typeof deliveryIsAccepted)=>item.destinations.length>0&&item.destinations.every(network=>item.deliveries.some(d=>d.network===network&&predicate(item,d)));
  return {futureDays:5,expectedOriginals:10,planned:active.filter(i=>Boolean(i.idea||i.title)).length,
    produced:produced.length,scheduled:produced.filter(i=>allDestinations(i,deliveryIsAccepted)).length,
    published:produced.filter(i=>allDestinations(i,deliveryIsPublished)).length,
    skipped:originals.filter(i=>i.status==='skipped').length,held:originals.filter(i=>i.status==='held').length,
    missing:future.flatMap(d=>d.slots).filter(s=>s.state==='missing').length,
    expectedDeliveries:active.reduce((n,i)=>n+i.destinations.length,0),
    acceptedDeliveries:active.reduce((n,i)=>n+i.destinations.filter(network=>i.deliveries.some(d=>d.network===network&&deliveryIsAccepted(i,d))).length,0),
    publishedDeliveries:active.reduce((n,i)=>n+i.destinations.filter(network=>i.deliveries.some(d=>d.network===network&&deliveryIsPublished(i,d))).length,0),
    todayRemaining:days[0].slots.filter(s=>s.remainingToday).length,
    definition:'Five complete future Eastern dates, ten original slots. Skips and holds remain visible; destination receipts are counted separately. Planned does not mean produced or scheduled.'};
}
export function assertFounderVersion(current:FounderContentItem,expected:unknown) {
  if(!Number.isInteger(expected)||current.version!==expected)throw new FounderContentError('This content changed on another device. Review the current saved version before saving.',409,'VERSION_CONFLICT',current);
}
export function assertFounderDispatch(current:FounderContentItem,expectedVersion:number,paused:boolean) {
  assertFounderVersion(current,expectedVersion);
  if(paused||current.status!=='ready'||!current.mediaAssetId||!current.mediaVerifiedAt||current.locked)throw new FounderContentError('This content is paused, locked, or not ready for agent dispatch.',409,'DISPATCH_HELD');
  if(current.deliveries.some(d=>['publishing','outcome_unknown'].includes(d.state)))throw new FounderContentError('Reconcile the previous provider outcome before retrying.',409,'OUTCOME_UNKNOWN');
}
