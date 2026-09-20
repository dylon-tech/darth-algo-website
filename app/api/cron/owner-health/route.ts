import {secretMatches} from "../../../lib/business-os/policy";
import {monitorRuntime} from "../../../lib/business-os/runtime-health";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(request:Request){
  if(!secretMatches(request.headers.get("authorization"),process.env.CRON_SECRET?`Bearer ${process.env.CRON_SECRET}`:undefined))return Response.json({error:"Unauthorized"},{status:401});
  try{return Response.json(await monitorRuntime(),{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({status:"unavailable"},{status:503});}
}
