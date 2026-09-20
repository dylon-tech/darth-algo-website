import {secretMatches} from '../../../lib/business-os/policy';
import {runHostedChecks} from '../../../lib/business-os/hosted-checks';
export const runtime='nodejs';
export const maxDuration=180;
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!secretMatches(request.headers.get('authorization'),process.env.CRON_SECRET?`Bearer ${process.env.CRON_SECRET}`:undefined))return Response.json({error:'Unauthorized'},{status:401});
 try{const result=await runHostedChecks();console.info(JSON.stringify({event:'indicator_browser_tick',...result}));return Response.json(result,{headers:{'Cache-Control':'no-store'}});}
 catch{console.warn(JSON.stringify({event:'indicator_browser_tick',status:'unavailable'}));return Response.json({error:'BROWSER_CHECK_UNAVAILABLE'},{status:503});}
}
