import {ownerSessionFromRequest,privateHeaders} from '../../../../lib/business-os/owner-session';
import {getFounderMediaBytes} from '../../../../lib/business-os/founder-media';
import {mediaByteRange} from '../../../../lib/business-os/founder-media-model';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const maxDuration=60;
// Stream large originals rather than returning an oversized buffered Function payload.
function mediaBody(bytes:Buffer){
 let offset=0;return new ReadableStream<Uint8Array>({pull(controller){
  if(offset>=bytes.length){controller.close();return;}
  const end=Math.min(offset+65536,bytes.length);controller.enqueue(new Uint8Array(bytes.subarray(offset,end)));offset=end;
 }});
}
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 const headers={...privateHeaders,Vary:'Cookie','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cross-Origin-Resource-Policy':'same-origin'};
 if(!ownerSessionFromRequest(request))return new Response(null,{status:401,headers});
 try{
  const {id}=await context.params,found=await getFounderMediaBytes(id);if(!found)return new Response(null,{status:404,headers});
  const {asset,bytes}=found,download=new URL(request.url).searchParams.get('download')==='1';
  const name=asset.fileName.replace(/[^\x20-\x7e]|["\\;]/g,'_'),disposition=`${download?'attachment':'inline'}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`;
  const mediaHeaders={...headers,'Content-Type':asset.mimeType,'Content-Disposition':disposition,'Accept-Ranges':'bytes'};
  let range;try{range=mediaByteRange(request.headers.get('range'),bytes.length);}catch{return new Response(null,{status:416,headers:{...mediaHeaders,'Content-Range':`bytes */${bytes.length}`}});}
  if(range){const slice=bytes.subarray(range.start,range.end+1);return new Response(mediaBody(slice),{status:206,headers:{...mediaHeaders,'Content-Range':`bytes ${range.start}-${range.end}/${bytes.length}`}});}
  return new Response(mediaBody(bytes),{headers:mediaHeaders});
 }catch{return new Response(null,{status:503,headers});}
}
