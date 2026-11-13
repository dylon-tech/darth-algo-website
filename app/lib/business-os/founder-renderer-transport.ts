import {db} from '../affiliate-db';
import {assertNativeJobScope} from './founder-native-policy';
import {mediaUuid} from './founder-media-model';
import {beginFounderMediaUpload,completeFounderMediaUpload,getFounderMediaUpload,saveFounderMediaChunk} from './founder-media';
import {ensureFounderRendererSchema} from './founder-renderer';
import type {FounderRendererIdentity} from './founder-renderer-auth';

export async function readRendererBody(request:Request,limit:number){
 if(Number(request.headers.get('content-length'))>limit)throw Error('REQUEST_TOO_LARGE');
 const reader=request.body?.getReader();if(!reader)throw Error('REQUEST_REQUIRED');
 const parts:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('REQUEST_TOO_LARGE');}parts.push(value);}
 return Buffer.concat(parts);
}
export function rendererLease(input:Record<string,unknown>){
 if(!mediaUuid(input.jobId)||!mediaUuid(input.leaseToken))throw Error('LEASE_REQUIRED');
 return {jobId:input.jobId,leaseToken:input.leaseToken};
}
export async function ownedRendererLease(identity:FounderRendererIdentity,input:Record<string,unknown>){
 assertNativeJobScope(identity,input);
 const lease=rendererLease(input),{assertFounderRenderLease}=await import('./founder-content');
 const result=await assertFounderRenderLease(lease);
 // Backend binds the private lease to the worker that claimed it.
 if(result.job.workerId!==identity.workerId)throw Error('LEASE_LOST');
 return {...lease,...result};
}
export async function ownedRendererAttempt(identity:FounderRendererIdentity,input:Record<string,unknown>){
 assertNativeJobScope(identity,input);
 const lease=rendererLease(input);
 const [job]=await db()`select worker_id from os_founder_render_jobs where id=${lease.jobId} and lease_token=${lease.leaseToken}`;
 if(!job||job.worker_id!==identity.workerId)throw Error('LEASE_LOST');
 return lease;
}
export async function beginRendererUpload(identity:FounderRendererIdentity,input:Record<string,unknown>){
 const lease=await ownedRendererLease(identity,input);
 if(input.role!=='media'&&input.role!=='cover')throw Error('INVALID_ROLE');
 if(input.role==='cover'&&!['image/jpeg','image/png'].includes(String(input.mimeType)))throw Error('INVALID_ROLE');
 if(input.role==='media'&&(lease.item.type==='video'?input.mimeType!=='video/mp4':!['image/jpeg','image/png'].includes(String(input.mimeType))))throw Error('INVALID_ROLE');
 await ensureFounderRendererSchema();
 const previous=await db()`select upload_id from os_founder_renderer_uploads where job_id=${lease.jobId} and lease_token=${lease.leaseToken} and role=${input.role}`;
 if(previous.length){
  const upload=await getFounderMediaUpload(previous[0].upload_id);
  if(!upload||upload.sha256!==input.sha256||upload.size!==input.size)throw Error('UPLOAD_KEY_CONFLICT');
  return {upload};
 }
 const upload=await beginFounderMediaUpload({...input,requestKey:`render-${lease.jobId}-${lease.leaseToken}-${input.role}`});
 await db()`insert into os_founder_renderer_uploads(upload_id,job_id,lease_token,worker_id,role) values(${upload.id},${lease.jobId},${lease.leaseToken},${identity.workerId},${input.role}) on conflict(job_id,lease_token,role) do nothing`;
 return {upload};
}
async function boundUpload(identity:FounderRendererIdentity,input:Record<string,unknown>){
 const lease=await ownedRendererLease(identity,input);if(!mediaUuid(input.uploadId))throw Error('UPLOAD_NOT_FOUND');
 await ensureFounderRendererSchema();
 const [row]=await db()`select * from os_founder_renderer_uploads where upload_id=${input.uploadId} and job_id=${lease.jobId} and lease_token=${lease.leaseToken} and worker_id=${identity.workerId}`;
 if(!row)throw Error('UPLOAD_NOT_FOUND');return {row,lease};
}
export async function saveRendererChunk(identity:FounderRendererIdentity,input:Record<string,unknown>,bytes:Buffer){
 await boundUpload(identity,input);
 return saveFounderMediaChunk(String(input.uploadId),Number(input.index),bytes);
}
export async function completeRendererUpload(identity:FounderRendererIdentity,input:Record<string,unknown>){
 const {row}=await boundUpload(identity,input);
 const report=input.report as Record<string,unknown>|undefined;
 if(!report||report.fullDecode!==true||report.creativeReview!==false||typeof report.sha256!=='string')throw Error('RENDERER_QA_REQUIRED');
 const result=await completeFounderMediaUpload(String(input.uploadId));
 if(result.asset.sha256!==report.sha256)throw Error('UPLOAD_FILE_MISMATCH');
 if(result.asset.type==='video'&&(report.frameRate!==60||report.hasNarration!==true||report.coverSeconds!==0.25||report.width!==1080||report.height!==1920||typeof report.integratedLufs!=='number'||report.integratedLufs> -12||report.integratedLufs< -20||typeof report.truePeakDb!=='number'||report.truePeakDb> -3))throw Error('RENDERER_QA_REQUIRED');
 // The pinned trusted worker fully decoded the exact uploaded file. Human
 // creative approval is deliberately not implied by machine validation.
 await db().begin(async sql=>{
  await sql`update os_founder_media_assets set full_decode=true where id=${result.asset.id}`;
  await sql`update os_founder_renderer_uploads set asset_id=${result.asset.id},report=${JSON.stringify(report)}::jsonb where upload_id=${row.upload_id}`;
 });
 return result;
}
export async function completeRendererJob(identity:FounderRendererIdentity,input:Record<string,unknown>){
 const lease=await ownedRendererAttempt(identity,input);
 // Completion may be replayed after the active lease has ended. Match its
 // original worker/token here, then let the backend distinguish the exact
 // completed result from an expired attempt that never completed.
 const rows=await db()`select role,asset_id from os_founder_renderer_uploads where job_id=${lease.jobId} and lease_token=${lease.leaseToken} and worker_id=${identity.workerId} and asset_id is not null`;
 const mediaAssetId=rows.find(row=>row.role==='media')?.asset_id,coverAssetId=rows.find(row=>row.role==='cover')?.asset_id;
 if(!mediaAssetId||!coverAssetId)throw Error('RENDERER_QA_REQUIRED');
 const {completeFounderRenderJob}=await import('./founder-content');
 return completeFounderRenderJob({jobId:lease.jobId,leaseToken:lease.leaseToken,mediaAssetId,coverAssetId,caption:typeof input.caption==='string'?input.caption:undefined,script:typeof input.script==='string'?input.script:undefined,proofHash:typeof input.proofHash==='string'?input.proofHash:undefined});
}
