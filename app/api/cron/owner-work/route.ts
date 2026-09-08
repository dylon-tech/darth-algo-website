import { coordinationTick } from "../../../lib/business-os/coordination";
import { db } from "../../../lib/affiliate-db";
import { queueJob } from "../../../lib/business-os/jobs";
import { workAndNotify } from "../../../lib/business-os/telegram-command";
import { secretMatches, type Department } from "../../../lib/business-os/policy";

export const runtime="nodejs";
export const maxDuration=120;
export async function GET(request:Request) {
  if(process.env.AI_OS_ENABLED!=="true" || process.env.AI_OS_AI_ENABLED!=="true" || process.env.AI_OS_AUTONOMY_ENABLED!=="true") return Response.json({error:"Not available"},{status:404});
  if(!secretMatches(request.headers.get("authorization"),process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) return Response.json({error:"Unauthorized"},{status:401});
  try {
    if (process.env.AI_OS_COORDINATION_ENABLED === "true") return Response.json(await coordinationTick("vercel-cron"), {headers:{"Cache-Control":"no-store"}});
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
