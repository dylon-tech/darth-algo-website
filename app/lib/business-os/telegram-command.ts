import { db } from "../affiliate-db";
import { departments, fingerprint, type Department } from "./policy";
import { queueJob, setPaused, workOneJob } from "./jobs";
import { decide } from "./service";
import { privateTelegramConfiguration, queueOwnerNotice, queueApprovalNotice, deliverOwnerNotices, telegramMethod } from "./delivery";
import type { OwnerUpdate } from "./telegram-policy";

export async function recordOwnerUpdate(update: OwnerUpdate) {
  const sql=db();
  // Only whitelisted text and IDs from an authenticated private owner update
  // are retained; attachment bodies and arbitrary Telegram objects are dropped.
  const payload: OwnerUpdate = {update_id:update.update_id};
  if(update.message) payload.message={text:update.message.text?.slice(0,4000)};
  if(update.callback_query) payload.callback_query={id:update.callback_query.id,data:update.callback_query.data?.slice(0,64)};
  await sql`insert into os_telegram_updates(update_id,payload) values(${update.update_id},${sql.json(payload)}) on conflict do nothing`;
}

async function handleUpdate(update: OwnerUpdate) {
  const sql = db(); const owner=privateTelegramConfiguration().owner!;
  const notice = (text:string) => queueOwnerNotice(`update:${update.update_id}`,text);
  const callback=update.callback_query;
  if(callback) {
    const match=callback.data?.match(/^os:([a-f0-9]{32})$/);
    const [action]=match ? await sql`select * from os_callback_actions where id=${match[1]} and expires_at>now()` : [];
    if(!action) { await notice("That decision button has expired. Open /approvals for current proposals."); return; }
    const [approval]=await sql`select * from os_approvals where id=${action.approval_id}`;
    if(!approval || approval.status!=="pending" || fingerprint(approval.payload)!==action.payload_hash || approval.payload_hash!==action.payload_hash || new Date(approval.expires_at).getTime()<=Date.now()) {
      await notice("This proposal was already decided, expired, or changed. Open /approvals for current decisions."); return;
    }
    if(action.decision === "revision_requested") {
      await sql`insert into os_telegram_state(owner_id,revision_id,revision_hash) values(${owner},${approval.id},${approval.payload_hash}) on conflict(owner_id) do update set revision_id=excluded.revision_id,revision_hash=excluded.revision_hash`;
      await notice(`What should change in: ${approval.payload.summary}?\nReply with your revision instructions, or /cancel.`);
    } else {
      await decide(approval.id,action.payload_hash,action.decision,"Owner Telegram decision");
      await notice(`Decision recorded: ${action.decision}. No external action was executed.`);
    }
    if(callback.id) { try { await telegramMethod("answerCallbackQuery",{callback_query_id:callback.id,text:"Owner decision received"}); } catch { /* A late acknowledgement does not replay a decision. */ } }
    return;
  }
  const text=update.message?.text?.trim();
  if(!text) { await notice("Send a text message or /help. Attachments are not processed by the private command bot yet."); return; }
  const [state]=await sql`select * from os_telegram_state where owner_id=${owner}`;
  const command=text.split(/\s+/)[0].split("@")[0].toLowerCase();
  if(command==="/cancel") {
    await sql`update os_telegram_state set revision_id=null,revision_hash=null where owner_id=${owner}`;
    await notice("Revision entry cancelled."); return;
  }
  if(state?.revision_id && !text.startsWith("/")) {
    await decide(state.revision_id,state.revision_hash,"revision_requested",text);
    await sql`update os_telegram_state set revision_id=null,revision_hash=null where owner_id=${owner}`;
    await notice("Revision recorded. The original proposal is closed; revised work needs a new exact approval."); return;
  }
  if(command==="/start" || command==="/help") {
    await notice("DARTH ALGO · OWNER COMMAND\n\n/agents — choose a department\n/status — real queue and connection state\n/approvals — pending owner decisions\n/brief — latest daily brief\n/pause — stop new agent work\n/resume — resume permitted work\n/cancel — cancel revision entry\n\nUse /growth, /content, /support, /affiliates, /analytics, /research, /operations, or /ceo to switch departments. Then send your request. Internal drafts and external actions are tracked separately."); return;
  }
  if(command==="/agents") { await notice(departments.map(d=>`/${d}`).join("\n")); return; }
  if(command==="/pause" || command==="/resume") { const result=await setPaused(command==="/pause"); await notice(result.paused ? "New agent work is paused. An already-started provider request may finish; external execution is disabled." : "Work resumed within configured AI limits. AI must be enabled before queued work can run."); return; }
  if(command==="/status") {
    const jobs=await sql`select status,count(*)::int as count from os_jobs group by status`;
    const [pending]=await sql`select count(*)::int as count from os_approvals where status='pending' and expires_at>now()`;
    const [control]=await sql`select paused from os_control where id=1`;
    await notice(`AI: ${process.env.AI_OS_AI_ENABLED==="true" ? "enabled" : "disabled"}\nPaused: ${control?.paused ? "yes" : "no"}\nJobs: ${jobs.map(x=>`${x.status} ${x.count}`).join(", ") || "none"}\nPending decisions: ${pending.count}\nExternal execution: disabled`); return;
  }
  if(command==="/approvals") {
    const approvals=await sql`select id from os_approvals where status='pending' and expires_at>now() order by created_at limit 5`;
    if(!approvals.length) await notice("No pending owner decisions.");
    for(const a of approvals) await queueApprovalNotice(a.id);
    await notice("Current proposals are available in the Command Center. Up to five new Telegram decision cards are queued; previously delivered cards remain valid until their displayed expiry."); return;
  }
  if(command==="/brief") {
    const [brief]=await sql`select day,body from os_briefs order by day desc limit 1`;
    await notice(brief ? `${brief.day}\n${brief.body}` : "No daily brief has been recorded yet. Open the Command Center to collect one from current source data."); return;
  }
  const selected=command.startsWith("/") ? command.slice(1) : "";
  let department=(state?.department || "ceo") as Department;
  let message=text;
  if(departments.includes(selected as Department)) {
    department=selected as Department;
    await sql`insert into os_telegram_state(owner_id,department) values(${owner},${department}) on conflict(owner_id) do update set department=excluded.department`;
    message=text.slice(text.split(/\s+/)[0].length).trim();
    if(!message) { await notice(`You’re talking to ${department}. Send your request.`); return; }
  } else if(text.startsWith("/")) { await notice("Unknown command. Use /help."); return; }
  const job=await queueJob(department,message,`telegram:${update.update_id}`,"telegram");
  await notice(`Queued for ${department}. Job ${job.id}. ${process.env.AI_OS_AI_ENABLED==="true" ? "A worker will attempt this request." : "AI is disabled; the request is saved and waiting."}`);
}

