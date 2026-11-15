import {readFounderPublicationMedia} from '../../../../lib/business-os/founder-publication';
import {mediaByteRange} from '../../../../lib/business-os/founder-media-model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; sandbox"};
// Match private original delivery: an 8MB approved photo must not become an
// oversized buffered serverless response. Capability verification still runs
// before either full or range delivery; the private original URL is unchanged.
function mediaBody(bytes:Buffer){let offset=0;return new ReadableStream<Uint8Array>({pull(controller){if(offset>=bytes.length){controller.close();return;}const end=Math.min(offset+65536,bytes.length);controller.enqueue(new Uint8Array(bytes.subarray(offset,end)));offset=end;}});}
export async function GET(request:Request,context:{params:Promise<{id:string;token:string}>}){
 try{
  const {id,token}=await context.params,media=await readFounderPublicationMedia(id,token);if(!media)return new Response(null,{status:404,headers});
  const mediaHeaders={...headers,'Content-Type':media.asset.mimeType,'Accept-Ranges':'bytes'};
  let range;try{range=mediaByteRange(request.headers.get('range'),media.bytes.length);}catch{return new Response(null,{status:416,headers:{...mediaHeaders,'Content-Range':`bytes */${media.bytes.length}`}});}
  if(range)return new Response(mediaBody(media.bytes.subarray(range.start,range.end+1)),{status:206,headers:{...mediaHeaders,'Content-Range':`bytes ${range.start}-${range.end}/${media.bytes.length}`}});
  return new Response(mediaBody(media.bytes),{headers:mediaHeaders});
 }catch{return new Response(null,{status:404,headers});}
}
