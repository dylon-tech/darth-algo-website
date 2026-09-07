import { randomUUID } from "node:crypto";
import { db } from "../affiliate-db";
import { fingerprint, registry } from "./policy";
import { collectEvidence } from "./sources";
import { generatePlan } from "./model";

export async function status() {
  const sql = db();
  const [tasks, approvals, activity, runs] = await Promise.all([
    sql`select * from os_tasks order by priority,created_at desc limit 100`,
    sql`select *,case when status='pending' and expires_at<=now() then 'expired' else status end as effective_status from os_approvals order by created_at desc limit 50`,
    sql`select * from os_activity order by id desc limit 100`,
    sql`select id,status,created_at,finished_at,error_code,result from os_runs order by created_at desc limit 10`,
  ]);
  return { agents: registry.map(a => ({ ...a, state: a.id === "ceo" ? "on_demand" : "registered_not_running" })), tasks, approvals, activity, runs, externalExecutionEnabled: false };
}

export async function runCEO(requestKey: string, message: string) {
  const sql = db();
  const id = randomUUID();
  const created = await sql.begin(async tx => {
    // A stale run cannot publish a result after being failed: completion below
    // locks and rechecks its state before any task/approval write.
    const stale = await tx`update os_runs set status='failed',finished_at=now(),error_code='RUN_LEASE_EXPIRED' where status='running' and created_at<now()-interval '5 minutes' returning id`;
    for (const row of stale) await tx`insert into os_activity(actor,event,entity_id,details) values('system','run_lease_expired',${row.id},'{}'::jsonb)`;
    const [existing] = await tx`select id,status,result from os_runs where request_key=${requestKey}`;
    if (existing) return { duplicate: true, ...existing };
    // Max 12 attempted AI runs per rolling day. Owner invocation is still
    // required; enabling the flag is not a recurring-spend authorization.
    await tx`select pg_advisory_xact_lock(730915)`;
    const [count] = await tx`select count(*)::int as n from os_runs where created_at>now()-interval '24 hours'`;
    if (count.n >= 12) throw new Error("DAILY_RUN_LIMIT");
    await tx`insert into os_runs(id,request_key,status) values(${id},${requestKey},'running')`;
    await tx`insert into os_messages(id,department,role,body,run_id) values(${randomUUID()},'ceo','owner',${message},${id})`;
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','ceo_run_started',${id},'{}'::jsonb)`;
    return { duplicate: false, id };
  });
  if (created.duplicate) return created;
  try {
    const [evidence, tasks, history] = await Promise.all([
      collectEvidence(),
      sql`select department,title,priority,status from os_tasks where status in ('queued','in_progress','blocked') order by priority,created_at limit 50`,
      sql`select role,body from (select role,body,created_at from os_messages where department='ceo' and run_id<>${id} order by created_at desc limit 6) h order by created_at`,
    ]);
    await sql`update os_runs set snapshot=${sql.json(JSON.parse(JSON.stringify(evidence)))} where id=${id} and status='running'`;
    const { plan, model, usage } = await generatePlan(message, evidence, tasks, history);
    await sql.begin(async tx => {
      const [run] = await tx`select status from os_runs where id=${id} for update`;
      if (run?.status !== "running") throw new Error("RUN_LEASE_EXPIRED");
      await tx`update os_approvals set status='expired' where status='pending' and expires_at<=now()`;
      for (const task of plan.tasks) {
        const taskId = randomUUID();
        const inserted = await tx`insert into os_tasks(id,department,title,priority,dedupe_key,evidence,run_id)
          values(${taskId},${task.department},${task.title},${task.priority},${fingerprint([task.department, task.title.trim().toLowerCase()])},${tx.json(task.evidence)},${id}) on conflict do nothing returning id`;
        if (inserted.length) await tx`insert into os_activity(actor,event,entity_id,details) values('ceo','task_queued',${taskId},${tx.json({ department: task.department, runId: id })})`;
      }
      for (const proposal of plan.proposals) {
        const approvalId = randomUUID();
        const payload = { ...proposal, executor: "unavailable_phase_1", policyVersion: 1 };
        const inserted = await tx`insert into os_approvals(id,run_id,payload,payload_hash,expires_at)
          values(${approvalId},${id},${tx.json(payload)},${fingerprint(payload)},now()+interval '24 hours') on conflict do nothing returning id`;
        if (inserted.length) await tx`insert into os_activity(actor,event,entity_id,details) values('ceo','approval_requested',${approvalId},${tx.json({ kind: proposal.kind, runId: id })})`;
      }
      await tx`insert into os_messages(id,department,role,body,run_id) values(${randomUUID()},'ceo','agent',${plan.brief},${id})`;
      await tx`update os_runs set status='completed',finished_at=now(),result=${tx.json(plan)} where id=${id}`;
      await tx`insert into os_activity(actor,event,entity_id,details) values('ceo','ceo_run_completed',${id},${tx.json({ model, usage })})`;
    });
    return { id, status: "completed", plan, evidence };
  } catch {
    await sql.begin(async tx => {
      await tx`update os_runs set status='failed',finished_at=now(),error_code='CEO_RUN_FAILED' where id=${id} and status='running'`;
      await tx`insert into os_activity(actor,event,entity_id,details) values('ceo','ceo_run_failed',${id},'{"message":"Run failed; inspect source availability and AI configuration. No external action executed."}'::jsonb)`;
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
    return { id, status: decision, executed: false, message: "Decision recorded. External execution is unavailable in Phase 1." };
  });
}
