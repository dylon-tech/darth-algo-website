import {createHash} from 'node:crypto';
import {db} from '../affiliate-db';
import {founderUuid,type FounderContentItem,type FounderDelivery} from './founder-content-model';
import {validateFounderVideoSettings} from './founder-video-publication-policy';

type Row=Record<string,unknown>;
export type FounderVideoReceiptSummary={itemId:string;version:number;state:'published'|'approved'|'needs_attention';approvedAt:string;deliveries:FounderDelivery[]};
const networks=['youtube','tiktok','instagram'] as const;
const object=(value:unknown):value is Row=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const providerId=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=200&&!/[\s\x00-\x1f\x7f]/.test(value);
const digest=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const timestamp=(value:unknown)=>{if(typeof value!=='string'&&!(value instanceof Date))return null;const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString():null;};
// The durable dispatch ledger hashes the complete recursively sorted snapshot.
// This reader does not import the dispatcher or any provider transport.
function stable(value:unknown,depth=0):unknown{if(depth>12)throw Error('Snapshot depth');return Array.isArray(value)?value.map(v=>stable(v,depth+1)):object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key],depth+1)])):value;}
function snapshotHash(value:unknown){return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function nativeUrl(value:unknown,network:string){
 if(typeof value!=='string'||value.length>2000||/[\x00-\x20\\]/.test(value))return null;
 try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port)return null;url.hash='';
  if(network==='youtube'){
   if(url.hostname==='youtu.be'&&/^\/[A-Za-z0-9_-]{11}$/.test(url.pathname)){url.search='';return url.href;}
   if(!['youtube.com','www.youtube.com'].includes(url.hostname))return null;
   if(url.pathname==='/watch'&&/^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get('v')||'')){const id=url.searchParams.get('v')!;url.search='';url.searchParams.set('v',id);return url.href;}
   if(/^\/(shorts|live)\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname)){url.search='';return url.href;}
  }
  if(network==='tiktok'&&['tiktok.com','www.tiktok.com'].includes(url.hostname)&&/^\/@[\w.-]+\/video\/\d+\/?$/.test(url.pathname)){url.search='';return url.href;}
  if(network==='instagram'&&['instagram.com','www.instagram.com'].includes(url.hostname)&&/^\/(reel|p)\/[\w-]+\/?$/.test(url.pathname)){url.search='';return url.href;}
 }catch{}return null;
}

function summary(item:FounderContentItem,row:Row,now:Date):FounderVideoReceiptSummary|null{
 try{
  const snapshot=row.snapshot,approvedAt=timestamp(row.approved_at),consentedAt=timestamp(row.import_consented_at);
  if(!object(snapshot)||item.type!=='video'||!['checking','ready'].includes(item.status)||item.id!==row.item_id||item.version!==Number(row.content_version)||!approvedAt||!consentedAt||consentedAt>approvedAt||Date.parse(approvedAt)>now.getTime()+60000||!['publishing','complete','attention'].includes(String(row.state)))return null;
  if(!digest(row.snapshot_hash)||snapshotHash(snapshot)!==row.snapshot_hash||snapshot.itemId!==item.id||snapshot.version!==item.version||snapshot.mediaAssetId!==item.mediaAssetId||snapshot.coverAssetId!==item.coverAssetId||snapshot.title!==item.title||snapshot.caption!==item.caption||!timestamp(item.mediaVerifiedAt)||!timestamp(snapshot.publishAt))return null;
  if(item.destinations.length!==3||!networks.every(network=>item.destinations.includes(network))||JSON.stringify(snapshot.consentScope)!==JSON.stringify(['video','cover']))return null;
  // Media rows are immutable stored assets. Only metadata is read: no private
  // bytes, export capabilities, provider uploads or signed URLs enter this view.
  if(!digest(snapshot.mediaSha256)||row.media_sha256!==snapshot.mediaSha256||row.media_kind!=='video'||row.media_mime_type!==snapshot.mimeType||Number(row.media_byte_size)!==snapshot.bytes||row.media_full_decode!==true||!timestamp(row.media_verified_at))return null;
  if(!digest(snapshot.coverSha256)||row.cover_sha256!==snapshot.coverSha256||row.cover_kind!=='image'||row.cover_mime_type!==snapshot.coverMimeType||Number(row.cover_byte_size)!==snapshot.coverBytes||row.cover_full_decode!==true||!timestamp(row.cover_verified_at))return null;
  const settings=validateFounderVideoSettings(snapshot.settings),evidence=row.draft_evidence;
  if(!object(evidence)||!providerId(evidence.postId)||!providerId(evidence.revision)||!digest(evidence.requestSha256)||!Array.isArray(evidence.publicationIds)||evidence.publicationIds.length!==2||!evidence.publicationIds.every(providerId)||new Set(evidence.publicationIds).size!==2||!Array.isArray(row.receipts)||row.receipts.length>12)return null;
  const deliveries=new Map<string,FounderDelivery>(),ambiguous=new Set<string>();
  for(const value of row.receipts){
   if(!object(value)||!networks.includes(value.network as typeof networks[number]))continue;
   const network=String(value.network),checkedAt=timestamp(value.checkedAt),url=nativeUrl(value.url,network);
   if(value.contentVersion!==item.version||!providerId(value.providerId)||!checkedAt||checkedAt<approvedAt||Date.parse(checkedAt)>now.getTime()+60000||!['published','submitted','failed','completed_unconfirmed'].includes(String(value.state))){ambiguous.add(network);continue;}
   if(network!=='instagram'&&value.providerId!==evidence.publicationIds[network==='youtube'?0:1]){ambiguous.add(network);continue;}
   if(value.state==='published'&&(!url||(network==='youtube'&&settings.youtube.privacyStatus!=='public')||(network==='tiktok'&&settings.tiktok.privacyLevel!=='PUBLIC_TO_EVERYONE'))){ambiguous.add(network);continue;}
   const delivery:FounderDelivery={network,state:value.state==='submitted'?'publishing':String(value.state),providerId:value.providerId,url:value.state==='published'?url:null,checkedAt,contentVersion:item.version,scheduledAt:null};
   const prior=deliveries.get(network);
   if(prior&&JSON.stringify(prior)!==JSON.stringify(delivery))ambiguous.add(network);else deliveries.set(network,delivery);
  }
  for(const network of ambiguous)deliveries.delete(network);
  const confirmed=[...deliveries.values()];if(!confirmed.length)return null;
  const allPublished=networks.every(network=>deliveries.get(network)?.state==='published');
  return {itemId:item.id,version:item.version,state:allPublished?'published':ambiguous.size||confirmed.some(d=>['failed','completed_unconfirmed'].includes(d.state))?'needs_attention':'approved',approvedAt,deliveries:confirmed};
 }catch{return null;}
}

