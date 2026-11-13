import {db} from '../affiliate-db';
import type {FounderRendererIdentity} from './founder-renderer-auth';
import {after} from 'next/server';
import {nativeRequestDeadline,nativeHasDispatchWindow,assertNativeDispatchWindow} from './founder-native-lifetime';
export {withNativeRequestLifetime} from './founder-native-lifetime';
import {nativeApproval,nativeBudget,ensureNativeSchema,nativeRequestId,reserveNativeAttempt,reservationClaims,signNativeToken,nativeBodyHash,nativeAudience,nativeCallbackAudience,finishNativeInvocation,type NativeReservation} from './founder-native-policy';
import {founderRenderBrief} from './founder-render-catalog';
import nativeRuntime from './founder-native-runtime.json';
export const nativeRuntimeFingerprint=nativeRuntime.fingerprint;

export const founderRendererVersion='DA-RENDERER-20261112-1';
// The local renderer is tested. No eligible unattended production host has
// been verified. GitHub Actions is CI only, not application-runtime capacity.
export const founderRendererProductionHostVerified=()=>nativeApproval().enabled;
export const founderRendererSchema=`
create table if not exists os_founder_renderer_workers (
 worker_id text primary key, run_id text not null, commit_sha text not null, renderer_version text not null,
 image_ready boolean not null, video_ready boolean not null, last_seen_at timestamptz not null default now(),
 status text not null check(status in ('ready','working','stopped')), report jsonb not null
);
create table if not exists os_founder_renderer_uploads (
 upload_id uuid primary key references os_founder_media_uploads(id) on delete cascade,
 job_id uuid not null, lease_token uuid not null, worker_id text not null,
 role text not null check(role in ('media','cover')), asset_id uuid references os_founder_media_assets(id),
 report jsonb, created_at timestamptz not null default now(), unique(job_id,lease_token,role)
);
`;
let schemaReady:Promise<void>|undefined;
export async function ensureFounderRendererSchema(){
 const {ensureFounderMediaSchema}=await import('./founder-media');await ensureFounderMediaSchema();
 schemaReady??=db().begin(async sql=>{await sql`select pg_advisory_xact_lock(73111208)`;await sql.unsafe(founderRendererSchema);}).then(()=>{}).catch(error=>{schemaReady=undefined;throw error;});
 return schemaReady;
}
export type FounderRendererStatus={image:{available:boolean;reason:string};video:{available:boolean;reason:string};incrementalCostUsd:number|null;budgetApproved:boolean;setupAvailable:boolean;budgetMessage:string;ready:boolean;reason:string;lastSeenAt:string|null};
export async function founderRendererStatus():Promise<FounderRendererStatus>{
 if(!founderRendererProductionHostVerified()){const reason='Automatic creation needs a connected render server. No added spending approved.';return {image:{available:false,reason},video:{available:false,reason},incrementalCostUsd:null,budgetApproved:false,setupAvailable:false,budgetMessage:'No added spending approved.',ready:false,reason,lastSeenAt:null};}
 await ensureFounderRendererSchema();
 const budget=await nativeBudget(),budgetAvailable=budget.remainingCents>=5;
 const [row]=await db()`select * from os_founder_renderer_workers where renderer_version=${founderRendererVersion} and report->>'runtimeProfile'=${nativeRuntimeFingerprint} and image_ready and video_ready order by last_seen_at desc limit 1`;
 const lastSeenAt=row?new Date(row.last_seen_at).toISOString():null;
 const ready=Boolean(row)&&budgetAvailable;
 const reason=!budgetAvailable?'The $5 monthly rendering allowance is reserved. New attempts are paused.':row?'The connected renderer is verified. Finished files still need creative review.':'Check the render connection once before starting automatic creation.';
 return {image:{available:ready,reason},video:{available:ready,reason},incrementalCostUsd:0.05,budgetApproved:true,setupAvailable:!row&&budgetAvailable,budgetMessage:`$${(budget.reservedCents/100).toFixed(2)} reserved of the approved $5 monthly rendering allowance.`,ready,reason,lastSeenAt};
}
export async function wakeFounderRenderer():Promise<{accepted:boolean;reason?:string}>{
 const status=await founderRendererStatus();if(!status.ready)return {accepted:false,reason:status.reason};
 const deadlineMs=nativeRequestDeadline();if(!nativeHasDispatchWindow(deadlineMs))return {accepted:false,reason:'Queued for the next server check; this request has too little render time left.'};
 // A Promise starts now and is registered with waitUntil immediately. A
 // callback would start only after the legacy cron response, too late.
 after(dispatchNativeFounderJob(deadlineMs).catch(()=>({status:'held'})));
 return {accepted:true,reason:'Queued. The server will claim and reserve one exact attempt.'};
}
export async function recordFounderRendererHeartbeat(identity:FounderRendererIdentity,input:Record<string,unknown>){
 if(!founderRendererProductionHostVerified())throw Error('RENDERER_HOST_NOT_VERIFIED');
 if(!['started','completed','failed','unknown'].includes(identity.reservationStatus)||input.runtimeProfile!==nativeRuntimeFingerprint||input.rendererVersion!==founderRendererVersion||input.incrementalCostUsd!==0.05||input.imageReady!==true||input.videoReady!==true||input.fullDecode!==true||input.narration!=='kokoro-v1.0-am_michael'||!['ready','working','stopped'].includes(String(input.status)))throw Error('RENDERER_PREFLIGHT_REQUIRED');
 await ensureFounderRendererSchema();
 const report={fullDecode:true,narration:'kokoro-v1.0-am_michael',attemptReservationUsd:0.05,runtime:'vercel-python-300s-2gb-iad1',runtimeProfile:nativeRuntimeFingerprint,sourceValidation:true};
 await db()`insert into os_founder_renderer_workers(worker_id,run_id,commit_sha,renderer_version,image_ready,video_ready,status,report) values(${identity.workerId},${identity.runId},${identity.sha},${founderRendererVersion},true,true,${String(input.status)},${JSON.stringify(report)}::jsonb) on conflict(worker_id) do update set last_seen_at=now(),status=excluded.status,report=excluded.report`;
 return {accepted:true,checkedAt:new Date().toISOString()};
}

