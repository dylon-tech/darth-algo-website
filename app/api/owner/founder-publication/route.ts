import {ownerSessionFromRequest,privateHeaders,sameOrigin} from '../../../lib/business-os/owner-session';
import {approveFounderPhotoPublication,prepareFounderPhotoPublication,listFounderPublications,founderPhotoPublishingEnabled} from '../../../lib/business-os/founder-publication';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie','X-Content-Type-Options':'nosniff'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
const unavailable=(error:unknown)=>json({error:'Publication setup or review could not be confirmed. No automatic retry was submitted.',code:error instanceof Error&&/^PHOTO_[A-Z_]+$/.test(error.message)?error.message:'PUBLICATION_UNAVAILABLE'},409);
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Sign in to review your content.'},401);
 const itemId=new URL(request.url).searchParams.get('itemId')||undefined;
 if(itemId&&!/^[a-f0-9-]{36}$/.test(itemId))return json({error:'Invalid content identifier.'},400);
 try{return json({enabled:founderPhotoPublishingEnabled(),items:await listFounderPublications(itemId)});}catch(error){return unavailable(error);}
}
export async function POST(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Sign in before approving a publication.'},401);
 if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Same-origin JSON required.'},403);
 const raw=await request.text();if(raw.length>8000)return json({error:'Request too large.'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON.'},400);}
 try{
  if(body?.operation==='prepare'&&typeof body.itemId==='string'&&/^[a-f0-9-]{36}$/.test(body.itemId)&&Number.isInteger(body.expectedVersion)&&typeof body.publishAt==='string')return json(await prepareFounderPhotoPublication(body));
  if(body?.operation==='approve'&&typeof body.id==='string'&&/^[a-f0-9-]{36}$/.test(body.id)&&typeof body.expectedHash==='string'&&/^[a-f0-9]{64}$/.test(body.expectedHash)&&body.confirmApproved===true)return json(await approveFounderPhotoPublication(body));
  return json({error:'Choose prepare or approve for an exact saved version.'},400);
 }catch(error){return unavailable(error);}
}
