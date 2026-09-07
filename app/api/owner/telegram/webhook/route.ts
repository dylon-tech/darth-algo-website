import { after } from "next/server";
import { secretMatches } from "../../../../lib/business-os/policy";
import { privateTelegramConfiguration } from "../../../../lib/business-os/delivery";
import { isPrivateOwnerUpdate } from "../../../../lib/business-os/telegram-policy";
import { recordOwnerUpdate, workAndNotify } from "../../../../lib/business-os/telegram-command";

export const runtime="nodejs";
export const maxDuration=120;
export async function POST(request:Request) {
  const config=privateTelegramConfiguration();
  if(process.env.AI_OS_ENABLED!=="true" || !config.ready) return Response.json({error:"Not available"},{status:404});
  if(!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"),process.env.AI_OS_TELEGRAM_WEBHOOK_SECRET)) return Response.json({error:"Unauthorized"},{status:401});
  const raw=await request.text();
  if(raw.length>20000) return Response.json({error:"Too large"},{status:413});
  let update; try {update=JSON.parse(raw);} catch{return Response.json({error:"Invalid JSON"},{status:400});}
  if(!isPrivateOwnerUpdate(update,config.owner)) return Response.json({ok:true,ignored:true});
  try { await recordOwnerUpdate(update); }
  catch {return Response.json({error:"Inbox unavailable"},{status:503});}
  after(async()=>{try {await workAndNotify();} catch {/* Durable inbox/jobs remain visible for recovery. */}});
  return Response.json({ok:true});
}
