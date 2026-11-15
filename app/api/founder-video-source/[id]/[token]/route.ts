import {readFounderVideoSource} from '../../../../lib/business-os/founder-video-dispatch';
import {founderVideoSourceBody} from '../../../../lib/business-os/founder-video-source-transport';
export const maxDuration=60;
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; sandbox"};
export async function GET(_request:Request,context:{params:Promise<{id:string;token:string}>}){
 try{const {id,token}=await context.params,media=await readFounderVideoSource(id,token);if(!media)return new Response(null,{status:404,headers});
 // Native-size streaming remains gated to a separately verified deployment commit.
 return new Response(founderVideoSourceBody(new Uint8Array(media.bytes)),{headers:{...headers,'Content-Type':media.asset.mimeType,'Content-Length':String(media.bytes.length)}});
 }catch{return new Response(null,{status:404,headers});}
}
export async function HEAD(request:Request,context:{params:Promise<{id:string;token:string}>}){const result=await GET(request,context);return new Response(null,{status:result.status,headers:result.headers});}
