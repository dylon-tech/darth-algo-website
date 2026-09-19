import { randomUUID } from "node:crypto";
import { db } from "../affiliate-db";
import { bufferStatus, createBufferXPost, getBufferPost } from "./buffer";
import { bufferPublicationPayload, isBufferPublication, type BufferPublication } from "./buffer-publication-policy";
import { fingerprint, validatePlan } from "./policy";

// Existing durable approval/activity tables avoid an activation-time migration.
// Every writer locks the approval row before recording its single attempt.
export async function prepareBufferPublication(text: string, sourceRunId?: string) {
  if (process.env.VERCEL_ENV !== "production") throw new Error("BUFFER_PUBLISH_PRODUCTION_ONLY");
  if (typeof text !== "string") throw new Error("BUFFER_PUBLICATION_TEXT_INVALID");
  const connection = await bufferStatus();
  if (!connection.ready || !connection.xChannel) throw new Error("BUFFER_X_NOT_READY");
  const channel = connection.xChannel;
  const payload = bufferPublicationPayload(text.trim(), channel.id, channel.displayName || channel.name || "X");
  const hash = fingerprint(payload);
  const sql = db();
  return sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(730919)`;
    if (sourceRunId) {
      const [run] = await tx`select * from os_runs where id=${sourceRunId} for update`;
      if (!run || run.status !== "completed" || run.department !== "content" || !Array.isArray(run.snapshot)) throw new Error("CONTENT_DRAFT_RUN_INVALID");
      const verifiedIds = run.snapshot.filter((e: {status:string})=>e.status==="verified").map((e: {id:string})=>e.id);
      // Validate the stored draft again, not caller/model supplied destinations.
      const plan = validatePlan(run.result,run.snapshot.map((e: {id:string})=>e.id));
      if (!plan.xDraft || plan.xDraft.text !== text || !plan.xDraft.evidence.every(id=>verifiedIds.includes(id))) throw new Error("CONTENT_DRAFT_EVIDENCE_INVALID");
      const [done] = await tx`select details from os_activity where entity_id=${sourceRunId} and event='content_x_handoff_completed' limit 1`;
      if (done) return {id:String(done.details.approvalId),message:"This draft already has an approval record."};
      const [control] = await tx`select paused from os_control where id=1 for share`;
      if (!control || control.paused) throw new Error("OS_PAUSED");
      const [waiting] = await tx`select count(*)::int as n from os_approvals where payload->>'executor'='buffer_x_v1' and status='pending' and expires_at>now()`;
      if (waiting.n >= 3) throw new Error("CONTENT_APPROVAL_QUEUE_FULL");
    }
    const [verified] = await tx`select id from os_activity where event='buffer_draft_test_verified' and details->>'channelId'=${channel.id} limit 1`;
    if (!verified) throw new Error("BUFFER_DRAFT_TEST_REQUIRED");
    // Even a new approval cannot silently retry an uncertain earlier delivery.
    const [previous] = await tx`select id,status,expires_at from os_approvals where payload->>'executor'='buffer_x_v1' and payload->>'channelId'=${channel.id} and payload->>'text'=${payload.text} and status in ('pending','approved') order by created_at desc limit 1`;
    if (previous?.status === "approved" || (previous && new Date(previous.expires_at).getTime() > Date.now())) {
      if(sourceRunId) await tx`insert into os_activity(actor,event,entity_id,details) values('content','content_x_handoff_completed',${sourceRunId},${tx.json({approvalId:previous.id,reused:true})})`;
      else if(previous.status === "approved") throw new Error("BUFFER_PUBLICATION_ALREADY_APPROVED");
      return { id: String(previous.id), message: "This exact post already has an approval record." };
    }
    await tx`update os_approvals set status='expired' where status='pending' and expires_at<=now()`;
    const id = randomUUID();
    await tx`insert into os_approvals(id,payload,payload_hash,expires_at) values(${id},${tx.json(payload)},${hash},now()+interval '24 hours')`;
    if (sourceRunId) {
      await tx`update os_approvals set run_id=${sourceRunId} where id=${id}`;
      await tx`insert into os_activity(actor,event,entity_id,details) values('content','content_x_handoff_completed',${sourceRunId},${tx.json({approvalId:id})})`;
    }
    if(sourceRunId) await tx`insert into os_activity(actor,event,entity_id,details) values('content','buffer_publication_prepared',${id},${tx.json({payloadHash:hash,channelId:channel.id,sourceRunId})})`;
    else await tx`insert into os_activity(actor,event,entity_id,details) values('owner','buffer_publication_prepared',${id},${tx.json({payloadHash:hash,channelId:channel.id})})`;
    return { id, message: "Post saved for review. Open Approvals to approve the exact text and publish it on X." };
  });
}

function approvedPayload(row: Record<string, unknown> | undefined, hash: string): BufferPublication {
  if (!row || row.status !== "approved" || row.decided_by !== "owner") throw new Error("BUFFER_APPROVAL_REQUIRED");
  if (row.payload_hash !== hash || fingerprint(row.payload) !== hash || !isBufferPublication(row.payload)) throw new Error("BUFFER_APPROVAL_VERSION_CHANGED");
  return row.payload;
}

async function readReceipt(id: string, hash: string, payload: BufferPublication, postId: string) {
  const sql = db();
  try {
    const post = await getBufferPost(postId);
    if (!post || post.id !== postId || post.channelId !== payload.channelId || post.text !== payload.text) throw new Error("BUFFER_RECEIPT_MISMATCH");
    const published = post.status === "sent" && Boolean(post.sentAt);
    const details = { payloadHash: hash, channelId: payload.channelId, postId, state: post.status, published, sentAt: post.sentAt || null, checkedAt: new Date().toISOString() };
    await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_checked',${id},${sql.json(details)})`;
    return { ...details, message: published ? "Buffer confirms this exact post was published on X."
      : post.status === "sending" || post.status === "scheduled" ? "Buffer has the post. Publication is not confirmed yet; check its receipt again shortly."
      : "Buffer has the post, but has not confirmed publication. Review its status in Buffer. It will not be submitted again." };
  } catch {
    return { postId, state: "unconfirmed", published: false, message: "The Buffer receipt is saved, but its current state could not be verified. Check the receipt again; this only reads the existing post." };
  }
}

