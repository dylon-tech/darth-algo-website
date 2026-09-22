import { ownerSessionFromRequest, privateHeaders } from '../../../lib/business-os/owner-session';
import { liveOverview } from '../../../lib/business-os/live-overview';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const headers={...privateHeaders,'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie'};
export async function GET(request:Request) {
  if(!ownerSessionFromRequest(request))return Response.json({error:'Unauthorized'},{status:401,headers});
  try { return Response.json(await liveOverview(),{headers}); }
  catch { return Response.json({error:'Live status could not be read. No work state has been changed.'},{status:503,headers}); }
}
