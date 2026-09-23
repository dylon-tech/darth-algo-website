import {ownerSessionFromRequest,privateHeaders} from "../../../../../../lib/business-os/owner-session";
import {readIndicatorCapture} from "../../../../../../lib/business-os/indicator-captures";
import {secretMatches} from "../../../../../../lib/business-os/policy";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string;captureId:string}>}) {
  const operator=process.env.AI_OS_ENABLED==="true" && secretMatches(request.headers.get("authorization"),process.env.AI_OS_OWNER_KEY?`Bearer ${process.env.AI_OS_OWNER_KEY}`:undefined);
  if(!operator && !ownerSessionFromRequest(request))return Response.json({error:"Unauthorized"},{status:401,headers:privateHeaders});
  const {id,captureId}=await params;
  if(![id,captureId].every(v=>/^[a-f0-9-]{36}$/.test(v)))return new Response(null,{status:404,headers:privateHeaders});
  const capture=await readIndicatorCapture(id,captureId);
  if(!capture)return new Response(null,{status:404,headers:privateHeaders});
  return new Response(new Uint8Array(capture.image_bytes),{headers:{...privateHeaders,"Content-Type":capture.image_mime,"Content-Length":String(capture.image_bytes.length),"Content-Disposition":`inline; filename="indicator-preview-${captureId}.${capture.image_mime==="image/png"?"png":"jpg"}"`,"X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox","Vary":"Cookie, Authorization","X-Indicator-Source-Hash":capture.source_hash,"X-Image-SHA256":capture.image_hash}});
}