async function invokeNativeReservation(row:NativeReservation,claim:unknown,deadlineMs:number){
 assertNativeDispatchWindow(deadlineMs);
 const claims=reservationClaims(row),callbackToken=signNativeToken({...claims,scope:'callback',aud:nativeCallbackAudience});
 const body=JSON.stringify({claim,callbackToken,mode:row.mode});
 const token=signNativeToken({...claims,scope:'invoke',aud:nativeAudience,bodySha256:nativeBodyHash(body)});
 const response=await fetch(nativeAudience,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(275000)});
 const reader=response.body?.getReader();let count=0;const parts:Uint8Array[]=[];
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>4096){await reader.cancel();throw Error('RENDER_INVOKE_UNCONFIRMED');}parts.push(value);}
 if(!response.ok)throw Error('RENDER_INVOKE_UNCONFIRMED');
 const result=JSON.parse(Buffer.concat(parts).toString());
 if(!['attempt_finished','preflight_complete'].includes(result.status))throw Error('RENDER_INVOKE_UNCONFIRMED');
 return result;
}
export async function dispatchNativeFounderJob(deadlineMs=nativeRequestDeadline()){
 if(!nativeHasDispatchWindow(deadlineMs))return {status:'deferred'};
 const status=await founderRendererStatus();if(!status.ready)return {status:'unavailable'};
 const {claimFounderRenderJob,failFounderRenderJob}=await import('./founder-content');
 if(!nativeHasDispatchWindow(deadlineMs))return {status:'deferred'};
 const id=nativeRequestId(),claim=await claimFounderRenderJob({workerId:`native:${id}`});if(!claim)return {status:'idle'};
 let reservation:NativeReservation|undefined;
 try{
  const brief=founderRenderBrief(claim.item);if(!brief.supported){await failFounderRenderJob({jobId:claim.job.id,leaseToken:claim.job.leaseToken,error:brief.reason,retryable:false});return {status:'source_review_required'};}
  reservation=await reserveNativeAttempt({invocationId:id,requestKey:`render-${claim.job.id}-${claim.job.leaseToken}`,jobId:claim.job.id,leaseToken:claim.job.leaseToken,contentVersion:claim.job.contentVersion,sha:process.env.VERCEL_GIT_COMMIT_SHA!,mode:'job',requestDeadlineMs:deadlineMs});
  if(reservation.duplicate)return {status:'already_reserved'};
  await invokeNativeReservation(reservation,claim,deadlineMs);
  const [saved]=await db()`select status from os_founder_render_jobs where id=${claim.job.id} and lease_token=${claim.job.leaseToken}`;
  if(saved?.status==='completed')return {status:'completed'};
  if(['failed','blocked','obsolete','canceled'].includes(String(saved?.status))){await finishNativeInvocation({...reservationClaims(reservation),scope:'callback',aud:nativeCallbackAudience,v:1,iat:0,exp:0},saved?.status==='blocked'?'unknown':'failed');return {status:'held'};}
  throw Error('RENDER_INVOKE_UNCONFIRMED');
 }catch(error){
  if(!reservation&&error instanceof Error&&error.message==='RENDER_REQUEST_DEADLINE'){
   await db().begin(async sql=>{await sql`select pg_advisory_xact_lock(731013)`;await sql`update os_founder_render_jobs set status='queued',stage='Queued',progress=0,attempts=greatest(0,attempts-1),lease_token=null,lease_expires_at=null,worker_id=null,started_at=null,updated_at=now() where id=${claim.job.id} and lease_token=${claim.job.leaseToken} and worker_id=${claim.job.workerId} and status='running' and not exists(select 1 from os_founder_render_cost_reservations where job_id=${claim.job.id} and lease_token=${claim.job.leaseToken})`;});
   return {status:'deferred'};
  }
  const [saved]=await db()`select status from os_founder_render_jobs where id=${claim.job.id} and lease_token=${claim.job.leaseToken}`;
  if(saved?.status==='completed'){if(reservation)await finishNativeInvocation({...reservationClaims(reservation),scope:'callback',aud:nativeCallbackAudience,v:1,iat:0,exp:0},'completed');return {status:'completed'};}
  if(reservation){const c={...reservationClaims(reservation),scope:'callback' as const,aud:nativeCallbackAudience,v:1 as const,iat:0,exp:0};await finishNativeInvocation(c,'unknown');}
  if(['failed','blocked','obsolete','canceled'].includes(String(saved?.status)))return {status:'held'};
  if(reservation)await db()`update os_founder_renderer_workers set image_ready=false,video_ready=false where report->>'runtimeProfile'=${nativeRuntimeFingerprint}`;
  try{await failFounderRenderJob({jobId:claim.job.id,leaseToken:claim.job.leaseToken,error:reservation?'The render server receipt was not confirmed. Review this attempt before retrying.':'The rendering allowance could not reserve this attempt. No render server call was made.',retryable:false,ambiguous:Boolean(reservation)});}catch{}
  return {status:'held'};
 }
}
export async function wakePendingOwnerRenders(){
 if(!nativeApproval().enabled)return {accepted:false};
 const {ensureFounderContentSchema}=await import('./founder-content');await ensureFounderContentSchema();
 const [row]=await db()`select id from os_founder_render_jobs where source='owner' and status='queued' limit 1`;
 return row?wakeFounderRenderer():{accepted:false};
}
export async function requestNativeRendererSetup(requestKey:string){
 if(!/^[-a-zA-Z0-9_]{8,128}$/.test(requestKey))throw Error('REQUEST_KEY_REQUIRED');
 if(!nativeApproval().enabled)throw Error('RENDER_SPENDING_NOT_APPROVED');
 const deadlineMs=nativeRequestDeadline();if(!nativeHasDispatchWindow(deadlineMs))return {accepted:false,message:'The connection check needs a fresh server request. Try again.'};
 await ensureNativeSchema();const key=`setup-${requestKey}`;
 const [prior]=await db()`select mode from os_founder_render_cost_reservations where request_key=${key}`;
 if(prior){if(prior.mode!=='preflight')throw Error('RENDER_RESERVATION_CONFLICT');return {accepted:true,duplicate:true,message:'The same render connection check is already saved.'};}
 const id=nativeRequestId(),jobId=nativeRequestId(),leaseToken=nativeRequestId();
 const row=await reserveNativeAttempt({invocationId:id,requestKey:key,jobId,leaseToken,contentVersion:0,sha:process.env.VERCEL_GIT_COMMIT_SHA!,mode:'preflight',requestDeadlineMs:deadlineMs});
 const claim={job:{id:jobId,leaseToken,workerId:row.worker_id},item:null};
 after(invokeNativeReservation(row,claim,deadlineMs).catch(async()=>{await finishNativeInvocation({...reservationClaims(row),scope:'callback',aud:nativeCallbackAudience,v:1,iat:0,exp:0},'unknown');}));
 return {accepted:true,message:'Render connection check queued. $0.05 is reserved from the approved monthly allowance.'};
}
