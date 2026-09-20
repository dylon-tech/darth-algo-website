import { syncTelegramDesk } from "../../../lib/business-os/telegram-panel";
import { coordinationTick } from "../../../lib/business-os/coordination";
import { syncContentApprovals } from "../../../lib/business-os/content-handoff";
import { syncMediaAutopilot } from "../../../lib/business-os/media-autopilot";
import { db } from "../../../lib/affiliate-db";
import { queueJob } from "../../../lib/business-os/jobs";
import { workAndNotify } from "../../../lib/business-os/telegram-command";
import { secretMatches, type Department } from "../../../lib/business-os/policy";

export const runtime="nodejs";
export const maxDuration=120;
export async function GET(request:Request) {
  if(process.env.AI_OS_ENABLED!=="true") return Response.json({error:"Not available"},{status:404});
  if(!secretMatches(request.headers.get("authorization"),process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) return Response.json({error:"Unauthorized"},{status:401});
  try {
    const {heartbeat}=await import("../../../lib/business-os/coordination");
    await heartbeat("vercel-cron","checking");
    const {processOwnerUpdates}=await import("../../../lib/business-os/telegram-command");
    const {deliverOwnerNotices}=await import("../../../lib/business-os/delivery");
    await processOwnerUpdates();
    await deliverOwnerNotices(2);
    try {const {syncVidiqResearch}=await import("../../../lib/business-os/vidiq-research");console.info(JSON.stringify({event:"vidiq_research_tick",...await syncVidiqResearch()}));}
    catch {console.warn(JSON.stringify({event:"vidiq_research_tick",status:"blocked"}));}
    try {const {syncIndicatorLab}=await import("../../../lib/business-os/indicator-lab");console.info(JSON.stringify({event:"indicator_lab_tick",...await syncIndicatorLab()}));}
    catch {console.warn(JSON.stringify({event:"indicator_lab_tick",status:"blocked"}));}
    if(process.env.AI_OS_AI_ENABLED!=="true" || process.env.AI_OS_AUTONOMY_ENABLED!=="true") {
      await heartbeat("vercel-cron","ai_disabled");return Response.json({status:"ai_disabled"});
    }
    try {console.info(JSON.stringify({event:"telegram_desk_sync",...await syncTelegramDesk()}));}
    catch {console.warn(JSON.stringify({event:"telegram_desk_sync",status:"needs_check"}));}
    await syncContentApprovals();
    try {console.info(JSON.stringify({event:"media_autopilot_sync",...await syncMediaAutopilot()}));}
    catch(error){console.warn(JSON.stringify({event:"media_autopilot_sync",status:"blocked",code:error instanceof Error && /^(INSTAGRAM_|BUFFER_|AI_)[A-Z0-9_]+$/.test(error.message)?error.message:"MEDIA_SYNC_BLOCKED"}));}
    if (process.env.AI_OS_COORDINATION_ENABLED === "true") {
      const result=await coordinationTick("vercel-cron");
      console.info(JSON.stringify({event:"owner_work_tick",status:result.status,reason:"reason" in result ? result.reason : null}));
      return Response.json(result, {headers:{"Cache-Control":"no-store"}});
    }
    const [control]=await db()`select paused from os_control where id=1`;
    if(!control || control.paused) return Response.json({status:"paused"});
    const [queued]=await db()`select id from os_jobs where status in ('queued','running') limit 1`;
    if(!queued) {
      const [task]=await db()`select id,department,title from os_tasks where status='queued' order by priority,created_at limit 1`;
      const day=new Date().toISOString().slice(0,10);
      await queueJob(task?.department as Department || "ceo",task ? `Prepare an internal deliverable for: ${task.title}. External actions need approval.` : "Review current business evidence, identify customer activation or retention problems, and prioritize measurable acquisition and referral work.",`daily-work:${day}`,"schedule",task?.id);
    }
    return Response.json(await workAndNotify(),{headers:{"Cache-Control":"no-store"}});
  } catch{return Response.json({error:"WORK_NOT_COMPLETED"},{status:503});}
}
