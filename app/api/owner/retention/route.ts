import {ownerSessionFromRequest,sameOrigin,privateHeaders} from '../../../lib/business-os/owner-session';
import {retentionReviewSnapshot,prepareRetentionReview} from '../../../lib/business-os/retention-review';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{...privateHeaders,Vary:'Cookie'}});
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 try{return json(await retentionReviewSnapshot());}catch{return json({error:'Retention records could not be read.'},503);}
}
export async function POST(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Same-origin JSON required'},403);
 const text=await request.text();if(text.length>1000)return json({error:'Request too large'},413);
 try{const body=JSON.parse(text);if(body.operation!=='prepare_draft')return json({error:'Unknown operation'},400);return json(await prepareRetentionReview(body.id));}
 catch{return json({error:'Draft not confirmed. The current invoice, customer or case may have changed. No email was sent.'},409);}
}