export async function executeBufferPublication(id: string, hash: string) {
  if (process.env.VERCEL_ENV !== "production") throw new Error("BUFFER_PUBLISH_PRODUCTION_ONLY");
  const sql = db();
  const claim = await sql.begin(async tx => {
    const [row] = await tx`select * from os_approvals where id=${id} for update`;
    const payload = approvedPayload(row, hash);
    const [prepared] = await tx`select id from os_activity where entity_id=${id} and event='buffer_publication_prepared' and details->>'payloadHash'=${hash} limit 1`;
    if (!prepared) throw new Error("BUFFER_PREPARED_APPROVAL_REQUIRED");
    const [receipt] = await tx`select details from os_activity where entity_id=${id} and event='buffer_publish_receipt' order by id desc limit 1`;
    if (receipt) return { payload, claimed: false, postId: String(receipt.details.postId) };
    const [started] = await tx`select id from os_activity where entity_id=${id} and event='buffer_publish_started' limit 1`;
    if (started) return { payload, claimed: false, postId: undefined };
    if (new Date(row!.expires_at).getTime() <= Date.now()) throw new Error("BUFFER_APPROVAL_EXPIRED");
    const [control] = await tx`select paused from os_control where id=1 for share`;
    if (!control || control.paused) throw new Error("OS_PAUSED");
    const [verified] = await tx`select id from os_activity where event='buffer_draft_test_verified' and details->>'channelId'=${payload.channelId} limit 1`;
    if (!verified) throw new Error("BUFFER_DRAFT_TEST_REQUIRED");
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','buffer_publish_started',${id},${tx.json({payloadHash:hash,channelId:payload.channelId,state:"sending"})})`;
    return { payload, claimed: true, postId: undefined };
  });
  if (claim.postId) return readReceipt(id, hash, claim.payload, claim.postId);
  if (!claim.claimed) return { state: "unknown", published: false, message: "This post has already been submitted or its first attempt is still running. Check Buffer before taking further action. Duplicate submission is blocked." };
  let postId: string;
  try {
    // Adapter revalidates the selected live channel; never accepts caller-supplied
    // text, mode or account here. Claim commits before the external mutation.
    const post = await createBufferXPost({ text: claim.payload.text, channelId: claim.payload.channelId, mode: "shareNow", saveToDraft: false });
    postId = post.id;
    await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_receipt',${id},${sql.json({payloadHash:hash,channelId:claim.payload.channelId,postId,state:"accepted"})})`;
  } catch {
    try { await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_unknown',${id},${sql.json({payloadHash:hash,state:"unknown"})})`; } catch { /* The durable started event still blocks replay. */ }
    return { state: "unknown", published: false, message: "Publication could not be confirmed. Check Buffer and X; this post will not be submitted again automatically." };
  }
  return readReceipt(id, hash, claim.payload, postId);
}

// Read-only reconciliation, allowed even after expiry or while paused.
export async function checkBufferPublication(id: string, hash: string) {
  const sql = db();
  const [row] = await sql`select * from os_approvals where id=${id}`;
  const payload = approvedPayload(row, hash);
  const [receipt] = await sql`select details from os_activity where entity_id=${id} and event='buffer_publish_receipt' order by id desc limit 1`;
  if (!receipt) return { state: "unknown", published: false, message: "No Buffer receipt was saved. Check Buffer and X directly before taking further action. This check does not send a post." };
  return readReceipt(id, hash, payload, String(receipt.details.postId));
}
