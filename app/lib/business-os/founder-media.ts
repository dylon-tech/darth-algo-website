import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {db} from '../affiliate-db';
import {founderMediaCapabilities,founderMediaLimits,mediaFileName,mediaUuid,type FounderMediaAsset,type FounderMediaSnapshot,type FounderMediaUpload} from './founder-media-model';

export const founderMediaSchema=`
create table if not exists os_founder_media_assets (
 id uuid primary key, file_name text not null, kind text not null check(kind in ('image','video')),
 mime_type text not null, byte_size integer not null check(byte_size between 32 and 33554432),
 sha256 text not null unique, width integer not null, height integer not null, duration_seconds numeric,
 full_decode boolean not null, media_bytes bytea not null, verified_at timestamptz not null default now(),
 check(octet_length(media_bytes)=byte_size)
);
create table if not exists os_founder_media_uploads (
 id uuid primary key, request_key text not null unique, file_name text not null, mime_type text not null,
 byte_size integer not null check(byte_size between 32 and 33554432),
 expected_sha256 text check(expected_sha256 ~ '^[a-f0-9]{64}$'),
 asset_id uuid references os_founder_media_assets(id), created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours'
);
alter table os_founder_media_uploads add column if not exists expected_sha256 text;
create table if not exists os_founder_media_chunks (
 upload_id uuid not null references os_founder_media_uploads(id) on delete cascade,
 chunk_index integer not null check(chunk_index between 0 and 31), sha256 text not null,
 chunk_bytes bytea not null, primary key(upload_id,chunk_index),
 check(octet_length(chunk_bytes) between 1 and 1048576)
);
`;
let schemaReady:Promise<void>|undefined;
export function ensureFounderMediaSchema(){
 schemaReady??=db().begin(async tx=>{await tx`select pg_advisory_xact_lock(73111204)`;await tx.unsafe(founderMediaSchema);}).then(()=>{}).catch(e=>{schemaReady=undefined;throw e;});
 return schemaReady;
}
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const timestamp=(v:unknown)=>new Date(String(v)).toISOString();
function assetView(row:Record<string,unknown>):FounderMediaAsset {
 const id=String(row.id);return {id,fileName:String(row.file_name),type:row.kind as 'image'|'video',mimeType:row.mime_type as FounderMediaAsset['mimeType'],bytes:Number(row.byte_size),width:Number(row.width),height:Number(row.height),durationSeconds:row.duration_seconds===null?null:Number(row.duration_seconds),sha256:String(row.sha256),verifiedAt:timestamp(row.verified_at),url:`/api/owner/founder-media/${id}`,downloadUrl:`/api/owner/founder-media/${id}?download=1`,validation:{container:true,fullDecode:row.full_decode===true,creativeReview:false}};
}
export async function getFounderMediaAsset(id:string):Promise<FounderMediaAsset|null>{
 if(!mediaUuid(id))return null;await ensureFounderMediaSchema();
 const [row]=await db()`select id,file_name,kind,mime_type,byte_size,sha256,width,height,duration_seconds,full_decode,verified_at from os_founder_media_assets where id=${id}`;
 return row?assetView(row):null;
}
export async function getFounderMediaBytes(id:string){
 if(!mediaUuid(id))return null;await ensureFounderMediaSchema();
 const [row]=await db()`select * from os_founder_media_assets where id=${id}`;
 return row?{asset:assetView(row),bytes:Buffer.from(row.media_bytes)}:null;
}
export async function founderMediaSnapshot():Promise<FounderMediaSnapshot>{
 await ensureFounderMediaSchema();
 const rows=await db()`select id,file_name,kind,mime_type,byte_size,sha256,width,height,duration_seconds,full_decode,verified_at from os_founder_media_assets order by verified_at desc limit 100`;
 return {checkedAt:new Date().toISOString(),assets:rows.map(assetView),capabilities:founderMediaCapabilities()};
}
export async function getFounderMediaUpload(id:string):Promise<FounderMediaUpload|null>{
 if(!mediaUuid(id))return null;await ensureFounderMediaSchema();
 const [row]=await db()`select * from os_founder_media_uploads where id=${id}`;if(!row)return null;
 const chunks=await db()`select chunk_index from os_founder_media_chunks where upload_id=${id} order by chunk_index`;
 return {id,fileName:row.file_name,size:row.byte_size,sha256:row.expected_sha256||null,chunkBytes:founderMediaLimits.chunkBytes,chunkCount:Math.ceil(row.byte_size/founderMediaLimits.chunkBytes),received:chunks.map(x=>x.chunk_index),expiresAt:timestamp(row.expires_at),asset:row.asset_id?await getFounderMediaAsset(row.asset_id):null};
}
export async function beginFounderMediaUpload(input:Record<string,unknown>):Promise<FounderMediaUpload>{
 const fileName=mediaFileName(input.fileName),size=input.size,key=input.requestKey,mime=input.mimeType,expectedHash=input.sha256;
 if(!Number.isSafeInteger(size)||Number(size)<32||Number(size)>founderMediaLimits.maxFileBytes)throw Error('FILE_SIZE_LIMIT');
 if(typeof key!=='string'||!/^[-a-zA-Z0-9_]{8,128}$/.test(key))throw Error('REQUEST_KEY_REQUIRED');
 if(typeof expectedHash!=='string'||!/^[a-f0-9]{64}$/.test(expectedHash))throw Error('FILE_HASH_REQUIRED');
 if(typeof mime!=='string'||!founderMediaCapabilities().accepted.includes(mime))throw Error('UNSUPPORTED_MEDIA_FORMAT');
 await ensureFounderMediaSchema();
 const id=await db().begin(async tx=>{
  await tx`select pg_advisory_xact_lock(73111205)`;
  const [previous]=await tx`select * from os_founder_media_uploads where request_key=${key}`;
  if(previous){if(previous.file_name!==fileName||previous.byte_size!==size||previous.mime_type!==mime||previous.expected_sha256!==expectedHash)throw Error('UPLOAD_KEY_CONFLICT');if(!previous.asset_id&&new Date(previous.expires_at).getTime()<Date.now())throw Error('UPLOAD_EXPIRED');return previous.id as string;}
  await tx`delete from os_founder_media_uploads where expires_at<now() and asset_id is null`;
  const [active]=await tx`select count(*)::int as count,coalesce(sum(byte_size),0)::bigint as bytes from os_founder_media_uploads where asset_id is null`;
  const [stored]=await tx`select coalesce(sum(byte_size),0)::bigint as bytes from os_founder_media_assets`;
  if(active.count>=founderMediaLimits.maxOpenUploads)throw Error('TOO_MANY_OPEN_UPLOADS');
  if(Number(active.bytes)+Number(stored.bytes)+Number(size)>founderMediaLimits.maxStoredBytes)throw Error('MEDIA_STORAGE_LIMIT');
  const uploadId=randomUUID();await tx`insert into os_founder_media_uploads(id,request_key,file_name,mime_type,byte_size,expected_sha256) values(${uploadId},${key},${fileName},${mime},${Number(size)},${expectedHash})`;return uploadId;
 });
 return (await getFounderMediaUpload(id))!;
}
export async function saveFounderMediaChunk(id:string,index:number,bytes:Buffer){
 if(!mediaUuid(id)||!Number.isSafeInteger(index)||index<0||index>31)throw Error('INVALID_CHUNK');
 if(bytes.length<1||bytes.length>founderMediaLimits.chunkBytes)throw Error('INVALID_CHUNK');
 await ensureFounderMediaSchema();
 return db().begin(async tx=>{
  const [upload]=await tx`select * from os_founder_media_uploads where id=${id} for update`;
  if(!upload)throw Error('UPLOAD_NOT_FOUND');if(upload.asset_id)return {saved:true,complete:true};
  if(new Date(upload.expires_at).getTime()<Date.now())throw Error('UPLOAD_EXPIRED');
  const expected=Math.min(founderMediaLimits.chunkBytes,upload.byte_size-index*founderMediaLimits.chunkBytes);
  if(expected<=0||bytes.length!==expected)throw Error('INVALID_CHUNK');
  const digest=hash(bytes),[previous]=await tx`select sha256 from os_founder_media_chunks where upload_id=${id} and chunk_index=${index}`;
  if(previous&&previous.sha256!==digest)throw Error('CHUNK_CONFLICT');
  if(!previous)await tx`insert into os_founder_media_chunks(upload_id,chunk_index,sha256,chunk_bytes) values(${id},${index},${digest},${bytes})`;
  return {saved:true,duplicate:Boolean(previous),index};
 });
}

