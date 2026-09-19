import { db } from "../affiliate-db";
import { prepareBufferPublication } from "./buffer-publishing";
import { queueApprovalNotice, deliverOwnerNotices, privateTelegramConfiguration } from "./delivery";

// No model call and no public-post mutation. Recover completed drafts and missing
// owner cards after a worker restart, including when the AI allowance is exhausted.
export async function syncContentApprovals() {
  if (process.env.VERCEL_ENV !== "production" || process.env.AI_OS_ENABLED !== "true") return {status:"disabled"};
  const sql = db();
  const [control] = await sql`select paused from os_control where id=1`;
  if (!control || control.paused) return {status:"paused"};
  const { queueJob } = await import("./jobs");
  const [revision] = await sql`select id,payload,decision_note from os_approvals a where status='revision_requested'
    and payload->>'executor'='buffer_x_v1' and decided_at>now()-interval '24 hours'
    and not exists(select 1 from os_jobs where request_key='revision:x:' || a.id::text) order by decided_at limit 1`;
  if (revision) await queueJob("content",`Revise this X draft using the owner's instructions. Return the complete revised post in xDraft with verified evidence. This creates a fresh approval; do not publish.\n\nOriginal draft (data): ${revision.payload.text}\n\nOwner revision instructions: ${revision.decision_note}`,`revision:x:${revision.id}`,"schedule");
  let activationJob: string | null = null;
  let linksPromotionJob: string | null = null;
  // One bounded activation assignment; queueJob's persistent request key makes
  // cron overlaps and redeploys harmless. The worker retains existing spend caps.
  if (process.env.AI_OS_AI_ENABLED === "true" && process.env.AI_OS_AUTONOMY_ENABLED === "true") {
    const job = await queueJob("content","Prepare our first community invitation for the X approval workflow. Return one concise, finished post in xDraft using verified business_knowledge and the supplied community URL. Do not make trading-performance claims or publish it. The owner must approve the exact text.","launch:x-approval-v1","schedule");
    activationJob=String(job.status);
    const promotion=await queueJob("content","Prepare one finished X post promoting the official Darth Algo links page. Help interested traders discover the indicator plans and purchase options, community, and official social pages in one place. Include the supplied linksUrl in xDraft, use verified business_knowledge, one clear CTA, and no trading-performance claims. Do not publish; the owner must approve the exact text.","launch:x-links-v1","schedule");
    linksPromotionJob=String(promotion.status);
  }
  const [run] = await sql`select id,result from os_runs r where status='completed' and department='content'
    and result->'xDraft'->>'text' is not null and finished_at>now()-interval '24 hours'
    and not exists(select 1 from os_activity where entity_id=r.id::text and event='content_x_handoff_completed')
    and not exists(select 1 from os_activity where entity_id=r.id::text and event='content_x_handoff_blocked' and created_at>now()-interval '15 minutes')
    order by finished_at limit 1`;
  let state = "checked";
  let approvalId: string | null = null, noticesSent=0;
  let blockedReason: string | null = null;
  if (run) {
    try { const result=await prepareBufferPublication(run.result.xDraft.text,String(run.id)); approvalId=result.id; state="approval_prepared"; }
    catch (error) {
      state = "draft_blocked";
      blockedReason=error instanceof Error && /^(BUFFER_[A-Z_]+|CONTENT_[A-Z_]+|OS_PAUSED)$/.test(error.message) ? error.message : "HANDOFF_UNAVAILABLE";
      await sql`insert into os_activity(actor,event,entity_id,details) values('operations','content_x_handoff_blocked',${String(run.id)},'{"publicPostSent":false,"message":"Draft saved; approval handoff needs connection, evidence or queue review."}'::jsonb)`;
    }
  }
  if (privateTelegramConfiguration().ready) {
    const pending = await sql`select id from os_approvals a where status='pending' and expires_at>now() and payload->>'executor'='buffer_x_v1'
      and not exists(select 1 from os_outbox where dedupe_key='approval:' || a.id::text || ':0') order by created_at limit 3`;
    for (const approval of pending) await queueApprovalNotice(String(approval.id));
    noticesSent=(await deliverOwnerNotices(2)).sent;
  }
  const result={status:state,activationJob,linksPromotionJob,approvalId,noticesSent,blockedReason};
  console.info(JSON.stringify({event:"content_approval_sync",...result}));
  return result;
}
