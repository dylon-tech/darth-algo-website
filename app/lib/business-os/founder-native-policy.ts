import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {assertNativeDispatchWindow} from './founder-native-lifetime';
import {founderUuid} from './founder-content-model';
export const nativeAudience='https://www.darthalgo.com/api/founder-native-render';
export const nativeCallbackAudience='https://www.darthalgo.com/api/owner/founder-renderer';
export type NativeClaims={v:1;aud:string;scope:'invoke'|'callback';mode:'job'|'preflight';iat:number;exp:number;invocationId:string;jobId:string;leaseToken:string;workerId:string;sha:string;bodySha256?:string};
export function nativeApproval(){
 const enabled=process.env.AI_OS_MEDIA_RENDERER_ENABLED==='true'&&process.env.AI_OS_MEDIA_RENDERER_MONTHLY_USD==='5'&&founderUuid(process.env.AI_OS_MEDIA_RENDERER_APPROVAL_ID)&&process.env.VERCEL_ENV==='production'&&/^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA||'')&&(process.env.AI_OS_OWNER_KEY?.length||0)>=32;
 return {enabled,approvalId:process.env.AI_OS_MEDIA_RENDERER_APPROVAL_ID||'',monthlyCents:500,attemptCents:5};
}
export const nativeSchema=`create table if not exists os_founder_render_cost_reservations(
 id uuid primary key,request_key text not null unique,job_id uuid not null,lease_token uuid not null,content_version integer not null,
 commit_sha text not null,worker_id text not null,mode text not null check(mode in ('job','preflight')),
 month text not null,amount_cents integer not null check(amount_cents=5),approval_id text not null,
 status text not null check(status in ('reserved','started','completed','failed','unknown')),
 created_at timestamptz not null,deadline_at timestamptz not null,started_at timestamptz,
 unique(job_id,lease_token)
);`;
let schema:Promise<void>|undefined;
export function ensureNativeSchema(){schema??=db().begin(async sql=>{await sql`select pg_advisory_xact_lock(73111210)`;await sql.unsafe(nativeSchema);}).then(()=>{}).catch(e=>{schema=undefined;throw e;});return schema;}
export async function nativeBudget(now=new Date()){
 await ensureNativeSchema();const [row]=await db()`select coalesce(sum(amount_cents),0)::int as cents from os_founder_render_cost_reservations where month=${now.toISOString().slice(0,7)}`;
 return {monthlyCents:500,reservedCents:Number(row.cents),remainingCents:Math.max(0,500-Number(row.cents))};
}
export type NativeReservation={id:string;request_key:string;job_id:string;lease_token:string;content_version:number;commit_sha:string;worker_id:string;mode:'job'|'preflight';status:string;deadline_at:string;duplicate:boolean};
export async function reserveNativeAttempt(input:{invocationId:string;requestKey:string;jobId:string;leaseToken:string;contentVersion:number;sha:string;mode:'job'|'preflight';requestDeadlineMs?:number},now=new Date()):Promise<NativeReservation>{
 const approval=nativeApproval();if(!approval.enabled)throw Error('RENDER_SPENDING_NOT_APPROVED');
 if(!founderUuid(input.invocationId)||!founderUuid(input.jobId)||!founderUuid(input.leaseToken)||!/^[-a-zA-Z0-9_]{8,128}$/.test(input.requestKey)||!Number.isSafeInteger(input.contentVersion)||input.contentVersion<0||input.sha!==process.env.VERCEL_GIT_COMMIT_SHA)throw Error('RENDER_RESERVATION_INVALID');
 await ensureNativeSchema();
 return db().begin(async sql=>{
  await sql`select pg_advisory_xact_lock(73111210)`;
  const [old]=await sql`select * from os_founder_render_cost_reservations where request_key=${input.requestKey} or(job_id=${input.jobId} and lease_token=${input.leaseToken})`;
  if(old){if(old.job_id!==input.jobId||old.lease_token!==input.leaseToken||old.content_version!==input.contentVersion||old.commit_sha!==input.sha||old.mode!==input.mode)throw Error('RENDER_RESERVATION_CONFLICT');return {...old,duplicate:true} as NativeReservation;}
  const month=now.toISOString().slice(0,7),[used]=await sql`select coalesce(sum(amount_cents),0)::int as cents from os_founder_render_cost_reservations where month=${month}`;
  if(Number(used.cents)+5>500)throw Error('RENDER_MONTHLY_BUDGET_EXHAUSTED');
  if(input.requestDeadlineMs!==undefined)assertNativeDispatchWindow(input.requestDeadlineMs);
  const worker=`native:${input.invocationId}`,deadline=new Date(now.getTime()+360000).toISOString();
  const [row]=await sql`insert into os_founder_render_cost_reservations(id,request_key,job_id,lease_token,content_version,commit_sha,worker_id,mode,month,amount_cents,approval_id,status,created_at,deadline_at) values(${input.invocationId},${input.requestKey},${input.jobId},${input.leaseToken},${input.contentVersion},${input.sha},${worker},${input.mode},${month},5,${approval.approvalId},'reserved',${now.toISOString()},${deadline}) returning *`;
  return {...row,duplicate:false} as NativeReservation;
 });
}
function serviceKey(){const key=process.env.AI_OS_OWNER_KEY;if(!key||key.length<32)throw Error('RENDERER_UNAUTHORIZED');return createHmac('sha256',key).update('darth-founder-media-service-v1').digest();}
export const nativeBodyHash=(body:Buffer|string)=>createHash('sha256').update(body).digest('hex');
export function signNativeToken(claims:Omit<NativeClaims,'v'|'iat'|'exp'>,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({v:1,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+350,...claims})).toString('base64url');
 return `DR1.${payload}.${createHmac('sha256',serviceKey()).update('DR1.'+payload).digest('base64url')}`;
}
export function verifyNativeToken(token:string,audience=nativeCallbackAudience,now=Date.now()):NativeClaims{
 const fail=()=>{throw Error('RENDERER_UNAUTHORIZED');};
 if(token.length>4096)fail();const p=token.split('.');if(p.length!==3||p[0]!=='DR1'||!p.slice(1).every(x=>/^[A-Za-z0-9_-]+$/.test(x)))fail();
 const got=Buffer.from(p[2],'base64url'),expected=createHmac('sha256',serviceKey()).update(p.slice(0,2).join('.')).digest();if(got.length!==expected.length||!timingSafeEqual(got,expected))fail();
 let claims:NativeClaims;try{claims=JSON.parse(Buffer.from(p[1],'base64url').toString());}catch{return fail();}
 const n=Math.floor(now/1000);
 if(!claims||claims.v!==1||claims.aud!==audience||claims.scope!==(audience===nativeAudience?'invoke':'callback')||!['job','preflight'].includes(claims.mode)||!Number.isSafeInteger(claims.iat)||!Number.isSafeInteger(claims.exp)||claims.iat>n+15||claims.exp<=n||claims.exp-claims.iat>360||claims.exp<=claims.iat||!founderUuid(claims.invocationId)||!founderUuid(claims.jobId)||!founderUuid(claims.leaseToken)||claims.workerId!==`native:${claims.invocationId}`||!/^[a-f0-9]{40}$/.test(claims.sha))fail();
 return claims;
}
export async function authenticateNativeCallback(request:Request){
 if(!nativeApproval().enabled)throw Error('RENDERER_UNAUTHORIZED');
 const token=request.headers.get('authorization');if(!token?.startsWith('Bearer '))throw Error('RENDERER_UNAUTHORIZED');
 const claims=verifyNativeToken(token.slice(7));await ensureNativeSchema();
 const [row]=await db()`select * from os_founder_render_cost_reservations where id=${claims.invocationId} and job_id=${claims.jobId} and lease_token=${claims.leaseToken} and worker_id=${claims.workerId} and commit_sha=${claims.sha} and mode=${claims.mode} and deadline_at>now()`;
 if(!row)throw Error('RENDERER_UNAUTHORIZED');
 return {...claims,runId:claims.invocationId,attempt:'1',reservationStatus:String(row.status)};
}
export async function startNativeInvocation(identity:NativeClaims){
 if(identity.mode==='job'){const {assertFounderRenderLease}=await import('./founder-content');const lease=await assertFounderRenderLease({jobId:identity.jobId,leaseToken:identity.leaseToken});if(lease.job.workerId!==identity.workerId)throw Error('LEASE_LOST');}
 const rows=await db()`update os_founder_render_cost_reservations set status='started',started_at=now() where id=${identity.invocationId} and status='reserved' and deadline_at>now() returning id`;
 return {started:rows.length===1};
}
export async function finishNativeInvocation(identity:NativeClaims,status:'completed'|'failed'|'unknown'){
 await db()`update os_founder_render_cost_reservations set status=${status} where id=${identity.invocationId} and worker_id=${identity.workerId} and status in ('reserved','started','unknown')`;
}
export function assertNativeJobScope(identity:NativeClaims,input:Record<string,unknown>){if(identity.mode!=='job'||input.jobId!==identity.jobId||input.leaseToken!==identity.leaseToken)throw Error('LEASE_LOST');}
export function reservationClaims(row:NativeReservation):Omit<NativeClaims,'v'|'iat'|'exp'|'scope'|'aud'>{return {mode:row.mode,invocationId:row.id,jobId:row.job_id,leaseToken:row.lease_token,workerId:row.worker_id,sha:row.commit_sha};}
export const nativeRequestId=()=>randomUUID();
