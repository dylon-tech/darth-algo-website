import { db } from "../affiliate-db";
import { bufferStatus, createBufferXPost, getBufferPost } from "./buffer";

// One durable test per channel. A lost response must never create another post.
// This operation can only save the fixed test text as a Buffer draft.
export async function testBufferDraft() {
  const connection = await bufferStatus();
  if (!connection.ready || !connection.xChannel) throw new Error(connection.error || "BUFFER_X_NOT_READY");
  const channelId = connection.xChannel.id;
  const key = `buffer-draft-test:${channelId}:v1`;
  const text = `Darth Algo connection test. Draft only — do not publish. [${key}]`;
  const sql = db();
  const claim = await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(730918)`;
    const [existing] = await tx`select details from os_activity where entity_id=${key} and event='buffer_draft_test_started' limit 1`;
    const [receipt] = await tx`select details from os_activity where entity_id=${key} and event='buffer_draft_test_receipt' order by id desc limit 1`;
    if (existing) return { claimed: false, postId: receipt?.details?.postId as string | undefined };
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','buffer_draft_test_started',${key},${tx.json({ channelId })})`;
    return { claimed: true, postId: undefined as string | undefined };
  });
  let postId = claim.postId;
  if (!claim.claimed && !postId) return { verified: false, message: "An earlier Buffer draft test is in progress or its outcome is unknown. Check Buffer drafts before doing anything else; no second post was created." };
  if (claim.claimed) {
    try {
      const post = await createBufferXPost({ text, channelId, saveToDraft: true });
      postId = post.id;
      // Persist the receipt before a readback that may fail independently.
      await sql`insert into os_activity(actor,event,entity_id,details) values('owner','buffer_draft_test_receipt',${key},${sql.json({ postId, channelId })})`;
    } catch {
      return { verified: false, message: "Buffer draft creation could not be confirmed. Check Buffer drafts before retrying; automatic recreation is blocked." };
    }
  }
  try {
    const post = await getBufferPost(postId!);
    const verified = post.id === postId && post.channelId === channelId && post.text === text && post.status === "draft" && !post.sentAt;
    if (verified) await sql`insert into os_activity(actor,event,entity_id,details) values('owner','buffer_draft_test_verified',${key},${sql.json({ postId, channelId, status: post.status })})`;
    return { verified, postId, providerStatus: post.status,
      message: verified ? "Buffer bridge verified: the test draft was saved and read back from your X channel. Nothing was scheduled or published."
        : "Buffer returned an unexpected post state. Review the test in Buffer; no second post was created." };
  } catch {
    return { verified: false, postId, message: "Buffer returned a post receipt, but readback is unavailable. Check again to read that same post; it will not be recreated." };
  }
}
