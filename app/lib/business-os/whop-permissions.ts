import {createHash} from 'node:crypto';
import {db} from '../affiliate-db';
const keyId=()=>createHash('sha256').update(process.env.WHOP_COMPANY_API_KEY?.trim()||'').digest('hex');
export async function whopPermissionState(){
 const sql=db(),key=keyId();
 // Recover the exact, observed provider rejection from the September 23 audit.
 // Earlier adapters saved HTTP 400 without the permission detail now in logs.
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730946)`;
  const [migrated]=await tx`select id from os_activity where event='whop_permission_incident_classified' limit 1`;
  if(migrated)return;
  const [failure]=await tx`select id from os_activity where entity_id='daily-whop:2026-09-23-afternoon' and event='whop_home_publish_unknown' and details->>'code'='WHOP_FORUM_HTTP_400' and created_at>='2026-09-23T23:19:00Z' and created_at<'2026-09-23T23:20:00Z' limit 1`;
  if(!failure)return;
  await tx`insert into os_activity(actor,event,entity_id,details) values('operations','whop_permission_incident_classified',${String(failure.id)},'{"providerEvidence":"2026-09-23T23:19:38Z whop_request_rejected","requiredPermission":"forum:post:create"}'::jsonb)`;
  await tx`insert into os_activity(actor,event,entity_id,details) values('operations','whop_publish_permission_blocked',${key},'{"code":"WHOP_FORUM_PERMISSION_MISSING","permission":"forum:post:create"}'::jsonb)`;
 });
 const [latest]=await sql`select id,event,created_at from os_activity where entity_id=${key} and event in ('whop_publish_permission_blocked','whop_permission_recheck_requested','whop_publish_permission_verified') order by id desc limit 1`;
 return {blocked:latest?.event==='whop_publish_permission_blocked',verified:latest?.event==='whop_publish_permission_verified',recheckRequested:latest?.event==='whop_permission_recheck_requested',checkedAt:latest?.created_at||null};
}
export async function recordWhopPermission(blocked:boolean){
 const sql=db(),key=keyId(),event=blocked?'whop_publish_permission_blocked':'whop_publish_permission_verified';
 await sql`insert into os_activity(actor,event,entity_id,details) values('operations',${event},${key},${sql.json({permission:'forum:post:create',verified:!blocked})})`;
}
export async function requestWhopPermissionRecheck(){
 return db().begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730946)`;
  const [latest]=await tx`select event from os_activity where entity_id=${keyId()} and event in ('whop_publish_permission_blocked','whop_permission_recheck_requested','whop_publish_permission_verified') order by id desc limit 1`;
  if(latest?.event==='whop_publish_permission_blocked')await tx`insert into os_activity(actor,event,entity_id,details) values('owner','whop_permission_recheck_requested',${keyId()},'{"scope":"Resume next scheduled approved post after owner reports permission update","verified":false}'::jsonb)`;
  return {state:'next_scheduled_attempt',verified:false};
 });
}
