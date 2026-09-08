import { randomUUID } from "node:crypto";
import { db } from "../affiliate-db";
import { fingerprint, registry, type Department } from "./policy";
import { collectEvidence } from "./sources";
import { generatePlan } from "./model";
import { pilot, pilotJobKeys } from "./pilot-policy";
import { recurringBudgetPolicy } from "./budget-policy";
import { coordinationStatus, teamEvidence } from "./coordination";
import { coordinationEnabled, handoffAllowed, reviewTarget } from "./coordination-policy";

export async function status() {
  const sql = db();
  const [tasks, approvals, activity, runs, jobs, control, messages, briefs, outbox, pilotEvents] = await Promise.all([
    sql`select * from os_tasks order by priority,created_at desc limit 100`,
    sql`select *,case when status='pending' and expires_at<=now() then 'expired' else status end as effective_status from os_approvals order by created_at desc limit 50`,
    sql`select * from os_activity order by id desc limit 100`,
    sql`select id,department,status,created_at,finished_at,error_code,result,
      exists(select 1 from os_activity a where a.entity_id=os_runs.id::text and a.event='pilot_budget_reserved' and a.details->>'pilotId'=${pilot.id}) as approved_pilot
      ,(select a.details from os_activity a where a.entity_id=os_runs.id::text and a.event='agent_output_reviewed' order by a.id desc limit 1) as output_review
      from os_runs order by created_at desc limit 20`,
    sql`select * from os_jobs order by created_at desc limit 50`,
    sql`select paused from os_control where id=1`,
    sql`select id,department,role,body,created_at from os_messages order by created_at desc limit 100`,
    sql`select day,created_at,body from os_briefs order by day desc limit 7`,
    sql`select id,status,error_code,created_at,sent_at from os_outbox order by created_at desc limit 20`,
    sql`select event,details from os_activity a where
      (event='pilot_budget_reserved' and details->>'pilotId'=${pilot.id}) or
      (event='agent_run_completed' and exists(select 1 from os_activity p where p.entity_id=a.entity_id and p.event='pilot_budget_reserved' and p.details->>'pilotId'=${pilot.id}))`,
  ]);
  const pilotAttempts = pilotEvents.filter(e => e.event === "pilot_budget_reserved").length;
  const pilotCompleted = pilotEvents.filter(e => e.event === "agent_run_completed");
  const pilotSummary = { attempts: pilotAttempts, completed: pilotCompleted.length, maxUsd: pilot.totalUsd,
    reservedUsd: pilotAttempts * pilot.reservationUsd,
    estimatedCompletedCostUsd: pilotCompleted.reduce((sum, e) => sum + (Number(e.details.usage?.inputTokens || 0) * pilot.inputUsdPerMillion + Number(e.details.usage?.outputTokens || 0) * pilot.outputUsdPerMillion) / 1000000, 0),
    costScope: "Estimate for completed runs using reported tokens; excludes unknown failed-call costs and ignores cache discounts. Reservations remain held for all attempts." };
  return { coordination: await coordinationStatus(), pilot: pilotSummary, agents: registry.map(a => ({ ...a, state: runs.some(r => r.department === a.id && r.status === "running") ? "working" : jobs.some(j => j.department === a.id && j.status === "queued") ? "queued" : process.env.AI_OS_AI_ENABLED === "true" ? "on_demand" : "ai_disabled" })), tasks, approvals, activity, runs, jobs, messages, briefs, outbox, paused: control[0]?.paused ?? true, externalExecutionEnabled: false };
}

export async function runCEO(requestKey: string, message: string) {
  return runAgent("ceo", requestKey, message);
}

export async function reviewAgentOutput(runId: string, notes: string) {
  return db().begin(async tx => {
    const [run] = await tx`select id from os_runs where id=${runId} and status='completed' for update`;
    if (!run) throw new Error("COMPLETED_RUN_REQUIRED");
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner_assistant','agent_output_reviewed',${runId},${tx.json({verdict:'needs_revision',notes})})`;
    return {runId,verdict:'needs_revision',executed:false};
  });
}

