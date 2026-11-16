import {readFounderVideoCover} from '../../../../lib/business-os/founder-video-dispatch';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; sandbox"};
export async function GET(_request:Request,context:{params:Promise<{id:string;token:string}>}){
 try{const {id,token}=await context.params,cover=await readFounderVideoCover(id,token);if(!cover)return new Response(null,{status:404,headers});return new Response(new Uint8Array(cover.bytes),{headers:{...headers,'Content-Type':cover.asset.mimeType,'Content-Length':String(cover.bytes.length)}});}catch{return new Response(null,{status:404,headers});}
}
export async function HEAD(request:Request,context:{params:Promise<{id:string;token:string}>}){const result=await GET(request,context);return new Response(null,{status:result.status,headers:result.headers});}
