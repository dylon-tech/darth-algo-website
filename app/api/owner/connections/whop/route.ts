import {ownerSessionFromRequest,privateHeaders,sameOrigin} from "../../../../lib/business-os/owner-session";
import {whopStatus} from "../../../../lib/business-os/whop";
import {whopPermissionState,requestWhopPermissionRecheck} from '../../../../lib/business-os/whop-permissions';
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
export async function GET(r:Request){
  if(!ownerSessionFromRequest(r))return Response.json({error:"Unauthorized"},{status:401,headers:privateHeaders});
  try{
    const [state,publishing]=await Promise.all([whopStatus(),whopPermissionState()]);
    return Response.json({...state,publishing},{status:state.connected?200:503,headers:privateHeaders});
  }catch{
    return Response.json({configured:Boolean(process.env.WHOP_COMPANY_API_KEY),connected:false,error:"WHOP_CHECK_FAILED"},{status:503,headers:privateHeaders});
  }
}
export async function POST(r:Request){
 if(!ownerSessionFromRequest(r))return Response.json({error:'Unauthorized'},{status:401,headers:privateHeaders});
 if(!sameOrigin(r))return Response.json({error:'Same-origin request required'},{status:403,headers:privateHeaders});
 const body=await r.json().catch(()=>null);
 if(body?.action!=='permissions_updated')return Response.json({error:'Confirm the posting permission was updated in Whop.'},{status:400,headers:privateHeaders});
 return Response.json(await requestWhopPermissionRecheck(),{headers:privateHeaders});
}
