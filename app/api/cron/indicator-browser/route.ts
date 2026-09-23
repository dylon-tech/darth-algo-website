import {secretMatches} from '../../../lib/business-os/policy';
import {runHostedChecks} from '../../../lib/business-os/hosted-checks';
import {runIndicatorCaptures} from '../../../lib/business-os/indicator-capture-worker';
export const runtime='nodejs';
export const maxDuration=180;
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!secretMatches(request.headers.get('authorization'),process.env.CRON_SECRET?`Bearer ${process.env.CRON_SECRET}`:undefined))return Response.json({error:'Unauthorized'},{status:401});
 try{const result=await runHostedChecks();console.info(JSON.stringify({event:'indicator_browser_tick',...result}));
  // Preserve the legacy check and isolate capture failures from it. A legacy
  // check that used a session gets this tick to itself.
  let captures:unknown={status:'waiting_for_legacy_check'};
  if(result.status==='idle'||result.status==='connection_required')try{captures=await runIndicatorCaptures();}catch{captures={status:'unavailable'};}
  console.info(JSON.stringify({event:'indicator_capture_tick',...captures as object}));
  return Response.json({...result,captures},{headers:{'Cache-Control':'no-store'}});}
 catch{console.warn(JSON.stringify({event:'indicator_browser_tick',status:'unavailable'}));return Response.json({error:'BROWSER_CHECK_UNAVAILABLE'},{status:503});}
}