export async function processOwnerUpdates() {
  const sql=db();
  // Serialize owner routing/revision state across concurrent webhook requests.
  for(let i=0;i<5;i++) {
    const update=await sql.begin(async tx=>{
      await tx`select pg_advisory_xact_lock(730918)`;
      const stale=await tx`update os_telegram_updates set status='failed' where status='processing' and processed_at<now()-interval '2 minutes' returning update_id`;
      for(const item of stale) await tx`insert into os_activity(actor,event,entity_id,details) values('operations','telegram_update_interrupted',${String(item.update_id)},'{"manualReviewRequired":true}'::jsonb)`;
      const [busy]=await tx`select update_id from os_telegram_updates where status='processing' limit 1`;
      if(busy) return null;
      const [next]=await tx`select update_id,payload from os_telegram_updates where status='queued' order by update_id for update skip locked limit 1`;
      if(next) await tx`update os_telegram_updates set status='processing',processed_at=now() where update_id=${next.update_id}`;
      return next;
    });
    if(!update) break;
    try {
      await handleUpdate(update.payload);
      await sql`update os_telegram_updates set status='processed',processed_at=now() where update_id=${update.update_id}`;
    } catch {
      await sql`update os_telegram_updates set status='failed',processed_at=now() where update_id=${update.update_id}`;
      await queueOwnerNotice(`update-error:${update.update_id}`,"That command could not be completed. Check the Command Center before retrying an approval.");
    }
  }
}

export async function workAndNotify() {
  await processOwnerUpdates();
  await deliverOwnerNotices(1);
  const result=await workOneJob();
  if(result.jobId) {
    const [run]=result.runId ? await db()`select result from os_runs where id=${result.runId}` : [];
    await queueOwnerNotice(`job-result:${result.jobId}`,`${result.department}: ${result.status}\n\n${run?.result?.brief || "Open the Command Center to inspect the recorded failure. No automatic retry was made."}`);
    if(result.runId) {
      const approvals=await db()`select id from os_approvals where run_id=${result.runId} and status='pending'`;
      for(const a of approvals) await queueApprovalNotice(a.id);
    }
  }
  await deliverOwnerNotices(1);
  return result;
}
