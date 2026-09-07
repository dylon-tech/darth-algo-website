import { randomUUID } from "node:crypto";
import { db } from "../affiliate-db";
import { fingerprint, registry, type Department } from "./policy";
import { collectEvidence } from "./sources";
import { generatePlan } from "./model";

export async function status() {
  const sql = db();
  const [tasks, approvals, activity, runs, jobs, control, messages, briefs, outbox] = await Promise.all([
    sql`select * from os_tasks order by priority,created_at desc limit 100`,
    sql`select *,case when status='pending' and expires_at<=now() then 'expired' else status end as effective_status from os_approvals order by created_at desc limit 50`,
    sql`select * from os_activity order by id desc limit 100`,
    sql`select id,department,status,created_at,finished_at,error_code,result from os_runs order by created_at desc limit 20`,
    sql`select * from os_jobs order by created_at desc limit 50`,
    sql`select paused from os_control where id=1`,
    sql`select id,department,role,body,created_at from os_messages order by created_at desc limit 100`,
    sql`select day,created_at,body from os_briefs order by day desc limit 7`,
    sql`select id,status,error_code,created_at,sent_at from os_outbox order by created_at desc limit 20`,
  ]);
  return { agents: registry.map(a => ({ ...a, state: runs.some(r => r.department === a.id && r.status === "running") ? "working" : jobs.some(j => j.department === a.id && j.status === "queued") ? "queued" : process.env.AI_OS_AI_ENABLED === "true" ? "on_demand" : "ai_disabled" })), tasks, approvals, activity, runs, jobs, messages, briefs, outbox, paused: control[0]?.paused ?? true, externalExecutionEnabled: false };
}

export async function runCEO(requestKey: string, message: string) {
  return runAgent("ceo", requestKey, message);
}

