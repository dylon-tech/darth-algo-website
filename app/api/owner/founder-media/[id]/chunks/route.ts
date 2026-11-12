import {ownerSessionFromRequest,privateHeaders,sameOrigin} from '../../../../../lib/business-os/owner-session';
import {saveFounderMediaChunk} from '../../../../../lib/business-os/founder-media';
import {founderMediaLimits} from '../../../../../lib/business-os/founder-media-model';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{...privateHeaders,Vary:'Cookie'}});
export async function PUT(request:Request,context:{params:Promise<{id:string}>}){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 if(!sameOrigin(request)||request.headers.get('content-type')!=='application/octet-stream')return json({error:'Same-origin binary upload required'},403);
 if(Number(request.headers.get('content-length'))>founderMediaLimits.chunkBytes)return json({error:'File part exceeds 1 MB'},413);
 try{
  const rawIndex=new URL(request.url).searchParams.get('index');if(rawIndex===null||!/^\d{1,2}$/.test(rawIndex))return json({error:'Invalid file part'},400);
  const reader=request.body?.getReader();if(!reader)return json({error:'File part required'},400);
  const parts:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>founderMediaLimits.chunkBytes){await reader.cancel();return json({error:'File part exceeds 1 MB'},413);}parts.push(value);}
  const {id}=await context.params;return json(await saveFounderMediaChunk(id,Number(rawIndex),Buffer.concat(parts)));
 }catch(error){const code=error instanceof Error?error.message:'';const messages:Record<string,string>={INVALID_CHUNK:'File part does not match its expected size.',UPLOAD_NOT_FOUND:'Upload not found.',UPLOAD_EXPIRED:'This upload expired.',CHUNK_CONFLICT:'A different file part was already saved. Start a new upload.'};return json({error:messages[code]||'This file part was not confirmed. Retry the same part.',code:messages[code]?code:'CHUNK_UNCONFIRMED'},messages[code]?409:503);}
}
