import {randomUUID,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {db} from '../affiliate-db';
import {bufferGraphQL,bufferStatus} from './buffer';
import {selectSocialChannel,getSocialPost,threadsTopicText,type SocialPost} from './buffer-social';
import {socialPostUrl} from './daily-social-policy';
import {getFounderMediaAsset,getFounderMediaBytes} from './founder-media';
import type {FounderContentItem} from './founder-content-model';
import {publicationHash,photoItemMatches,validatePhotoSnapshot,founderPhotoNetworks,founderPhotoAiDisclosure,type FounderPhotoSnapshot,type FounderPhotoNetwork} from './founder-publication-policy';
export const founderPublicationSchema=`create table if not exists os_founder_publications(id uuid primary key,item_id uuid not null,content_version integer not null,payload jsonb not null,payload_hash text not null,state text not null default 'needs_review',export_token text not null,export_expires_at timestamptz not null,approved_at timestamptz,created_at timestamptz not null default now(),unique(item_id,content_version,payload_hash));
create table if not exists os_founder_publication_destinations(publication_id uuid not null references os_founder_publications(id),network text not null,state text not null default 'waiting',provider_id text,url text,checked_at timestamptz,error text,primary key(publication_id,network));`;
type Sql=ReturnType<typeof db>;
let ready:Promise<void>|undefined;
export function ensureFounderPublicationSchema(){return ready??=db().begin(async tx=>{await tx`select pg_advisory_xact_lock(73111508)`;await tx.unsafe(founderPublicationSchema);}).then(()=>{}).catch(e=>{ready=undefined;throw e;});}
const itemFrom=(row:Record<string,unknown>)=>({...row.data as FounderContentItem,id:String(row.id),version:Number(row.version)});
const tokenHash=(token:string)=>createHash('sha256').update(token).digest();
const mediaUrl=(id:string,token:string)=>`https://www.darthalgo.com/api/founder-publication-media/${id}/${token}`;
export const founderPhotoPublishingEnabled=()=>process.env.VERCEL_ENV==='production'&&process.env.FOUNDER_PHOTO_PUBLISHING_ENABLED==='true';
export async function hasFounderPublicationAttempt(itemId:string,sql:Sql=db()){
 // Safe before the additive schema is installed. Call under the caller's item row lock.
 const [exists]=await sql`select to_regclass('public.os_founder_publications') is not null as present`;if(!exists?.present)return false;
 const [row]=await sql`select p.id from os_founder_publications p join os_founder_publication_destinations d on d.publication_id=p.id where p.item_id=${itemId} and d.state in ('started','submitted','published','outcome_unknown','provider_failed','content_mismatch') limit 1`;return Boolean(row);
}
export async function listFounderPublications(itemId?:string){await ensureFounderPublicationSchema();const rows=itemId?await db()`select id,item_id,content_version,payload,payload_hash,state,approved_at,created_at from os_founder_publications where item_id=${itemId} order by created_at desc limit 50`:await db()`select id,item_id,content_version,payload,payload_hash,state,approved_at,created_at from os_founder_publications order by created_at desc limit 50`;return Promise.all(rows.map(async row=>({...row,destinations:await db()`select network,state,provider_id,url,checked_at,error from os_founder_publication_destinations where publication_id=${row.id}`,enabled:founderPhotoPublishingEnabled()})));}
export async function prepareFounderPhotoPublication(input:{itemId:string;expectedVersion:number;publishAt:string},now=new Date()){
 await ensureFounderPublicationSchema();const at=Date.parse(input.publishAt);if(!Number.isFinite(at)||at<now.getTime()-300000||at>now.getTime()+7*86400000)throw Error('PHOTO_PUBLICATION_TIME_INVALID');
 const [row]=await db()`select id,version,data from os_founder_content_items where id=${input.itemId}`;if(!row)throw Error('CONTENT_NOT_FOUND');const item=itemFrom(row);
 if(item.version!==input.expectedVersion||item.type!=='image'||!item.mediaAssetId||!item.mediaVerifiedAt||!['checking','ready'].includes(item.status))throw Error('PHOTO_VERSION_NOT_READY');
 if(!item.destinations.length||item.destinations.some(n=>!founderPhotoNetworks.includes(n as FounderPhotoNetwork)))throw Error('PHOTO_DESTINATIONS_UNSUPPORTED');
 const [asset,connection]=await Promise.all([getFounderMediaAsset(item.mediaAssetId),bufferStatus({fresh:true})]);if(!asset)throw Error('PHOTO_ASSET_NOT_FOUND');
 const destinations=item.destinations.map(network=>{const channel=selectSocialChannel(connection.channels,network as FounderPhotoNetwork);if(!channel)throw Error('PHOTO_CHANNEL_NOT_READY:'+network);return {network:network as FounderPhotoNetwork,channelId:channel.id,name:channel.displayName||channel.name||network};});
 const payload=validatePhotoSnapshot({itemId:item.id,version:item.version,mediaAssetId:asset.id,mediaSha256:asset.sha256,mimeType:asset.mimeType,bytes:asset.bytes,caption:item.caption,altText:item.title,publishAt:new Date(at).toISOString(),isAiGenerated:true,aiDisclosure:founderPhotoAiDisclosure,destinations}),hash=publicationHash(payload);
 return db().begin(async tx=>{const [current]=await tx`select id,version,data from os_founder_content_items where id=${item.id} for update`;if(!current||!photoItemMatches(itemFrom(current),payload)||await hasFounderPublicationAttempt(item.id,tx as unknown as Sql))throw Error('PHOTO_VERSION_CHANGED_OR_DISPATCHED');
 const [existing]=await tx`select id,payload_hash,state from os_founder_publications where item_id=${item.id} and content_version=${item.version} and payload_hash=${hash}`;if(existing)return {id:String(existing.id),hash,payload,state:String(existing.state)};
 await tx`update os_founder_publications set state='superseded' where item_id=${item.id} and state in ('needs_review','approved')`;
 const id=randomUUID(),token=randomBytes(32).toString('base64url');await tx`insert into os_founder_publications(id,item_id,content_version,payload,payload_hash,export_token,export_expires_at) values(${id},${item.id},${item.version},${tx.json(payload)},${hash},${token},${new Date(Math.max(at,now.getTime())+86400000).toISOString()})`;
 for(const d of destinations)await tx`insert into os_founder_publication_destinations(publication_id,network) values(${id},${d.network})`;return {id,hash,payload,state:'needs_review' as const};});
}
export async function approveFounderPhotoPublication(input:{id:string;expectedHash:string;confirmApproved:boolean},now=new Date()){
 if(!founderPhotoPublishingEnabled())throw Error('PHOTO_PUBLISHING_NOT_ACTIVATED');
 if(input.confirmApproved!==true)throw Error('PHOTO_EXPLICIT_APPROVAL_REQUIRED');await ensureFounderPublicationSchema();
 return db().begin(async tx=>{const [p]=await tx`select * from os_founder_publications where id=${input.id}`;if(!p||p.payload_hash!==input.expectedHash||publicationHash(p.payload)!==input.expectedHash)throw Error('PHOTO_APPROVAL_CHANGED');
 const s=validatePhotoSnapshot(p.payload),[item]=await tx`select id,version,data from os_founder_content_items where id=${s.itemId} for update`;const [locked]=await tx`select state from os_founder_publications where id=${input.id} for update`;
 if(!['needs_review','approved'].includes(locked.state)||!item||!photoItemMatches(itemFrom(item),s)||Date.parse(s.publishAt)<now.getTime()-300000||Date.parse(String(p.export_expires_at))<=now.getTime())throw Error('PHOTO_REVIEW_REQUIRED');
 await tx`update os_founder_publications set state='approved',approved_at=${now.toISOString()} where id=${input.id}`;return {id:input.id,state:'approved',message:'This exact photo, caption, accounts, AI label and time are approved. Publication is not yet confirmed.'};});
}
export async function readFounderPublicationMedia(id:string,token:string,now=new Date()){
 if(!founderPhotoPublishingEnabled()||!/^[-a-f0-9]{36}$/.test(id)||!/^[-\w]{43}$/.test(token))return null;await ensureFounderPublicationSchema();const [p]=await db()`select * from os_founder_publications where id=${id}`;
 if(!p||p.state!=='approved'||publicationHash(p.payload)!==p.payload_hash||!p.approved_at||Date.parse(String(p.export_expires_at))<=now.getTime()||!timingSafeEqual(tokenHash(token),tokenHash(String(p.export_token))))return null;
 const [row]=await db()`select id,version,data from os_founder_content_items where id=${p.item_id}`;if(!row||!photoItemMatches(itemFrom(row),p.payload))return null;
 const media=await getFounderMediaBytes(p.payload.mediaAssetId);return media&&media.asset.sha256===p.payload.mediaSha256&&media.bytes.length===p.payload.bytes&&createHash('sha256').update(media.bytes).digest('hex')===p.payload.mediaSha256?media:null;
}
function matches(post:SocialPost,s:FounderPhotoSnapshot,network:FounderPhotoNetwork,url:string){const d=s.destinations.find(d=>d.network===network)!;return post.channelId===d.channelId&&(post.text===s.caption||(network==='threads'&&threadsTopicText(post.text)===threadsTopicText(s.caption)))&&post.assets?.length===1&&post.assets[0].type==='image'&&post.assets[0].source===url&&(post.assets[0].image?.altText===s.altText||(network==='threads'&&!post.assets[0].image?.altText));}
async function reconcile(id:string,network:FounderPhotoNetwork){
 const sql=db(),[p]=await sql`select * from os_founder_publications where id=${id}`,[d]=await sql`select * from os_founder_publication_destinations where publication_id=${id} and network=${network}`;if(!p||!d?.provider_id)return;
 try{const post=await getSocialPost(String(d.provider_id));if(post.id!==d.provider_id)throw Error('PHOTO_PROVIDER_ID_MISMATCH');const same=matches(post,p.payload,network,mediaUrl(id,p.export_token));const url=socialPostUrl(post.externalLink,network);const state=!same?'content_mismatch':post.status==='error'?'provider_failed':post.status==='sent'&&post.sentAt&&url?'published':'submitted';
 await sql`update os_founder_publication_destinations set state=${state},url=${state==='published'?url:null},checked_at=${new Date().toISOString()},error=${state==='content_mismatch'?'Provider content differs. No automatic retry.':state==='provider_failed'?'Provider reported failure. No automatic retry.':null} where publication_id=${id} and network=${network}`;
 }catch{await sql`update os_founder_publication_destinations set checked_at=${new Date().toISOString()},error='Receipt unavailable. No automatic retry.' where publication_id=${id} and network=${network}`;}
}
async function writePublicationNotice(id:string){
 const sql=db(),[table]=await sql`select to_regclass('public.os_messages') is not null as present`;if(!table?.present)return;
 const [p]=await sql`select item_id,payload,state from os_founder_publications where id=${id}`;if(!p)return;
 const rows=await sql`select network,state,url,error from os_founder_publication_destinations where publication_id=${id} order by network`;
 const published=rows.filter(r=>r.state==='published').length,attention=rows.some(r=>r.error||['outcome_unknown','content_mismatch','provider_failed','started'].includes(String(r.state)));
 if(!published&&!attention&&p.state!=='expired'&&!rows.some(r=>r.state==='expired'))return;
 const expired=p.state==='expired'||rows.every(r=>r.state==='expired');
 const result=expired?'The approved photo window expired. Nothing new was sent.':published===rows.length?'Your approved photo is published on every requested destination.':`${published} of ${rows.length} photo destinations confirmed. ${attention?'The remaining delivery needs attention.':'Other receipts are pending.'}`;
 const next=expired?'Prepare a new time and approve it.':attention?'Open Content to review each receipt. Do not resend an uncertain attempt.':'Open Content to check the saved receipts.';
 const receipts=rows.map(r=>{const url=socialPostUrl(r.url,r.network as FounderPhotoNetwork);return `${r.network}: ${r.state}${url?' · '+url:''}`;}).join('\n');
 const body=`Result: ${result}\nNext: ${next}\n${receipts}\nSource: /owner?tab=content&item=${p.item_id}`;
 await sql`insert into os_messages(id,department,role,body,run_id,created_at) values(${id},'content','agent',${body},null,${new Date().toISOString()}) on conflict(id) do update set body=excluded.body,created_at=excluded.created_at where os_messages.department='content' and os_messages.role='agent' and os_messages.body<>excluded.body`;
}
export async function executeDueFounderPhotoPublications(now=new Date()){
 const startedAt=Date.now(),clockNow=()=>now.getTime()+Date.now()-startedAt;
 if(!founderPhotoPublishingEnabled())return {enabled:false,attempted:0,reason:'Photo publishing is not activated.'};await ensureFounderPublicationSchema();const sql=db();const [control]=await sql`select paused from os_control where id=1`;if(!control||control.paused)return {enabled:true,attempted:0,reason:'Existing worker is paused.'};
 const interrupted=await sql`update os_founder_publication_destinations set state='outcome_unknown',error='An interrupted attempt needs reconciliation. Do not resend.' where state='started' and checked_at<${new Date(now.getTime()-300000).toISOString()} returning publication_id`;for(const d of interrupted)await writePublicationNotice(String(d.publication_id));
 const expired=await sql`update os_founder_publication_destinations d set state='expired',error='Approval window expired. Prepare a new time for review.' from os_founder_publications p where d.publication_id=p.id and d.state='waiting' and p.state='approved' and (p.export_expires_at<=${now.toISOString()} or (p.payload->>'publishAt')::timestamptz<${new Date(now.getTime()-15*60000).toISOString()}) returning d.publication_id`;for(const d of expired)await writePublicationNotice(String(d.publication_id));
 const due=await sql`select * from os_founder_publications where state='approved' and approved_at is not null and (payload->>'publishAt')::timestamptz<=${now.toISOString()} and exists(select 1 from os_founder_publication_destinations d where d.publication_id=os_founder_publications.id and (d.state in ('waiting','submitted') or (d.state='outcome_unknown' and d.provider_id is not null))) order by (select min(d.checked_at) from os_founder_publication_destinations d where d.publication_id=os_founder_publications.id and (d.state in ('waiting','submitted') or (d.state='outcome_unknown' and d.provider_id is not null))) nulls first,created_at limit 3`;let attempted=0;
 for(const p of due){const s=validatePhotoSnapshot(p.payload);if(publicationHash(s)!==p.payload_hash)continue;
 for(const dest of s.destinations){if(Date.now()-startedAt>90000)return {enabled:true,attempted,reason:'Execution budget reached; untouched destinations remain queued.'};const [delivery]=await sql`select * from os_founder_publication_destinations where publication_id=${p.id} and network=${dest.network}`;if(!delivery)continue;
 if(delivery.state!=='waiting'){if(delivery.provider_id&&['submitted','outcome_unknown'].includes(delivery.state))await reconcile(String(p.id),dest.network);continue;}
 // Verify connection and bytes before claiming. Neither call publishes media.
 let verified=false;try{const connection=await bufferStatus({fresh:true}),channel=selectSocialChannel(connection.channels,dest.network);const media=await getFounderMediaBytes(s.mediaAssetId);verified=Boolean(channel?.id===dest.channelId&&media&&media.asset.sha256===s.mediaSha256&&media.bytes.length===s.bytes&&createHash('sha256').update(media.bytes).digest('hex')===s.mediaSha256);}catch{/* Keep waiting; no outbound attempt exists. */}
 if(!verified){await sql`update os_founder_publication_destinations set error='Account or exact media is unavailable. Nothing sent.',checked_at=${now.toISOString()} where publication_id=${p.id} and network=${dest.network} and state='waiting'`;continue;}
 const claimed=await sql.begin(async tx=>{const [item]=await tx`select id,version,data from os_founder_content_items where id=${s.itemId} for update`;const [current]=await tx`select * from os_founder_publications where id=${p.id} for update`;const [c]=await tx`select paused from os_control where id=1 for share`;
 if(!founderPhotoPublishingEnabled()||!c||c.paused||!current||current.state!=='approved'||!current.approved_at||current.payload_hash!==publicationHash(s)||!item||!photoItemMatches(itemFrom(item),s)||Date.parse(String(current.export_expires_at))<=clockNow()||Date.parse(s.publishAt)<clockNow()-15*60000)return false;
 const rows=await tx`update os_founder_publication_destinations set state='started',checked_at=${now.toISOString()},error=null where publication_id=${p.id} and network=${dest.network} and state='waiting' returning network`;return rows.length===1;});
 if(!claimed){await sql`update os_founder_publication_destinations set checked_at=${now.toISOString()},error='Current version or dispatch controls changed. Review before publication.' where publication_id=${p.id} and network=${dest.network} and state='waiting'`;continue;}attempted++;
 try{const fields='id text channelId status sentAt externalLink assets { source type ... on ImageAsset { image { altText } } }';
 const result=await bufferGraphQL<{createPost:{post?:SocialPost}}>(`mutation FounderPhotoCreate($input:CreatePostInput!){createPost(input:$input){... on PostActionSuccess{post{${fields}}} ... on MutationError{message}}}`,{input:{channelId:dest.channelId,text:s.caption,assets:[{image:{url:mediaUrl(String(p.id),p.export_token),metadata:{altText:s.altText}}}],mode:'shareNow',schedulingType:'automatic',saveToDraft:false,needsApproval:false,aiAssisted:true,...(dest.network==='instagram'?{metadata:{instagram:{type:'post',shouldShareToFeed:true,isAiGenerated:true}}}:{})}});
 const post=result.createPost?.post;if(!post?.id||!/^[-\w]{1,100}$/.test(post.id))throw Error('PHOTO_PROVIDER_RESULT_UNKNOWN');
 const saved=await sql`update os_founder_publication_destinations set state='submitted',provider_id=${post.id},checked_at=${new Date().toISOString()} where publication_id=${p.id} and network=${dest.network} and state in ('started','outcome_unknown') and (provider_id is null or provider_id=${post.id}) returning provider_id`;if(!saved.length)throw Error('PHOTO_PROVIDER_ID_CONFLICT');await reconcile(String(p.id),dest.network);
 }catch{await sql`update os_founder_publication_destinations set state='outcome_unknown',error='The provider outcome is uncertain. Do not resend; reconcile this attempt.',checked_at=${new Date().toISOString()} where publication_id=${p.id} and network=${dest.network} and state='started'`;}
 }await writePublicationNotice(String(p.id));}return {enabled:true,attempted};
}

export async function founderPublicationSummaries(ids:string[]) {
 if(!ids.length)return [];const sql=db(),[exists]=await sql`select to_regclass('public.os_founder_publications') is not null as present`;if(!exists?.present)return [];
 const rows=await sql`select distinct on (p.item_id) p.item_id,p.content_version,p.state,p.approved_at,
 (select count(*)::int from os_founder_publication_destinations d where d.publication_id=p.id) total,
 (select count(*)::int from os_founder_publication_destinations d where d.publication_id=p.id and d.state='published') published,
 (select count(*)::int from os_founder_publication_destinations d where d.publication_id=p.id and d.state in ('outcome_unknown','content_mismatch','provider_failed','expired')) attention
 from os_founder_publications p where p.item_id=any(${ids}::uuid[]) order by p.item_id,p.created_at desc`;
 return rows.map(r=>({itemId:String(r.item_id),version:Number(r.content_version),state:Number(r.total)>0&&Number(r.published)===Number(r.total)?'published':Number(r.attention)>0?'needs_attention':String(r.state),approvedAt:r.approved_at?new Date(r.approved_at).toISOString():null}));
}
