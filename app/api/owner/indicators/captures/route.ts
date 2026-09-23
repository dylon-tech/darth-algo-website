import {ownerSessionFromRequest,privateHeaders,sameOrigin} from "../../../../lib/business-os/owner-session";
import {secretMatches} from "../../../../lib/business-os/policy";
import {maxCaptureBytes,saveIndicatorCapture} from "../../../../lib/business-os/indicator-captures";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:privateHeaders});

export async function POST(request:Request) {
  const operator=process.env.AI_OS_ENABLED==="true" && secretMatches(request.headers.get("authorization"),process.env.AI_OS_OWNER_KEY?`Bearer ${process.env.AI_OS_OWNER_KEY}`:undefined);
  if(!operator && !ownerSessionFromRequest(request))return reply({error:"Unauthorized"},401);
  if(!operator && !sameOrigin(request))return reply({error:"Same-origin request required"},403);
  const contentType=request.headers.get("content-type")||"";
  if(!contentType.startsWith("multipart/form-data;"))return reply({error:"Upload a PNG or JPEG screenshot"},415);
  const limit=maxCaptureBytes+16000;
  if(Number(request.headers.get("content-length"))>limit)return reply({error:"Screenshot must be 2 MB or smaller"},413);
  try {
    // Bound streamed bodies too; Content-Length can be absent or untrusted.
    const reader=request.body?.getReader();if(!reader)return reply({error:"Upload required"},400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return reply({error:"Screenshot must be 2 MB or smaller"},413);}chunks.push(value);}
    const form=await new Response(Buffer.concat(chunks),{headers:{"Content-Type":contentType}}).formData();
    const image=form.get("image");if(!(image instanceof File))return reply({error:"Screenshot required"},400);
    const id=form.get("id"),hash=form.get("sourceHash"),metadata=form.get("metadata");
    if(typeof id!=="string" || typeof hash!=="string" || typeof metadata!=="string" || metadata.length>6000)return reply({error:"Version and chart details required"},400);
    // Browser submissions cannot certify themselves as agent validation.
    const origin=operator && form.get("origin")==="assisted_browser"?"assisted_browser":"owner_submission";
    return reply(await saveIndicatorCapture(id,hash,Buffer.from(await image.arrayBuffer()),JSON.parse(metadata),origin));
  } catch(error) {
    const code=error instanceof Error?error.message:"INVALID_CAPTURE";
    const allowed=["INVALID_VERSION","INVALID_CAPTURE_METADATA","INVALID_CAPTURE_TIME","INVALID_CAPTURE_CHECKS","INVALID_CHART_URL","CAPTURE_SIZE_LIMIT","PNG_OR_JPEG_REQUIRED","CAPTURE_LIMIT_REACHED","VERSION_OR_STAGE_CHANGED"];
    return reply({error:allowed.includes(code)?code:"Capture could not be saved. Check the image and chart details."},code==="VERSION_OR_STAGE_CHANGED"?409:400);
  }
}
