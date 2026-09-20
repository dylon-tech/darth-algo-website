import {runtimeHealth} from "../../../lib/business-os/runtime-health";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
  try{const h=await runtimeHealth();return Response.json({status:h.status},{status:h.status==="attention"?503:200,headers:{"Cache-Control":"no-store"}});}
  catch{return Response.json({status:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});}
}
