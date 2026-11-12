import {db} from '../affiliate-db';
import type {FounderRendererIdentity} from './founder-renderer-auth';

export const founderRendererVersion='DA-RENDERER-20261112-1';
// The local renderer is tested. No eligible unattended production host has
// been verified. GitHub Actions is CI only, not application-runtime capacity.
export const founderRendererProductionHostVerified=false;
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
export type FounderRendererStatus={image:{available:boolean;reason:string};video:{available:boolean;reason:string};incrementalCostUsd:0|null;ready:boolean;reason:string;lastSeenAt:string|null};
export async function founderRendererStatus():Promise<FounderRendererStatus>{
 if(!founderRendererProductionHostVerified){const reason='Automatic creation needs a connected render server. No added spending approved.';return {image:{available:false,reason},video:{available:false,reason},incrementalCostUsd:null,ready:false,reason,lastSeenAt:null};}
 await ensureFounderRendererSchema();
 const sha=process.env.VERCEL_GIT_COMMIT_SHA||'';
 const [row]=await db()`select * from os_founder_renderer_workers where commit_sha=${sha} and renderer_version=${founderRendererVersion} and image_ready and video_ready and last_seen_at>now()-interval '24 hours' order by last_seen_at desc limit 1`;
 const lastSeenAt=row?new Date(row.last_seen_at).toISOString():null;
 const ready=Boolean(row),online=Boolean(row&&row.status!=='stopped'&&Date.now()-new Date(row.last_seen_at).getTime()<90000);
 const reason=ready?(online?'The free media worker is available. Finished media still needs creative review.':'The free media worker is verified. Queued work waits for its next check; start time is not guaranteed.'):'The free media worker has not passed its setup check for this version yet.';
 return {image:{available:ready,reason},video:{available:ready,reason},incrementalCostUsd:ready?0:null,ready,reason,lastSeenAt};
}
export async function wakeFounderRenderer():Promise<{accepted:boolean;reason?:string}>{
 if(!founderRendererProductionHostVerified)return {accepted:false,reason:'Automatic creation needs a connected render server. No added spending approved.'};
 await ensureFounderRendererSchema();
 const [row]=await db()`select worker_id from os_founder_renderer_workers where commit_sha=${process.env.VERCEL_GIT_COMMIT_SHA||''} and renderer_version=${founderRendererVersion} and image_ready and video_ready and status in ('ready','working') and last_seen_at>now()-interval '90 seconds' limit 1`;
 // A verified active poller can pick up the durable queue. We do not pretend
 // that an unconfigured GitHub dispatch credential has launched a new run.
 return row?{accepted:true}:{accepted:false,reason:'Queued for the next verified worker check. No immediate dispatch connection is configured.'};
}
export async function recordFounderRendererHeartbeat(identity:FounderRendererIdentity,input:Record<string,unknown>){
 if(!founderRendererProductionHostVerified)throw Error('RENDERER_HOST_NOT_VERIFIED');
 if(input.rendererVersion!==founderRendererVersion||input.incrementalCostUsd!==0||input.imageReady!==true||input.videoReady!==true||input.fullDecode!==true||input.narration!=='kokoro-v1.0-am_michael'||!['ready','working','stopped'].includes(String(input.status)))throw Error('RENDERER_PREFLIGHT_REQUIRED');
 await ensureFounderRendererSchema();
 const report={fullDecode:true,narration:'kokoro-v1.0-am_michael',incrementalCostUsd:0,standardRunner:'ubuntu-24.04',sourceValidation:true};
 await db()`insert into os_founder_renderer_workers(worker_id,run_id,commit_sha,renderer_version,image_ready,video_ready,status,report) values(${identity.workerId},${identity.runId},${identity.sha},${founderRendererVersion},true,true,${String(input.status)},${JSON.stringify(report)}::jsonb) on conflict(worker_id) do update set last_seen_at=now(),status=excluded.status,report=excluded.report`;
 return {accepted:true,checkedAt:new Date().toISOString()};
}
