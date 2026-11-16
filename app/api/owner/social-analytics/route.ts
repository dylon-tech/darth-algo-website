import {ownerSessionFromRequest,privateHeaders} from '../../../lib/business-os/owner-session';
import {founderSocialAnalytics} from '../../../lib/business-os/founder-social-analytics';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return Response.json({error:'Sign in to view private social analytics.'},{status:401,headers});
 try{return Response.json(await founderSocialAnalytics(),{headers});}
 catch{return Response.json({error:'Social analytics could not be refreshed. No publishing action was taken.'},{status:503,headers});}
}