export async function runAgent(department: Department, requestKey: string, message: string, taskId?: string, approvedPilot = false) {
  if (approvedPilot && process.env.VERCEL_ENV !== "preview") throw new Error("PILOT_PREVIEW_ONLY");
  if (!approvedPilot && process.env.AI_OS_AI_ENABLED !== "true") throw new Error("AI_DISABLED");
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
    const [queuedWorker] = await tx`select id,department,message from os_jobs where status='running' limit 1`;
    if (queuedWorker && (requestKey !== `job_${queuedWorker.id}` || department !== queuedWorker.department || message !== queuedWorker.message)) throw new Error("OS_WORKER_BUSY");
    if (approvedPilot) {
      const [job] = await tx`select request_key from os_jobs where 'job_' || id::text=${requestKey} and department=${department} and message=${message} and status='running'`;
      if (!job || !pilotJobKeys.includes(job.request_key)) throw new Error("PILOT_JOB_NOT_AUTHORIZED");
      const [reserved] = await tx`select count(*)::int as n from os_activity where event='pilot_budget_reserved' and details->>'pilotId'=${pilot.id}`;
      if (reserved.n >= pilot.maxAttempts) throw new Error("PILOT_BUDGET_EXHAUSTED");
      await tx`insert into os_activity(actor,event,entity_id,details) values('owner','pilot_budget_reserved',${id},${tx.json({pilotId:pilot.id,jobKey:job.request_key,reservedUsd:pilot.reservationUsd,totalLimitUsd:pilot.totalUsd,model:pilot.model})})`;
    }
    // The legacy pilot cap must not override explicitly approved recurring
    // dollar limits. Every recurring provider call still reserves atomically.
    if (approvedPilot) {
      const [count] = await tx`select count(*)::int as n from os_runs where created_at>now()-interval '24 hours'`;
      if (count.n >= 12) throw new Error("DAILY_RUN_LIMIT");
    } else {
      recurringBudgetPolicy(); // Fail closed without priced, bounded recurring consent.
    }
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
    await sql`insert into os_activity(actor,event,entity_id,details) values(${department},'agent_reading_sources',${id},'{}'::jsonb)`;
    const [evidence, tasks, history] = await Promise.all([
      collectEvidence(),
      sql`select department,title,priority,status from os_tasks where status in ('queued','in_progress','blocked') order by priority,created_at limit 50`,
      sql`select role,left(body,3000) as body from (select role,body,created_at from os_messages where department=${department} and run_id<>${id} order by created_at desc limit 4) h order by created_at`,
    ]);
    if (coordinationEnabled() && !approvedPilot) evidence.push(...await teamEvidence(taskId));
    await sql`update os_runs set snapshot=${sql.json(JSON.parse(JSON.stringify(evidence)))} where id=${id} and status='running'`;
    await sql`insert into os_activity(actor,event,entity_id,details) values(${department},'agent_sources_checked',${id},${sql.json({verifiedSources:evidence.filter(s=>s.status==="verified").length,unavailableSources:evidence.filter(s=>s.status==="unavailable").length})})`;
    await sql`insert into os_activity(actor,event,entity_id,details) values(${department},'agent_preparing_response',${id},'{}'::jsonb)`;
    const { plan, model, usage } = await generatePlan(message, evidence, tasks, history, department, approvedPilot, requestKey);
    await sql`insert into os_activity(actor,event,entity_id,details) values(${department},'agent_response_ready',${id},'{}'::jsonb)`;
    await sql.begin(async tx => {
      const [run] = await tx`select status from os_runs where id=${id} for update`;
      const [control] = await tx`select paused from os_control where id=1`;
      if (run?.status !== "running" || control?.paused) throw new Error("RUN_LEASE_EXPIRED_OR_PAUSED");
      await tx`update os_approvals set status='expired' where status='pending' and expires_at<=now()`;
      const coordinating = coordinationEnabled() && !approvedPilot;
      const [parentTask] = coordinating && taskId ? await tx`select root_run_id,handoff_depth from os_tasks where id=${taskId}` : [];
      const rootRun = parentTask?.root_run_id || id;
      const depth = parentTask?.handoff_depth || 0;
      const [rootCount] = coordinating ? await tx`select count(*)::int as n from os_tasks where root_run_id=${rootRun}` : [];
      let workflowCount = rootCount?.n || 0;
      const assignedTasks = [...plan.tasks];
      const target = reviewTarget[department];
      if (coordinating && target && !assignedTasks.length && handoffAllowed(department, target, depth, workflowCount)) {
        assignedTasks.push({ department: target, title: `Review and build on ${department}'s deliverable`, priority: 3, evidence: ["team_deliverables"] });
      }
      for (const task of assignedTasks) {
        if (coordinating && !handoffAllowed(department, task.department, depth, workflowCount)) {
          await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'handoff_limit_reached',${id},${tx.json({target:task.department,depth})})`;
          continue;
        }
        const taskId = randomUUID();
        const inserted = await tx`insert into os_tasks(id,department,title,priority,dedupe_key,evidence,run_id)
          values(${taskId},${task.department},${task.title},${task.priority},${fingerprint([task.department, task.title.trim().toLowerCase()])},${tx.json(task.evidence)},${id}) on conflict do nothing returning id`;
        if (inserted.length) await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'task_queued',${taskId},${tx.json({ department: task.department, runId: id })})`;
        if (inserted.length && coordinating) {
          workflowCount++;
          await tx`update os_tasks set root_run_id=${rootRun},handoff_depth=${depth+1} where id=${taskId}`;
          await tx`insert into os_handoffs(id,task_id,parent_run_id,root_run_id,from_department,to_department,body)
            values(${randomUUID()},${taskId},${id},${rootRun},${department},${task.department},${plan.brief})`;
          await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'agent_handoff_created',${taskId},${tx.json({to:task.department,rootRun,depth:depth+1})})`;
        }
      }
      for (const proposal of plan.proposals) {
        const approvalId = randomUUID();
        const payload = { ...proposal, executor: "not_connected", policyVersion: 1 };
        const inserted = await tx`insert into os_approvals(id,run_id,payload,payload_hash,expires_at)
          values(${approvalId},${id},${tx.json(payload)},${fingerprint(payload)},now()+interval '24 hours') on conflict do nothing returning id`;
        if (inserted.length) await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'approval_requested',${approvalId},${tx.json({ kind: proposal.kind, runId: id })})`;
      }
      if (taskId) await tx`update os_tasks set status='completed',result=${plan.brief},result_kind='internal_deliverable',updated_at=now() where id=${taskId} and status='in_progress'`;
      if (coordinating && taskId) await tx`update os_handoffs set status='completed',updated_at=now() where task_id=${taskId}`;
      await tx`insert into os_messages(id,department,role,body,run_id) values(${randomUUID()},${department},'agent',${plan.brief},${id})`;
      await tx`update os_runs set status='completed',finished_at=now(),result=${tx.json(plan)} where id=${id}`;
      await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'agent_run_completed',${id},${tx.json({ model, usage, resultKind: 'internal_deliverable' })})`;
    });
    return { id, status: "completed", plan, evidence };
  } catch (error) {
    const errorCode = error instanceof Error && /^(AI_(BUDGET|DAILY_BUDGET|MONTHLY_BUDGET|RECURRING_SPEND)_|DAILY_RUN_LIMIT)/.test(error.message) ? error.message : error instanceof Error && /^AI_PROVIDER_(401|403|429|400|404|500|502|503)(_(insufficient_quota|invalid_api_key|model_not_found|unsupported_parameter|rate_limit_exceeded))?$/.test(error.message) ? error.message : "CEO_RUN_FAILED";
    await sql.begin(async tx => {
      await tx`update os_runs set status='failed',finished_at=now(),error_code=${errorCode} where id=${id} and status='running'`;
      if (taskId) await tx`update os_tasks set status='blocked',updated_at=now() where id=${taskId} and status='in_progress'`;
      await tx`insert into os_activity(actor,event,entity_id,details) values(${department},'agent_run_failed',${id},'{"message":"Run failed; inspect source availability and AI configuration. No external action executed."}'::jsonb)`;
    });
    throw new Error(errorCode);
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
