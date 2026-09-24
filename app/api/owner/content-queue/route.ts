import {after} from 'next/server';
import {ownerSessionFromRequest,privateHeaders,sameOrigin} from '../../../lib/business-os/owner-session';
import {readContentQueue,decideContent,ContentReviewError} from '../../../lib/business-os/daily-content-review';
import {workAndNotify} from '../../../lib/business-os/telegram-command';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=120;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 try{return json(await readContentQueue());}catch{return json({error:'The publishing queue could not be verified. No content was changed.'},503);}
}
export async function POST(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Same-origin JSON required'},403);
 const raw=await request.text();if(raw.length>4000)return json({error:'Request too large'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
 try{const result=await decideContent(body);if(result.jobId&&!result.duplicate)after(async()=>{try{await workAndNotify();}catch{/* The durable request remains visible in the queue. */}});return json(result);}
 catch(error){return json({error:error instanceof ContentReviewError?error.message:'The response was not confirmed. Refresh the queue before retrying the same decision.'},409);}
}
