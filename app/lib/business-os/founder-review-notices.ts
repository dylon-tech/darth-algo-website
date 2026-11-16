import {db} from '../affiliate-db';
import type {FounderContentItem} from './founder-content-model';
type Sql=ReturnType<typeof db>;
type Row=Record<string,unknown>;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function founderReviewBody(item:Pick<FounderContentItem,'id'|'type'|'title'|'version'>,jobId:string){
 const kind=item.type==='image'?'photo':'video',title=item.title.replace(/[\r\n\u0000-\u001f]+/g,' ').trim().slice(0,100);
 return `Result: Your ${kind} is ready for review: ${title}.\nNext: Does this ${kind} and its caption look good? Open Content to approve this version or regenerate it. Nothing is published by this notification.\nVersion: ${item.version}\nSource: /owner?tab=content&item=${item.id}\nJob: ${jobId}`;
}
/** Call in the render completion transaction. Replays do not change unread time. */
export async function writeFounderReviewNotice(sql:Sql,jobId:string,item:FounderContentItem,now:string){
 if(!uuid.test(jobId)||!uuid.test(item.id)||!Number.isSafeInteger(item.version)||item.version<1||item.status!=='checking'||!item.mediaAssetId||!item.mediaVerifiedAt)throw Error('REVIEW_NOTICE_NOT_READY');
 const [table]=await sql`select to_regclass('public.os_messages') is not null as present`;if(!table?.present)return;
 const body=founderReviewBody(item,jobId);
 await sql`insert into os_messages(id,department,role,body,run_id,created_at) values(${jobId},'content','agent',${body},null,${now}) on conflict(id) do update set body=excluded.body,created_at=excluded.created_at where os_messages.department='content' and os_messages.role='agent' and os_messages.body<>excluded.body`;
}
async function available(sql:Sql){const [tables]=await sql`select to_regclass('public.os_founder_render_jobs') is not null and to_regclass('public.os_founder_content_items') is not null as present`;return tables?.present===true;}
/** Durable render/item records are the source, even if the optional message
 * ledger was unavailable when rendering finished. Reads never create approvals,
 * mutate content, send messages, or run an agent. A new version has a new Inbox ID. */
export async function readFounderReviewNotices(sql:Sql=db(),jobId?:string,version?:number):Promise<Row[]>{
 if(!await available(sql))return [];
 const rows=jobId?await sql`select j.id as job_id,i.id as item_id,i.version,i.data,i.updated_at from os_founder_render_jobs j join os_founder_content_items i on i.id=j.item_id where j.id=${jobId} and j.status='completed' and j.content_version=(select max(prior.content_version) from os_founder_render_jobs prior where prior.item_id=j.item_id and prior.media_asset_id=j.media_asset_id and prior.status='completed') and not i.archived and i.version=${version??0} and i.data->>'status'='checking' and i.data->>'mediaAssetId'=j.media_asset_id::text and i.data->>'mediaVerifiedAt' is not null and (i.media_type='image' or i.data->>'coverAssetId' is not null)`
 :await sql`select j.id as job_id,i.id as item_id,i.version,i.data,i.updated_at from os_founder_render_jobs j join os_founder_content_items i on i.id=j.item_id where j.status='completed' and j.content_version=(select max(prior.content_version) from os_founder_render_jobs prior where prior.item_id=j.item_id and prior.media_asset_id=j.media_asset_id and prior.status='completed') and not i.archived and i.data->>'status'='checking' and i.data->>'mediaAssetId'=j.media_asset_id::text and i.data->>'mediaVerifiedAt' is not null and (i.media_type='image' or i.data->>'coverAssetId' is not null) order by i.updated_at desc,j.id limit 80`;
 const [publications]=await sql`select to_regclass('public.os_founder_publications') is not null as present`;
 const approved=publications?.present&&rows.length?await sql`select item_id,content_version from os_founder_publications where item_id=any(${rows.map(r=>String(r.item_id))}::uuid[]) and state='approved' and approved_at is not null`:[];
 // Imported versions are locked to a provider workflow. A generic “regenerate”
 // prompt is no longer actionable; the video ledger emits its own posting-review
 // or reconciliation message. Optional absence must not hide ordinary reviews.
 const [videoTable]=await sql`select to_regclass('public.os_founder_video_publications') is not null as present`;
 const videoLocked=videoTable?.present&&rows.length?await sql`select item_id,content_version from os_founder_video_publications where item_id=any(${rows.map(r=>String(r.item_id))}::uuid[]) and state<>'discarded' and (import_consented_at is not null or approved_at is not null)`:[];
 const blocked=[...approved,...videoLocked];
 return rows.filter(r=>!blocked.some(p=>String(p.item_id)===String(r.item_id)&&Number(p.content_version)===Number(r.version))).map(r=>{const item={...r.data as FounderContentItem,id:String(r.item_id),version:Number(r.version)};return {id:`${r.job_id}:${item.version}`,department:'content',body:founderReviewBody(item,String(r.job_id)),job_id:String(r.job_id),created_at:r.updated_at,content_version:item.version};});
}
/** Hide old completion messages once their structured source is available;
 * failures and unrelated agent messages remain visible. */
export async function completedFounderReviewIds(ids:string[],sql:Sql=db()):Promise<Set<string>>{
 if(!ids.length||!await available(sql))return new Set();
 const rows=await sql`select id from os_founder_render_jobs where id=any(${ids}::uuid[]) and status='completed'`;return new Set(rows.map(r=>String(r.id)));
}
