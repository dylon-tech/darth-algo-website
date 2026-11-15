import {ownerSessionFromRequest,privateHeaders} from '../../../lib/business-os/owner-session';
import {founderResearch} from '../../../lib/business-os/founder-research';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie'};
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return Response.json({error:'Unauthorized'},{status:401,headers});
 try{return Response.json(await founderResearch(),{headers});}catch{return Response.json({error:'Saved research could not be read. No research call was made.'},{status:503,headers});}
}
