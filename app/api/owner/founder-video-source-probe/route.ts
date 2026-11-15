import {createHash} from 'node:crypto';
import {ownerSessionFromRequest,privateHeaders} from '../../../lib/business-os/owner-session';
import {founderVideoByteStream} from '../../../lib/business-os/founder-video-source-transport';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
/** Owner-only deterministic transport diagnostic. No media, provider, credentials,
 * approval mutation or capability token. A successful probe cannot activate anything. */
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return Response.json({error:'Unauthorized'},{status:401,headers});
 const bytes=Buffer.alloc(7_500_001,43);
 return new Response(founderVideoByteStream(bytes),{headers:{...headers,'Content-Type':'application/octet-stream','Content-Length':String(bytes.byteLength),'X-Content-SHA256':createHash('sha256').update(bytes).digest('hex'),'Content-Disposition':'attachment; filename="synthetic-video-transport-test.bin"'}});
}
export async function HEAD(request:Request){const response=await GET(request);return new Response(null,{status:response.status,headers:response.headers});}
