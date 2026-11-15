import {readFounderPublicationMedia} from '../../../../lib/business-os/founder-publication';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
export async function GET(_request:Request,context:{params:Promise<{id:string;token:string}>}){
 try{const {id,token}=await context.params,media=await readFounderPublicationMedia(id,token);if(!media)return new Response(null,{status:404,headers});return new Response(new Uint8Array(media.bytes),{headers:{...headers,'Content-Type':media.asset.mimeType,'Content-Length':String(media.bytes.length)}});}catch{return new Response(null,{status:404,headers});}
}
