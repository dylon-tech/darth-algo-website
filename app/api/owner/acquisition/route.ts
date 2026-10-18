import {ownerSessionFromRequest,privateHeaders} from '../../../lib/business-os/owner-session';
import {acquisitionSnapshot} from '../../../lib/business-os/acquisition';
import {checkoutConversions} from '../../../lib/business-os/conversions';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
  if(!ownerSessionFromRequest(request))return Response.json({error:'Unauthorized'},{status:401,headers:privateHeaders});
  const [visits,conversions]=await Promise.allSettled([acquisitionSnapshot(),checkoutConversions()]);
  const result=(v:PromiseSettledResult<unknown>)=>v.status==='fulfilled'?{status:'available',data:v.value}:{status:'unavailable',data:null};
  return Response.json({visits:result(visits),conversions:result(conversions),checkedAt:new Date().toISOString()},{headers:privateHeaders});
}
