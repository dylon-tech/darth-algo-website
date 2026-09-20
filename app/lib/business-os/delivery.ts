import { randomBytes, randomUUID } from "node:crypto";
import { db } from "../affiliate-db";
import type { MenuButtons } from "./telegram-ui";
import { isBufferPublication } from "./buffer-publication-policy";
import { mediaAutopilot } from "./media-policy";
import { isInstagramPublication } from "./instagram-policy";
import { ensureTelegramPanels } from "./telegram-panel";

export function privateTelegramConfiguration() {
  const token = process.env.AI_OS_TELEGRAM_TOKEN;
  const owner = process.env.AI_OS_TELEGRAM_OWNER_ID;
  const enabled = process.env.AI_OS_TELEGRAM_ENABLED === "true";
  const communityToken = process.env.TELEGRAM_BOT_TOKEN;
  const communityId = process.env.AI_OS_COMMUNITY_BOT_ID;
  const privateId = token?.split(":")[0];
  return { token, owner, ready: Boolean(enabled && token && /^\d+:[A-Za-z0-9_-]+$/.test(token) && token !== communityToken && communityId && /^\d+$/.test(communityId) && privateId !== communityId && owner && /^[1-9]\d{0,15}$/.test(owner)) };
}
export async function telegramMethod(method: "sendMessage" | "editMessageText" | "answerCallbackQuery" | "getMe" | "getWebhookInfo" | "setWebhook", body: Record<string, unknown>) {
  const config = privateTelegramConfiguration();
  if (!config.ready) throw new Error("PRIVATE_TELEGRAM_NOT_CONFIGURED");
  const response = await fetch(`https://api.telegram.org/bot${config.token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000), cache: "no-store" });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    if(method==="editMessageText" && result.error_code===400 && /message is not modified/i.test(result.description || ""))return {message_id:body.message_id};
    if(method==="editMessageText" && result.error_code===400 && /message to edit not found|message can't be edited/i.test(result.description || ""))throw new Error("TELEGRAM_EDIT_UNAVAILABLE");
    throw new Error("TELEGRAM_REQUEST_FAILED");
  }
  return result.result;
}
export async function configurePrivateWebhook() {
  const target=process.env.AI_OS_PUBLIC_URL;
  const secret=process.env.AI_OS_TELEGRAM_WEBHOOK_SECRET;
  if(!target || !secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) throw new Error("PRIVATE_WEBHOOK_NOT_CONFIGURED");
  const url=new URL(target);
  if(url.protocol!=="https:" || url.username || url.password || url.search || url.hash || !["","/"].includes(url.pathname)) throw new Error("INVALID_PUBLIC_ORIGIN");
  const bot=await telegramMethod("getMe",{});
  if(String(bot.id)!==privateTelegramConfiguration().token?.split(":")[0] || String(bot.id)===process.env.AI_OS_COMMUNITY_BOT_ID) throw new Error("BOT_ID_MISMATCH");
  const webhook=`${url.origin}/api/owner/telegram/webhook`;
  const current=await telegramMethod("getWebhookInfo",{});
  if(current.url && current.url!==webhook) throw new Error("BOT_ALREADY_HAS_ANOTHER_WEBHOOK_REVIEW_REQUIRED");
  await telegramMethod("setWebhook",{url:webhook,secret_token:secret,allowed_updates:["message","callback_query"],drop_pending_updates:false});
  await db()`insert into os_activity(actor,event,details) values('owner','private_telegram_webhook_configured',${db().json({botId:bot.id,url:webhook})})`;
  return {configured:true,bot:{id:bot.id,username:bot.username},webhook};
}
type Buttons = MenuButtons;
export async function queueOwnerNotice(key: string, text: string, buttons?: Buttons) {
  // All notices are addressed at send time to the configured owner, never to
  // a chat_id supplied in model output or an unauthenticated update.
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length) {
    let end = Math.min(3500, remaining.length);
    if (end < remaining.length && /[\uD800-\uDBFF]/.test(remaining[end - 1])) end--;
    chunks.push(remaining.slice(0,end)); remaining = remaining.slice(end);
  }
  const sql = db();
  for (let i=0;i<chunks.length;i++) await sql`insert into os_outbox(id,dedupe_key,body,buttons) values(${randomUUID()},${`${key}:${i}`},${chunks[i]},${buttons && i===chunks.length-1 ? sql.json(buttons) : null}) on conflict do nothing`;
}
export async function queueApprovalNotice(id: string) {
  const sql = db();
  const [approval] = await sql`select * from os_approvals where id=${id} and status='pending' and expires_at>now()`;
  if (!approval) return;
  const indicator=approval.payload.executor==="indicator_release_v1";
  if(indicator && approval.payload.policyVersion!==2)return;
  const buttons: Buttons = [[]];
  const instagram = isInstagramPublication(approval.payload);
  const publication = isBufferPublication(approval.payload) || instagram;
  const network = instagram ? "Instagram" : "X";
  if(mediaAutopilot.enabled && publication)return;
  for (const [decision,label] of [["approved","Approve plan"],["revision_requested","Revise"],["declined","Decline"]] as const) {
    if(indicator && decision==="revision_requested")continue;
    const token = randomBytes(16).toString("hex");
    await sql`insert into os_callback_actions(id,approval_id,payload_hash,decision,expires_at) values(${token},${id},${approval.payload_hash},${decision},${approval.expires_at})`;
    buttons[0].push({text:approval.payload.executor==="indicator_release_v1" && decision==="approved" ? "Approve package" : publication && decision==="approved" ? `Approve & publish on ${network}` : label,callback_data:`os:${token}`});
  }
  if(indicator)buttons.push([{text:"Preview & try indicator",url:`https://www.darthalgo.com/owner/indicators/${approval.payload.candidateId}`}]);
  await queueOwnerNotice(`approval:${id}`, `OWNER DECISION\n${approval.payload.summary}\n${publication && approval.run_id ? "Prepared by Content. Review the wording and product facts before approving.\n" : ""}\n${approval.payload.details}\n\nEvidence: ${(approval.payload.evidence || []).join(", ")}\nExpires: ${new Date(approval.expires_at).toISOString()}\n${publication ? `Approving publishes ${instagram ? "these exact slides and caption" : "this exact text"} publicly on the displayed ${network} account now.` : indicator ? "Approval authorizes this exact indicator, instruction image and educational post. It queues the release; TradingView publishing is awaiting its worker connection." : "Approval records your decision; this proposal does not execute an external action."}`, buttons);
}
export async function deliverOwnerNotices(limit=4) {
  const config = privateTelegramConfiguration();
  if (!config.ready) return { sent:0, status:"not_configured" };
  await ensureTelegramPanels();
  const sql = db();
  let sent=0;
  for (let i=0;i<limit;i++) {
    const item = await sql.begin(async tx => {
      await tx`select pg_advisory_xact_lock(730917)`;
      const stale = await tx`update os_outbox set status='unknown',error_code='DELIVERY_UNCONFIRMED' where status='sending' and claimed_at<now()-interval '2 minutes' returning id`;
      for(const row of stale) await tx`insert into os_activity(actor,event,entity_id,details) values('operations','delivery_unconfirmed',${row.id},'{"automaticRetry":false}'::jsonb)`;
      const [busy] = await tx`select id from os_outbox where status='sending' limit 1`;
      if (busy) return null;
      const [next] = await tx`select * from os_outbox where status='queued' order by sequence for update skip locked limit 1`;
      if (!next) return null;
      await tx`update os_outbox set status='sending',claimed_at=now() where id=${next.id}`;
      return next;
    });
    if (!item) break;
    try {
      const target=item.panel_target;
      const [panel]=target ? await sql`select * from os_telegram_panels where owner_id=${config.owner!}` : [];
      if(target && (target.owner!==config.owner || !panel || panel.session_id!==target.session || Number(panel.revision)!==target.revision)) {
        await sql`update os_outbox set status='failed',error_code='PANEL_SUPERSEDED' where id=${item.id}`;
        continue;
      }
      const body={chat_id:config.owner,text:item.body,link_preview_options:{is_disabled:true},...(item.buttons ? {reply_markup:{inline_keyboard:item.buttons}} : {})};
      let edited=false,result;
      if(target && panel.message_id) {
        try {result=await telegramMethod("editMessageText",{...body,message_id:Number(panel.message_id)});edited=true;}
        catch(error) {if(!(error instanceof Error) || error.message!=="TELEGRAM_EDIT_UNAVAILABLE")throw error;}
      }
      if(!result)result=await telegramMethod("sendMessage",body);
      await sql.begin(async tx => {
        await tx`update os_outbox set status='sent',sent_at=now(),provider_message_id=${result.message_id} where id=${item.id} and status='sending'`;
        await tx`insert into os_activity(actor,event,entity_id,details) values('operations','owner_notice_sent',${item.id},'{}'::jsonb)`;
        if(target)await tx`update os_telegram_panels set message_id=${result.message_id} where owner_id=${config.owner!} and session_id=${target.session} and (revision=${target.revision} or message_id is null)`;
      });
      console.info(JSON.stringify({event:"owner_telegram_delivery",mode:edited?"edit":"send",panel:Boolean(target),status:"sent"}));
      sent++;
    } catch {
      // Timeout may mean Telegram accepted the message. Do not blindly replay.
      await sql`update os_outbox set status='unknown',error_code='DELIVERY_UNCONFIRMED' where id=${item.id} and status='sending'`;
      break;
    }
  }
  return {sent,status:"checked"};
}
