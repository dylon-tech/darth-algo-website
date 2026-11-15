import {readFounderVideoSource} from '../../../../lib/business-os/founder-video-dispatch';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; sandbox"};
export async function GET(_request:Request,context:{params:Promise<{id:string;token:string}>}){
 try{const {id,token}=await context.params,media=await readFounderVideoSource(id,token);if(!media)return new Response(null,{status:404,headers});
 // Buffered below the conservative 4MB bound. Do not extend to native32MB media
 // until deployed Content-Length and byte identity are independently proven.
 return new Response(new Uint8Array(media.bytes),{headers:{...headers,'Content-Type':media.asset.mimeType,'Content-Length':String(media.bytes.length)}});
 }catch{return new Response(null,{status:404,headers});}
}
export async function HEAD(request:Request,context:{params:Promise<{id:string;token:string}>}){const result=await GET(request,context);return new Response(null,{status:result.status,headers:result.headers});}