/** Read only the existing website dispatch ledger. Local approval/publishAt,
 * queued jobs and completed_unconfirmed receipts never establish a schedule
 * or a public post. No historic external publication is inferred or imported. */
export async function founderVideoReceiptSummaries(items:FounderContentItem[],now=new Date()):Promise<FounderVideoReceiptSummary[]>{
 const videos=items.filter(item=>item.type==='video'&&founderUuid(item.id));if(!videos.length)return [];
 const sql=db(),[tables]=await sql`select to_regclass('public.os_founder_video_publications') is not null and to_regclass('public.os_founder_media_assets') is not null as present`;if(!tables?.present)return [];
 const ids=[...new Set(videos.map(item=>item.id))];
 const rows=await sql`select p.item_id,p.content_version,p.snapshot,p.snapshot_hash,p.state,p.import_consented_at,p.approved_at,p.draft_evidence,p.receipts,
  media.kind media_kind,media.sha256 media_sha256,media.mime_type media_mime_type,media.byte_size media_byte_size,media.full_decode media_full_decode,media.verified_at media_verified_at,
  cover.kind cover_kind,cover.sha256 cover_sha256,cover.mime_type cover_mime_type,cover.byte_size cover_byte_size,cover.full_decode cover_full_decode,cover.verified_at cover_verified_at
  from os_founder_video_publications p
  join os_founder_media_assets media on media.id::text=p.snapshot->>'mediaAssetId'
  join os_founder_media_assets cover on cover.id::text=p.snapshot->>'coverAssetId'
  where p.item_id=any(${ids}::uuid[]) and p.import_consented_at is not null and p.approved_at is not null and p.state in ('publishing','complete','attention')
  order by p.item_id,p.content_version limit 1025`;
 if(rows.length>1024)throw Error('Video receipt coverage could not be verified.');
 const result:FounderVideoReceiptSummary[]=[];
 for(const item of videos){const matching=rows.filter(row=>row.item_id===item.id&&Number(row.content_version)===item.version);if(matching.length!==1)continue;const value=summary(item,matching[0],now);if(value)result.push(value);}
 return result;
}

/** Preserve every saved creative field and earlier/protected receipt. The
 * current dispatch projection is additive and is never written to the item. */
export function withFounderVideoReceipts(item:FounderContentItem,value:FounderVideoReceiptSummary|undefined):FounderContentItem{
 if(!value||value.itemId!==item.id||value.version!==item.version||item.publication||item.deliveries.some(delivery=>delivery.contentVersion===item.version))return item;
 return {...item,publication:{version:value.version,state:value.state,approvedAt:value.approvedAt},deliveries:[...item.deliveries,...value.deliveries]};
}
