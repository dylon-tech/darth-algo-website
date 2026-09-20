import {ownerSessionFromRequest,privateHeaders} from "../../../lib/business-os/owner-session";
import {secretMatches} from "../../../lib/business-os/policy";
import {db} from "../../../lib/affiliate-db";
import {ensureIndicatorSchema,recordIndicatorRelease,recordPrivateIndicatorPreview} from "../../../lib/business-os/indicator-lab";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function bearer(r:Request){return process.env.AI_OS_ENABLED==="true" && secretMatches(r.headers.get("authorization"),process.env.AI_OS_OWNER_KEY?`Bearer ${process.env.AI_OS_OWNER_KEY}`:undefined);}
export async function GET(r:Request){
  if(!bearer(r) && !ownerSessionFromRequest(r))return Response.json({error:"Unauthorized"},{status:401,headers:privateHeaders});
  await ensureIndicatorSchema();
  const id=new URL(r.url).searchParams.get("id");
  if(id && !/^[a-f0-9-]{36}$/.test(id))return Response.json({error:"Invalid ID"},{status:400});
  const rows=id?await db()`select * from os_indicator_candidates where id=${id}`:await db()`select id,candidate->>'name' as name,status,score,created_at from os_indicator_candidates order by created_at desc limit 30`;
  return Response.json({candidates:rows},{headers:privateHeaders});
}
export async function POST(r:Request){
  if(!bearer(r))return Response.json({error:"Unauthorized"},{status:401,headers:privateHeaders});
  if(!r.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"JSON required"},{status:415});
  const text=await r.text();if(text.length>6000)return Response.json({error:"Too large"},{status:413});
  try{const b=JSON.parse(text);if(!/^[a-f0-9-]{36}$/.test(b.id||"") || !/^[a-f0-9]{64}$/.test(b.sourceHash||""))throw Error();
    if(b.action === "record_private_preview") return Response.json(await recordPrivateIndicatorPreview(b.id,b.sourceHash,b.preview),{headers:privateHeaders});
    if(b.action && b.action !== "record_release") throw Error("UNKNOWN_ACTION");
    return Response.json(await recordIndicatorRelease(b.id,b.sourceHash,b.tradingviewUrl,b.checks),{headers:privateHeaders});
  }catch{return Response.json({error:"RELEASE_NOT_VERIFIED",message:"Private preview requires current-source compilation, replay, a screenshot and a reopened saved chart. Release additionally requires exact-source approval and a public script URL."},{status:409,headers:privateHeaders});}
}
