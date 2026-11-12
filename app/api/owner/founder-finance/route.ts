import {ownerSessionFromRequest,privateHeaders} from '../../../lib/business-os/owner-session';
import {founderFinanceSnapshot,type FinancePeriod} from '../../../lib/business-os/founder-finance';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie'};
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return Response.json({error:'Unauthorized'},{status:401,headers});
 const period=new URL(request.url).searchParams.get('period')||'30d';
 if(!['30d','90d','all'].includes(period))return Response.json({error:'Choose 30d, 90d, or all.'},{status:400,headers});
 try{return Response.json(await founderFinanceSnapshot(period as FinancePeriod),{headers});}
 catch{return Response.json({error:'Finance records are unavailable. No customer, billing, or access change was made.'},{status:503,headers});}
}
