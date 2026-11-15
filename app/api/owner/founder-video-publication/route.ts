import {ownerSessionFromRequest,privateHeaders,sameOrigin} from '../../../lib/business-os/owner-session';
import {founderVideoPublishingEnabled,listFounderVideoPublications,prepareFounderVideoPublication,consentFounderVideoImport,advanceFounderVideoPreparation,approveFounderVideoPublication,executeFounderVideoPublication,discardFounderVideoPublication} from '../../../lib/business-os/founder-video-dispatch';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie','X-Content-Type-Options':'nosniff'};
const json=(v:unknown,status=200)=>Response.json(v,{status,headers}),uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v),hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const unavailable=(error:unknown)=>json({error:'Video operation was not confirmed. Review its saved state before retrying.',code:error instanceof Error&&/^VIDEO_[A-Z_]+$/.test(error.message)?error.message:'VIDEO_UNAVAILABLE'},409);
export async function GET(request:Request){if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);const id=new URL(request.url).searchParams.get('itemId')||undefined;if(id&&!uuid(id))return json({error:'Invalid identifier'},400);try{return json({enabled:founderVideoPublishingEnabled(),items:await listFounderVideoPublications(id)});}catch(e){return unavailable(e);}}
async function readBody(request:Request){
 const length=request.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>12000))throw Error('TOO_LARGE');
 if(!request.body)return '';const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>12000){await reader.cancel();throw Error('TOO_LARGE');}chunks.push(next.value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export async function POST(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Same-origin JSON required'},403);
 let b;try{b=JSON.parse(await readBody(request));}catch(e){return json({error:e instanceof Error&&e.message==='TOO_LARGE'?'Too large':'Invalid JSON'},e instanceof Error&&e.message==='TOO_LARGE'?413:400);}
 try{
  if(b?.operation==='prepare'&&uuid(b.itemId)&&Number.isInteger(b.expectedVersion)&&typeof b.publishAt==='string')return json(await prepareFounderVideoPublication(b));
  if(b?.operation==='consentImport'&&uuid(b.id)&&hash(b.expectedHash)&&b.confirmImport===true)return json(await consentFounderVideoImport(b));
  if(b?.operation==='discard'&&uuid(b.id)&&hash(b.expectedHash)&&b.confirmDiscard===true)return json(await discardFounderVideoPublication(b));
  if(b?.operation==='prepareDraft'&&uuid(b.id))return json(await advanceFounderVideoPreparation(b.id));
  if(b?.operation==='approve'&&uuid(b.id)&&hash(b.expectedHash)&&typeof b.providerRevision==='string'&&b.confirmApproved===true)return json(await approveFounderVideoPublication(b));
  if(b?.operation==='check'&&uuid(b.id))return json(await executeFounderVideoPublication(b.id));
  return json({error:'Choose an explicit exact-version action'},400);
 }catch(e){return unavailable(e);}
}
