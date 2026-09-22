import {ownerSessionFromRequest,privateHeaders} from "../../../../lib/business-os/owner-session";
import {whopStatus} from "../../../../lib/business-os/whop";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
export async function GET(r:Request){
  if(!ownerSessionFromRequest(r))return Response.json({error:"Unauthorized"},{status:401,headers:privateHeaders});
  try{
    const state=await whopStatus();
    return Response.json(state,{status:state.connected?200:503,headers:privateHeaders});
  }catch{
    return Response.json({configured:Boolean(process.env.WHOP_COMPANY_API_KEY),connected:false,error:"WHOP_CHECK_FAILED"},{status:503,headers:privateHeaders});
  }
}
