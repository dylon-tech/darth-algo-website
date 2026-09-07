import { createDailyBrief } from "../../../lib/business-os/brief";
import { deliverOwnerNotices } from "../../../lib/business-os/delivery";
import { secretMatches } from "../../../lib/business-os/policy";

export const runtime="nodejs";
export const maxDuration=120;
export async function GET(request:Request) {
  if(process.env.AI_OS_ENABLED!=="true" || process.env.AI_OS_DAILY_BRIEF_ENABLED!=="true") return Response.json({error:"Not available"},{status:404});
  if(!secretMatches(request.headers.get("authorization"),process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) return Response.json({error:"Unauthorized"},{status:401});
  try {const brief=await createDailyBrief(); const delivery=await deliverOwnerNotices(); return Response.json({day:brief.day,delivery},{headers:{"Cache-Control":"no-store"}});}
  catch{return Response.json({error:"BRIEF_NOT_COMPLETED"},{status:503});}
}
