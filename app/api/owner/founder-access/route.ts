import {ownerSessionFromRequest,privateHeaders,sameOrigin} from '../../../lib/business-os/owner-session';
import {FounderAccessError,readFounderAccess,mutateFounderAccess} from '../../../lib/business-os/founder-access';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie'}});
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 try{return json(await readFounderAccess(new URL(request.url).searchParams.get('customer')||''));}
 catch(error){return error instanceof FounderAccessError?json({error:error.message,code:error.code},error.status):json({error:'Access requests could not be read.'},503);}
}
export async function POST(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Same-origin JSON required'},403);
 const raw=await request.text();if(raw.length>3000)return json({error:'Request too large'},413);
 let value:unknown;try{value=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
 try{return json(await mutateFounderAccess(value));}
 catch(error){return error instanceof FounderAccessError?json({error:error.message,code:error.code},error.status):json({error:'Save was not confirmed. Refresh before retrying. No provider action was taken.'},503);}
}
