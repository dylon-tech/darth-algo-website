import { after } from "next/server";
import { db } from "../../../lib/affiliate-db";
import { ownerSessionFromRequest, privateHeaders, sameOrigin } from "../../../lib/business-os/owner-session";
import { readiness } from "../../../lib/business-os/readiness";
import { status, decide } from "../../../lib/business-os/service";
import { initializeOS } from "../../../lib/business-os/schema";
import { cancelJob, queueJob, setPaused } from "../../../lib/business-os/jobs";
import { workAndNotify } from "../../../lib/business-os/telegram-command";
import { departments, type Department } from "../../../lib/business-os/policy";
import { createDailyBrief } from "../../../lib/business-os/brief";
import { configurePrivateWebhook, deliverOwnerNotices, privateTelegramConfiguration, telegramMethod } from "../../../lib/business-os/delivery";
import { bufferStatus } from "../../../lib/business-os/buffer";
import { testBufferDraft } from "../../../lib/business-os/buffer-test";
import { prepareBufferPublication, checkBufferPublication, executeBufferPublication } from "../../../lib/business-os/buffer-publishing";

import { checkInstagramPublication, executeInstagramPublication } from "../../../lib/business-os/instagram-publishing";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=120;
const json=(body:unknown,code=200)=>Response.json(body,{status:code,headers:privateHeaders});
export async function GET(request:Request) {
  if(!ownerSessionFromRequest(request)) return json({error:"Unauthorized"},401);
  const view=new URL(request.url).searchParams.get("view");
  try {
    if(view==="readiness") return json(await readiness());
    if(view && view!=="status") return json({error:"Unknown view"},400);
    return json(await status());
  } catch {return json({error:"STORE_NOT_READY",message:"Run connection checks, then initialize the OS tables."},503);}
}
export async function POST(request:Request) {
  if(!ownerSessionFromRequest(request)) return json({error:"Unauthorized"},401);
  if(!sameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) return json({error:"Same-origin JSON required"},403);
  const raw=await request.text(); if(raw.length>12000) return json({error:"Request too large"},413);
  let body; try{body=JSON.parse(raw);}catch{return json({error:"Invalid JSON"},400);}
  if(!body || typeof body!=="object") return json({error:"Invalid request"},400);
  try {
    if(body.operation==="initialize") {await initializeOS(); return json({initialized:true});}
    if(body.operation==="pause" && typeof body.paused==="boolean") return json(await setPaused(body.paused));
    if(body.operation==="brief") return json(await createDailyBrief());
    if(body.operation==="work") {after(async()=>{try{await workAndNotify();}catch{}}); return json({workerRequested:true});}
    if(body.operation==="message") {
      if(!departments.includes(body.department) || typeof body.message!=="string" || typeof body.requestKey!=="string") return json({error:"Invalid message"},400);
      const job=await queueJob(body.department,body.message,body.requestKey,"owner");
      after(async()=>{try{await workAndNotify();}catch{}}); return json(job);
    }
    if(body.operation==="run_task" && /^[0-9a-f-]{36}$/.test(body.id || "")) {
      const [task]=await db()`select * from os_tasks where id=${body.id} and status in ('queued','blocked')`;
      if(!task) return json({error:"Task unavailable"},409);
      if(typeof body.requestKey!=="string") return json({error:"Request key required"},400);
      const job=await queueJob(task.department as Department,`Prepare an internal deliverable for this task: ${task.title}. Do not perform external actions.`,body.requestKey,"owner",task.id);
      after(async()=>{try{await workAndNotify();}catch{}}); return json(job);
    }
    if(body.operation==="cancel_job" && /^[0-9a-f-]{36}$/.test(body.id || "")) return json(await cancelJob(body.id));
    if(body.operation==="decide") {
      if(!/^[0-9a-f-]{36}$/.test(body.id || "") || !/^[a-f0-9]{64}$/.test(body.payloadHash || "") || !["approved","declined","revision_requested"].includes(body.decision) || typeof body.note!=="string" || body.note.length>2000) return json({error:"Invalid decision"},400);
      if(body.decision==="revision_requested" && !body.note.trim()) return json({error:"Describe the requested revision"},400);
      return json(await decide(body.id,body.payloadHash,body.decision,body.note));
    }
    if(body.operation==="buffer_check") return json(await bufferStatus());
    if(body.operation==="buffer_draft_test") return json(await testBufferDraft());
    if(body.operation==="buffer_prepare") {
      if(typeof body.text!=="string" || !body.text.trim() || body.text.length>280) return json({error:"Use 1–280 characters for this text post."},400);
      return json(await prepareBufferPublication(body.text));
    }
    if(body.operation==="buffer_receipt" || body.operation==="buffer_publish_approved") {
      if(!/^[0-9a-f-]{36}$/.test(body.id || "") || !/^[a-f0-9]{64}$/.test(body.payloadHash || "")) return json({error:"Invalid approval"},400);
      return json(await (body.operation==="buffer_receipt" ? checkBufferPublication(body.id,body.payloadHash) : executeBufferPublication(body.id,body.payloadHash)));
    }
    if(body.operation==="instagram_receipt" || body.operation==="instagram_publish_approved") {
      if(!/^[0-9a-f-]{36}$/.test(body.id || "") || !/^[a-f0-9]{64}$/.test(body.payloadHash || "")) return json({error:"Invalid approval"},400);
      return json(await (body.operation==="instagram_receipt" ? checkInstagramPublication(body.id,body.payloadHash) : executeInstagramPublication(body.id,body.payloadHash)));
    }
    if(body.operation==="telegram_check") {
      const config=privateTelegramConfiguration(); if(!config.ready) return json({error:"PRIVATE_TELEGRAM_NOT_CONFIGURED"},409);
      const [bot,webhook]=await Promise.all([telegramMethod("getMe",{}),telegramMethod("getWebhookInfo",{})]);
      return json({bot:{id:bot.id,username:bot.username},webhook:{url:webhook.url,pendingUpdates:webhook.pending_update_count,lastErrorAt:webhook.last_error_date || null}});
    }
    if(body.operation==="telegram_connect") return json(await configurePrivateWebhook());
    if(body.operation==="deliver") return json(await deliverOwnerNotices());
    return json({error:"Unknown operation"},400);
  } catch (error) {
    const code=error instanceof Error ? error.message : "";
    const messages: Record<string,string>={BUFFER_DRAFT_TEST_REQUIRED:"Run the private Buffer draft test first.",BUFFER_PUBLICATION_ALREADY_APPROVED:"This exact post already has an approval. Check its saved receipt in Approvals; do not create a duplicate.",BUFFER_X_NOT_READY:"Check the X connection in Settings before preparing a post.",OS_PAUSED:"Work is paused. Resume it in Settings before sending an approved post.",BUFFER_APPROVAL_EXPIRED:"This approval expired before publishing started. It cannot send a new post."};
    return json({error:"OPERATION_NOT_COMPLETED",message:messages[code] || "The operation could not be confirmed. Check Approvals, activity and any saved Buffer receipt before retrying."},409);
  }
}
