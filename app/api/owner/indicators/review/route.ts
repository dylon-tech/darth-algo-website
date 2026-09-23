import {randomUUID} from "node:crypto";
import {db} from "../../../../lib/affiliate-db";
import {ensureIndicatorSchema} from "../../../../lib/business-os/indicator-lab";
import {ownerSessionFromRequest,privateHeaders,sameOrigin} from "../../../../lib/business-os/owner-session";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});

export async function POST(request:Request){
  if(!ownerSessionFromRequest(request))return reply({error:"Unauthorized"},401);
  if(!sameOrigin(request)||!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"Same-origin JSON required"},403);
  const raw=await request.text();if(raw.length>3000)return reply({error:"Request too large"},413);
  let input:Record<string,unknown>;
  try{input=JSON.parse(raw);if(!input||typeof input!=="object"||Array.isArray(input))throw Error();}catch{return reply({error:"Invalid JSON"},400);}
  const {id,sourceHash,action,note}=input;
  if(typeof id!=="string"||!/^[a-f0-9-]{36}$/.test(id)||typeof sourceHash!=="string"||!/^[a-f0-9]{64}$/.test(sourceHash)||!(["request_changes","reject","make_paid","test_feedback"] as unknown[]).includes(action)||typeof note!=="string"||note.length>2000||((action==="request_changes"||action==="make_paid"||action==="test_feedback")&&!note.trim()))return reply({error:"Invalid review"},400);
  await ensureIndicatorSchema();
  const sql=db();
  try{return reply(await sql.begin(async tx=>{
    const [candidate]=await tx`select id,status,source_hash,candidate from os_indicator_candidates where id=${id} for update`;
    if(!candidate||candidate.source_hash!==sourceHash||!(action==="test_feedback"?["qa_blocked","pending"].includes(candidate.status):candidate.status==="qa_blocked"))throw Error("VERSION_OR_STAGE_CHANGED");
    const event=action==="request_changes"?"indicator_revision_requested":action==="reject"?"indicator_rejected":action==="test_feedback"?"indicator_owner_test_feedback":"indicator_paid_proposal_requested";
    const [existing]=await tx`select id from os_activity where event=${event} and entity_id=${id} and details->>'sourceHash'=${sourceHash} limit 1`;
    if(existing && action!=="test_feedback")return {saved:true,duplicate:true,stage:candidate.status};
    const proposal=action==="make_paid"?{
      differentiation:candidate.candidate.differentiation,
      demandEvidence:candidate.candidate.demand,
      paidCatalogOverlap:"Requires review against Swing, Scalp, Pro and Lifetime; no overlap assessment has been approved.",
      supportBurden:"Unmeasured; test setup questions and access fulfillment before proposing a charge.",
      pricingRationale:"No price proposed. Existing product prices and entitlements remain unchanged.",
      recommendation:"Keep this candidate free unless independent demand and distinct paid scope justify exact new terms.",
      status:"proposal_requested_no_terms_approved"
    }:null;
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner',${event},${id},${tx.json({sourceHash,note:note.trim(),requestedAt:new Date().toISOString(),proposalId:action==="make_paid"?randomUUID():null,proposal,commercialTermsApproved:false})})`;
    if(action==="reject")await tx`update os_indicator_candidates set status='declined' where id=${id}`;
    if(action==="request_changes")await tx`update os_indicator_candidates set status='revision_requested' where id=${id}`;
    return {saved:true,stage:action==="reject"?"declined":action==="request_changes"?"revision_requested":"paid_proposal_requested",published:false,charged:false};
  }));}catch{return reply({error:"VERSION_OR_STAGE_CHANGED"},409);}
}
