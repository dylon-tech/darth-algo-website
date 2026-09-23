import { db } from '../affiliate-db';
import { registry } from './policy';
import { coordinationStatus } from './coordination';
import { latestObservations } from './runtime-observations';
import type { DeskAgent, DeskJob, DeskRun, DeskSnapshot } from './desk-state';
const names: Record<string,string> = {ceo:'Team Leader',growth:'Growth',content:'Content Creator',support:'Customer Support',affiliates:'Affiliates',analytics:'Analytics',research:'Research',operations:'Operations',indicator_builder:'Indicator Builder'};
export async function liveOverview(): Promise<DeskSnapshot> {
  const sql = db();
  const [control, runs, completed, jobs, tasks, queueCounts, totals, decisions, activity, receipts, coordination, telemetry] = await Promise.all([
    sql`select paused from os_control where id=1`,
    sql`select distinct on(r.department) r.id::text,r.department,r.status,r.created_at as "createdAt",r.finished_at as "finishedAt",r.error_code as "errorCode",left(r.result->>'brief',4000) as brief,(select event from os_activity where entity_id=r.id::text and event like 'agent_%' order by id desc limit 1) as step from os_runs r order by r.department,r.created_at desc`,
    sql`select distinct on(department) id::text,department,status,created_at as "createdAt",finished_at as "finishedAt",error_code as "errorCode",left(result->>'brief',4000) as brief from os_runs where status='completed' order by department,finished_at desc`,
    sql`select distinct on(department,status) id::text,department,status,message,created_at as "createdAt",started_at as "startedAt" from os_jobs where status in ('running','queued') order by department,status,created_at asc`,
    sql`select distinct on(department) department,title,status from os_tasks where status in ('queued','blocked') order by department,case when status='queued' then 0 else 1 end,priority,created_at asc`,
    sql`select department,count(*)::int as n from os_jobs where status='queued' group by department`,
    sql`select (select count(*)::int from os_runs where status='running' and created_at>now()-interval '5 minutes') as working,(select count(*)::int from os_jobs where status='queued') as queued,(select count(*)::int from os_runs where status='completed' and (finished_at at time zone 'America/New_York')::date=(now() at time zone 'America/New_York')::date) as "completedToday",(select count(*)::int from os_approvals where status='pending' and expires_at>now()) as "needsOwner"`,
    sql`select id::text,left(payload->>'summary',240) as summary,payload->>'kind' as kind from os_approvals where status='pending' and expires_at>now() order by created_at asc limit 12`,
    sql`select id::text,actor,event,created_at as at from os_activity where event in ('agent_run_started','agent_run_completed','agent_run_failed','agent_handoff_created','job_queued','job_started','job_completed','job_failed','approval_requested','buffer_publish_checked','buffer_publish_unknown','run_lease_expired','job_lease_expired') order by id desc limit 18`,
    sql`select id,network,url,"sentAt" from (select distinct on(entity_id) entity_id as id,details->>'network' as network,details->>'externalLink' as url,details->>'sentAt' as "sentAt",created_at from os_activity where event='buffer_publish_checked' and details->>'published'='true' order by entity_id,created_at desc) r order by created_at desc limit 6`,
    coordinationStatus(), latestObservations(),
  ]);
  const latest = runs as unknown as DeskRun[], done = completed as unknown as DeskRun[], requests = jobs as unknown as DeskJob[];
  const configured = process.env.AI_OS_AI_ENABLED === 'true' && Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) && Boolean(process.env.AI_OS_MODEL);
  const agents: DeskAgent[] = registry.map(role => ({id:role.id,name:names[role.id] || role.id,mandate:role.mandate,configured,latest:latest.find(r=>r.department===role.id)||null,completed:done.find(r=>r.department===role.id)||null,current:requests.find(j=>j.department===role.id&&j.status==='running')||null,next:requests.find(j=>j.department===role.id&&j.status==='queued')||null,waiting:Number(queueCounts.find(r=>r.department===role.id)?.n||0),task:(tasks.find(t=>t.department===role.id) as unknown as DeskAgent['task']) || null}));
  const heartbeat=coordination.heartbeat as {lastSeenAt?:string|Date;status?:string}|null;
  const scheduler=heartbeat?.lastSeenAt?{lastSeenAt:heartbeat.lastSeenAt instanceof Date?heartbeat.lastSeenAt.toISOString():String(heartbeat.lastSeenAt),status:String(heartbeat.status||'unknown')}:null;
  return {checkedAt:new Date().toISOString(),paused:control[0]?.paused??true,autonomy:process.env.AI_OS_AUTONOMY_ENABLED==='true',scheduler,budget:coordination.budget,counts:{working:Number(totals[0]?.working||0),queued:Number(totals[0]?.queued||0),completedToday:Number(totals[0]?.completedToday||0),needsOwner:Number(totals[0]?.needsOwner||0)},agents,services:telemetry.services,telemetryAvailable:telemetry.available,decisions:decisions as unknown as DeskSnapshot['decisions'],activity:activity as unknown as DeskSnapshot['activity'],receipts:receipts as unknown as DeskSnapshot['receipts']};
}
