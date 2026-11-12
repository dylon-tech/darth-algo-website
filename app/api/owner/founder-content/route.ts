import {ownerSessionFromRequest,privateHeaders,sameOrigin} from '../../../lib/business-os/owner-session';
import {mutateFounderContent,readFounderContent,readFounderContentHistory} from '../../../lib/business-os/founder-content';
import {FounderContentError} from '../../../lib/business-os/founder-content-model';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie','X-Content-Type-Options':'nosniff'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
function failure(error:unknown) {
  if(error instanceof FounderContentError)return json({error:error.message,code:error.code,...(error.current?{current:error.current}:{})},error.status);
  return json({error:'The saved calendar could not be confirmed. Your local draft is safe to keep. Refresh the calendar before retrying the same request.',code:'CALENDAR_UNAVAILABLE'},503);
}
export async function GET(request:Request) {
  if(!ownerSessionFromRequest(request))return json({error:'Sign in to open the private calendar.'},401);
  try {
    const query=new URL(request.url).searchParams,id=query.get('id');
    return json(id?await readFounderContentHistory(id):await readFounderContent(query.get('month')||undefined));
  }catch(error){return failure(error);}
}
export async function POST(request:Request) {
  if(!ownerSessionFromRequest(request))return json({error:'Sign in before saving this calendar edit.'},401);
  if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Same-origin JSON required.'},403);
  const raw=await request.text();
  if(raw.length>60000)return json({error:'This calendar edit is too large. Shorten the script or caption.'},413);
  let body:unknown;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON.'},400);}
  try{return json(await mutateFounderContent(body));}catch(error){return failure(error);}
}