type Box={type:string;start:number;data:number;end:number};
function boxes(bytes:Buffer,start=0,end=bytes.length):Box[]{
 const result:Box[]=[];let pos=start;
 while(pos<end){if(end-pos<8)throw Error('INVALID_MP4');let size=bytes.readUInt32BE(pos),header=8;
  if(size===1){if(end-pos<16)throw Error('INVALID_MP4');const wide=bytes.readBigUInt64BE(pos+8);if(wide>BigInt(Number.MAX_SAFE_INTEGER))throw Error('INVALID_MP4');size=Number(wide);header=16;}
  else if(size===0)size=end-pos;
  if(size<header||pos+size>end)throw Error('INVALID_MP4');
  result.push({type:bytes.toString('ascii',pos+4,pos+8),start:pos,data:pos+header,end:pos+size});pos+=size;if(result.length>10000)throw Error('INVALID_MP4');
 }return result;
}
function child(bytes:Buffer,parent:Box,type:string){const box=boxes(bytes,parent.data,parent.end).find(b=>b.type===type);if(!box)throw Error('INVALID_MP4');return box;}
/** Container metadata verification only. Full video decode and creative review remain separate. */
export function inspectFounderMp4(bytes:Buffer){
 const top=boxes(bytes),ftyp=top.find(b=>b.type==='ftyp'),moov=top.find(b=>b.type==='moov'),mdats=top.filter(b=>b.type==='mdat');
 if(!ftyp||ftyp.end-ftyp.data<8||!moov||!mdats.some(b=>b.end-b.data>8))throw Error('INVALID_MP4');
 const brands=bytes.toString('ascii',ftyp.data,ftyp.end);if(!/(isom|iso[2-9]|mp4[12]|avc1|M4V )/.test(brands))throw Error('UNSUPPORTED_MEDIA_FORMAT');
 let width=0,height=0,duration=0,videoCount=0;
 for(const trak of boxes(bytes,moov.data,moov.end).filter(b=>b.type==='trak')){
  const mdia=child(bytes,trak,'mdia'),hdlr=child(bytes,mdia,'hdlr');if(hdlr.end-hdlr.data<12)throw Error('INVALID_MP4');
  const handler=bytes.toString('ascii',hdlr.data+8,hdlr.data+12);if(!['vide','soun'].includes(handler))continue;
  const stbl=child(bytes,child(bytes,mdia,'minf'),'stbl'),stsd=child(bytes,stbl,'stsd');
  if(stsd.end-stsd.data<8||bytes.readUInt32BE(stsd.data+4)!==1)throw Error('INVALID_MP4');
  const entries=boxes(bytes,stsd.data+8,stsd.end);if(entries.length!==1)throw Error('INVALID_MP4');
  if(handler==='vide'){
   videoCount++;if(!['avc1','avc3'].includes(entries[0].type)||entries[0].end-entries[0].data<78)throw Error('H264_MP4_REQUIRED');
   const video=entries[0];width=bytes.readUInt16BE(video.data+24);height=bytes.readUInt16BE(video.data+26);
   if(!boxes(bytes,video.data+78,video.end).some(b=>b.type==='avcC'&&b.end-b.data>=7))throw Error('INVALID_MP4');
   const mdhd=child(bytes,mdia,'mdhd'),version=bytes[mdhd.data];if(![0,1].includes(version)||mdhd.end-mdhd.data<(version===1?32:20))throw Error('INVALID_MP4');
   const scale=bytes.readUInt32BE(mdhd.data+(version===1?20:12));
   const ticks=version===1?Number(bytes.readBigUInt64BE(mdhd.data+24)):bytes.readUInt32BE(mdhd.data+16);
   duration=ticks/scale;
  }else if(entries[0].type!=='mp4a')throw Error('AAC_AUDIO_REQUIRED');
  const stsz=child(bytes,stbl,'stsz');if(stsz.end-stsz.data<12)throw Error('INVALID_MP4');
  const sampleSize=bytes.readUInt32BE(stsz.data+4),count=bytes.readUInt32BE(stsz.data+8);
  if(count<1||count>1000000||(!sampleSize&&stsz.end-stsz.data!==12+count*4))throw Error('INVALID_MP4');
  const all=boxes(bytes,stbl.data,stbl.end),offsets=all.find(b=>b.type==='stco'||b.type==='co64');
  if(!offsets||offsets.end-offsets.data<8)throw Error('INVALID_MP4');const n=bytes.readUInt32BE(offsets.data+4),stride=offsets.type==='co64'?8:4;
  if(!n||offsets.end-offsets.data!==8+n*stride)throw Error('INVALID_MP4');
  for(let i=0;i<n;i++){const offset=stride===8?Number(bytes.readBigUInt64BE(offsets.data+8+i*8)):bytes.readUInt32BE(offsets.data+8+i*4);if(!mdats.some(b=>offset>=b.data&&offset<b.end))throw Error('INVALID_MP4');}
 }
 if(videoCount!==1||width<16||height<16||width>4096||height>4096||!Number.isFinite(duration)||duration<=0||duration>300)throw Error('INVALID_VIDEO_DIMENSIONS_OR_DURATION');
 return {type:'video' as const,mimeType:'video/mp4' as const,width,height,durationSeconds:Math.round(duration*1000)/1000,fullDecode:false};
}
export async function inspectFounderMedia(bytes:Buffer,declaredMime:string){
 if(bytes.length<32||bytes.length>founderMediaLimits.maxFileBytes)throw Error('FILE_SIZE_LIMIT');
 if(declaredMime==='video/mp4')return inspectFounderMp4(bytes);
 try{
  const input=sharp(bytes,{failOn:'warning',limitInputPixels:40000000}),meta=await input.metadata();
  const mime=({png:'image/png',jpeg:'image/jpeg',webp:'image/webp'} as Record<string,string>)[meta.format||''];
  if(!mime||mime!==declaredMime||(meta.pages||1)!==1||!meta.width||!meta.height||meta.width>6000||meta.height>6000)throw Error('UNSUPPORTED_MEDIA_FORMAT');
  await input.stats();return {type:'image' as const,mimeType:mime as FounderMediaAsset['mimeType'],width:meta.width,height:meta.height,durationSeconds:null,fullDecode:true};
 }catch{throw Error('INVALID_IMAGE');}
}
export async function completeFounderMediaUpload(id:string){
 if(!mediaUuid(id))throw Error('UPLOAD_NOT_FOUND');await ensureFounderMediaSchema();
 // Hold the row across verification so concurrent completion/chunk writes cannot diverge.
 return db().begin(async tx=>{
  const [upload]=await tx`select * from os_founder_media_uploads where id=${id} for update`;
  if(!upload)throw Error('UPLOAD_NOT_FOUND');
  if(upload.asset_id){const [existing]=await tx`select * from os_founder_media_assets where id=${upload.asset_id}`;return {asset:assetView(existing),duplicate:true};}
  if(new Date(upload.expires_at).getTime()<Date.now())throw Error('UPLOAD_EXPIRED');
  const chunks=await tx`select chunk_index,chunk_bytes,sha256 from os_founder_media_chunks where upload_id=${id} order by chunk_index`;
  if(chunks.length!==Math.ceil(upload.byte_size/founderMediaLimits.chunkBytes)||chunks.some((c,i)=>c.chunk_index!==i||hash(Buffer.from(c.chunk_bytes))!==c.sha256))throw Error('UPLOAD_INCOMPLETE');
  const bytes=Buffer.concat(chunks.map(c=>Buffer.from(c.chunk_bytes)));if(bytes.length!==upload.byte_size)throw Error('UPLOAD_INCOMPLETE');
  const digest=hash(bytes);
  if(!upload.expected_sha256||digest!==upload.expected_sha256)throw Error('UPLOAD_FILE_MISMATCH');
  const verified=await inspectFounderMedia(bytes,upload.mime_type);
  const [asset]=await tx`insert into os_founder_media_assets(id,file_name,kind,mime_type,byte_size,sha256,width,height,duration_seconds,full_decode,media_bytes)
   values(${randomUUID()},${upload.file_name},${verified.type},${verified.mimeType},${bytes.length},${digest},${verified.width},${verified.height},${verified.durationSeconds},${verified.fullDecode},${bytes})
   on conflict(sha256) do update set sha256=excluded.sha256 returning *`;
  await tx`update os_founder_media_uploads set asset_id=${asset.id} where id=${id}`;
  await tx`delete from os_founder_media_chunks where upload_id=${id}`;
  return {asset:assetView(asset),duplicate:false};
 });
}
export async function cancelFounderMediaUpload(id:string){
 if(!mediaUuid(id))throw Error('UPLOAD_NOT_FOUND');await ensureFounderMediaSchema();
 return db().begin(async tx=>{const [upload]=await tx`select asset_id from os_founder_media_uploads where id=${id} for update`;if(upload?.asset_id)throw Error('UPLOAD_ALREADY_COMPLETE');await tx`delete from os_founder_media_uploads where id=${id} and asset_id is null`;return {canceled:true};});
}
