import { randomUUID } from "node:crypto";
import { db } from "../affiliate-db";
import { departments, type Department } from "./policy";
import { runAgent } from "./service";

export async function queueJob(department: Department, message: string, requestKey: string, source: "owner" | "telegram" | "schedule", taskId?: string) {
  if (!departments.includes(department) || !message.trim() || message.length > 4000 || !/^[\w:-]{8,150}$/.test(requestKey)) throw new Error("INVALID_JOB");
  return db().begin(async tx => {
    await tx`select pg_advisory_xact_lock(730916)`;
    const [existing] = await tx`select id,status from os_jobs where request_key=${requestKey}`;
    if (existing) return existing;
    const [count] = await tx`select count(*)::int as n from os_jobs where status in ('queued','running')`;
    if (count.n >= 100) throw new Error("QUEUE_FULL");
    const id = randomUUID();
    await tx`insert into os_jobs(id,request_key,department,message,source,task_id) values(${id},${requestKey},${department},${message},${source},${taskId || null})`;
    await tx`insert into os_activity(actor,event,entity_id,details) values(${source},'job_queued',${id},${tx.json({department,taskId:taskId || null})})`;
    return { id, status: "queued" };
  });
}

export async function workOneJob() {
  if (process.env.AI_OS_ENABLED !== "true" || process.env.AI_OS_AI_ENABLED !== "true") return { status: "ai_disabled" };
  const sql = db();
  const job = await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(730916)`;
    const [control] = await tx`select paused from os_control where id=1`;
    if (!control || control.paused) return null;
    const stale = await tx`update os_jobs set status='unknown',finished_at=now(),error_code='LEASE_EXPIRED_REVIEW_BEFORE_RETRY' where status='running' and started_at < now()-interval '5 minutes' returning id,task_id`;
    for (const item of stale) {
      await tx`insert into os_activity(actor,event,entity_id,details) values('operations','job_lease_expired',${item.id},'{"automaticRetry":false}'::jsonb)`;
      if (item.task_id) await tx`update os_tasks set status='blocked',updated_at=now() where id=${item.task_id} and status='in_progress'`;
    }
    const [active] = await tx`select id from os_jobs where status='running' limit 1`;
    if (active) return null;
    const [next] = await tx`select * from os_jobs where status='queued' order by created_at for update skip locked limit 1`;
    if (!next) return null;
    await tx`update os_jobs set status='running',started_at=now() where id=${next.id}`;
    await tx`insert into os_activity(actor,event,entity_id,details) values(${next.department},'job_started',${next.id},'{}'::jsonb)`;
    return next;
  });
  if (!job) return { status: "idle_or_paused" };
  try {
    const result = await runAgent(job.department as Department, `job_${job.id}`, job.message, job.task_id || undefined);
    if (result.status !== "completed") throw new Error("RUN_NOT_COMPLETED");
    await sql.begin(async tx => {
      const updated = await tx`update os_jobs set status='succeeded',finished_at=now(),run_id=${result.id} where id=${job.id} and status='running' returning id`;
      if (!updated.length) throw new Error("JOB_LEASE_EXPIRED");
      await tx`insert into os_activity(actor,event,entity_id,details) values(${job.department},'job_completed',${job.id},${tx.json({runId:result.id,externalActionExecuted:false})})`;
    });
    return { status: "succeeded", jobId: job.id, runId: result.id, department: job.department };
  } catch {
    await sql.begin(async tx => {
      await tx`update os_jobs set status='failed',finished_at=now(),error_code='AGENT_RUN_FAILED_REVIEW_REQUIRED' where id=${job.id} and status='running'`;
      await tx`insert into os_activity(actor,event,entity_id,details) values(${job.department},'job_failed',${job.id},'{"automaticRetry":false}'::jsonb)`;
    });
    return { status: "failed", jobId: job.id, department: job.department };
  }
}

export async function setPaused(paused: boolean) {
  await db().begin(async tx => {
    await tx`update os_control set paused=${paused},updated_at=now() where id=1`;
    await tx`insert into os_activity(actor,event,details) values('owner',${paused ? 'work_paused' : 'work_resumed'},'{"inFlightProviderCallsMayFinish":true}'::jsonb)`;
  });
  return { paused };
}

export async function cancelJob(id: string) {
  return db().begin(async tx => {
    const [job] = await tx`update os_jobs set status='cancelled',finished_at=now() where id=${id} and status='queued' returning id`;
    if (!job) throw new Error("ONLY_QUEUED_JOBS_CAN_BE_CANCELLED");
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','job_cancelled',${id},'{}'::jsonb)`;
    return job;
  });
}
