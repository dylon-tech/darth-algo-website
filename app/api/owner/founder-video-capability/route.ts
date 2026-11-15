import {ownerSessionFromRequest,privateHeaders} from '../../../lib/business-os/owner-session';
import {discoverFounderVideoCapabilities} from '../../../lib/business-os/founder-video-publication';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=90;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return Response.json({error:'Sign in to check your video connections.'},{status:401,headers});
 try{return Response.json(await discoverFounderVideoCapabilities(),{headers});}catch{return Response.json({error:'The read-only capability check did not finish. No content was uploaded or published.'},{status:503,headers});}
}
