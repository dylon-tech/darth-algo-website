import {ownerSessionFromRequest,privateHeaders,sameOrigin} from "../../../../../lib/business-os/owner-session";
import {requestIndicatorCapture} from "../../../../../lib/business-os/indicator-capture-worker";
export const runtime="nodejs";
export async function POST(request:Request){
  if(!ownerSessionFromRequest(request))return Response.json({error:"Unauthorized"},{status:401,headers:privateHeaders});
  if(!sameOrigin(request)||!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Same-origin JSON required"},{status:403,headers:privateHeaders});
  const raw=await request.text();if(raw.length>1000)return Response.json({error:"Too large"},{status:413,headers:privateHeaders});
  try{const {id,sourceHash}=JSON.parse(raw);if(!/^[a-f0-9-]{36}$/.test(id||"")||!/^[a-f0-9]{64}$/.test(sourceHash||""))throw Error();return Response.json(await requestIndicatorCapture(id,sourceHash),{headers:privateHeaders});}
  catch{return Response.json({error:"The version changed or its three-attempt limit was reached. Review the draft and connection."},{status:409,headers:privateHeaders});}
}