export async function runAgent(department: Department, requestKey: string, message: string, taskId?: string) {
  if (process.env.AI_OS_AI_ENABLED !== "true") throw new Error("AI_DISABLED");
  const sql = db();
  const id = randomUUID();
  const created = await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(730915)`;
    const [control] = await tx`select paused from os_control where id=1`;
    if (!control || control.paused) throw new Error("OS_PAUSED");
    // A stale run cannot publish a result after being failed: completion below
    // locks and rechecks its state before any task/approval write.
    const stale = await tx`update os_runs set status='failed',finished_at=now(),error_code='RUN_LEASE_EXPIRED' where status='running' and created_at<now()-interval '5 minutes' returning id`;
    for (const row of stale) await tx`insert into os_activity(actor,event,entity_id,details) values('system','run_lease_expired',${row.id},'{}'::jsonb)`;
    const [existing] = await tx`select id,status,result from os_runs where request_key=${requestKey}`;
    if (existing) return { duplicate: true as const, id: String(existing.id), status: String(existing.status), result: existing.result };
    // Max 12 attempted AI runs per rolling day. Owner invocation is still
    // required; enabling the flag is not a recurring-spend authorization.
    const [count] = await tx`select count(*)::int as n from os_runs where created_at>now()-interval '24 hours'`;
    if (count.n >= 12) throw new Error("DAILY_RUN_LIMIT");
    if (taskId) {
      const changed = await tx`update os_tasks set status='in_progress',updated_at=now() where id=${taskId} and department=${department} and status in ('queued','blocked') returning id`;
      if (!changed.length) throw new Error("TASK_NOT_AVAILABLE");
    }
    await tx`insert into os_runs(id,request_key,status,department,task_id) values(${id},${requestKey},'running',${department},${taskId || null})`;
    await tx`insert into os_messages(id,department,role,body,run_id) values(${randomUUID()},${department},'owner',${message},${id})`;
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','agent_run_started',${id},${tx.json({department})})`;
    return { duplicate: false as const, id };
  });
  if (created.duplicate) return created;
  try {
    const [evidence, tasks, history] = await Promise.all([
      collectEvidence(),
      sql`select department,title,priority,status from os_tasks where status in ('queued','in_progress','blocked') order by priority,created_at limit 50`,
      sql`select role,left(body,3000) as body from (select role,body,created_at from os_messages where department=${department} and run_id<>${id} order by created_at desc limit 4) h order by created_at`,
    ]);
    await sql`update os_runs set snapshot=${sql.json(JSON.parse(JSON.stringify(evidence)))} where id=${id} and status='running'`;
    const { plan, model, usage } = await generatePlan(message, evidence, tasks, history, department);
    await sql.begin(async tx => {
      const [run] = await tx`select status from os_runs where id=${id} for update`;
      const [control] = await tx`select paused from os_control where id=1`;
      if (run?.status !== "running" || control?.paused) throw new Error("RUN_LEASE_EXPIRED_OR_PAUSED");
      await tx`update os_approvals set status='expired' where status='pending' and expires_at<=now()`;
      for (const task of plan.tasks) {
        const taskId = randomUUID();
        const inserted = await tx`insert into os_tasks(id,department,title,priority,dedupe_key,evidence,run_id)
          values(${taskId},${task.department},${task.title},${task.priority},${fingerprint([task.department, task.title.trim().toLowerCase()])},${tx.json(task.evidence)},${id}) on conflict do nothing returning id`;
        if (inserted.length) await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'task_queued',${taskId},${tx.json({ department: task.department, runId: id })})`;
      }
      for (const proposal of plan.proposals) {
        const approvalId = randomUUID();
        const payload = { ...proposal, executor: "not_connected", policyVersion: 1 };
        const inserted = await tx`insert into os_approvals(id,run_id,payload,payload_hash,expires_at)
          values(${approvalId},${id},${tx.json(payload)},${fingerprint(payload)},now()+interval '24 hours') on conflict do nothing returning id`;
        if (inserted.length) await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'approval_requested',${approvalId},${tx.json({ kind: proposal.kind, runId: id })})`;
      }
      if (taskId) await tx`update os_tasks set status='completed',result=${plan.brief},result_kind='internal_deliverable',updated_at=now() where id=${taskId} and status='in_progress'`;
      await tx`insert into os_messages(id,department,role,body,run_id) values(${randomUUID()},${department},'agent',${plan.brief},${id})`;
      await tx`update os_runs set status='completed',finished_at=now(),result=${tx.json(plan)} where id=${id}`;
      await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'agent_run_completed',${id},${tx.json({ model, usage, resultKind: 'internal_deliverable' })})`;
    });
    return { id, status: "completed", plan, evidence };
  } catch {
    await sql.begin(async tx => {
      await tx`update os_runs set status='failed',finished_at=now(),error_code='CEO_RUN_FAILED' where id=${id} and status='running'`;
      if (taskId) await tx`update os_tasks set status='blocked',updated_at=now() where id=${taskId} and status='in_progress'`;
      await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'agent_run_failed',${id},'{"message":"Run failed; inspect source availability and AI configuration. No external action executed."}'::jsonb)`;
    });
    throw new Error("CEO_RUN_FAILED");
  }
}

export async function decide(id: string, hash: string, decision: "approved" | "declined" | "revision_requested", note: string) {
  return db().begin(async tx => {
    const [row] = await tx`select * from os_approvals where id=${id} for update`;
    if (!row || row.status !== "pending" || new Date(row.expires_at).getTime() <= Date.now()) throw new Error("APPROVAL_NOT_PENDING");
    if (hash !== row.payload_hash || fingerprint(row.payload) !== hash) throw new Error("APPROVAL_VERSION_CHANGED");
    await tx`update os_approvals set status=${decision},decided_at=now(),decided_by='owner',decision_note=${note} where id=${id}`;
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner',${`approval_${decision}`},${id},${tx.json({ payloadHash: hash, note, executed: false })})`;
    return { id, status: decision, executed: false, message: "Decision recorded. No external executor is connected." };
  });
}
