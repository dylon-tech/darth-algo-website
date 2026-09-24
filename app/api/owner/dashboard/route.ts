import {after} from 'next/server';
import {ownerSessionFromRequest,privateHeaders,sameOrigin} from '../../../lib/business-os/owner-session';
import {ceoHome} from '../../../lib/business-os/ceo-home';
import {saveBill} from '../../../lib/business-os/company-finances';
import {requestAgentRecovery} from '../../../lib/business-os/owner-recovery';
import {decide} from '../../../lib/business-os/service';
import {workAndNotify} from '../../../lib/business-os/telegram-command';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=120;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie'};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 try{return json(await ceoHome());}catch{return json({error:'The dashboard could not read its records. No work was started.'},503);}
}
export async function POST(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Same-origin JSON required'},403);
 const raw=await request.text();if(raw.length>12000)return json({error:'Request too large'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
 if(!body||typeof body!=='object')return json({error:'Invalid request'},400);
 try{
  if(body.operation==='bill')return json({bill:await saveBill(body.bill),message:'Company bill saved.'});
  if(body.operation==='recover'){
   const result=await requestAgentRecovery();if(result.status==='queued')after(async()=>{try{await workAndNotify();}catch{}});return json(result);
  }
  if(body.operation==='suggestion'&&/^[a-f0-9-]{36}$/.test(body.id||'')&&/^[a-f0-9]{64}$/.test(body.hash||'')&&['approved','declined'].includes(body.decision)){
   // Only the executable internal suggestions belong on this screen.
   const {db}=await import('../../../lib/affiliate-db');const [row]=await db()`select payload->>'executor' as executor from os_approvals where id=${body.id}`;
   if(row?.executor!=='internal_work_v1')return json({error:'Suggestion unavailable'},409);
   const result=await decide(body.id,body.hash,body.decision,'CEO home decision');
   if(body.decision==='approved')after(async()=>{try{await workAndNotify();}catch{}});return json(result);
  }
  return json({error:'Invalid operation'},400);
 }catch{return json({error:'The change was not confirmed. Refresh to check the saved state before retrying.'},409);}
}
