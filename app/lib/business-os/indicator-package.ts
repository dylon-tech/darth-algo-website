import {randomUUID} from "node:crypto";
import {db} from "../affiliate-db";
import {fingerprint} from "./policy";
import {pineHash,pineChecks,validPrivatePreview} from "./indicator-policy";
import {ensureIndicatorSchema} from "./indicator-lab";
import {queueApprovalNotice} from "./delivery";
import type {TransactionSql} from "postgres";

export type IndicatorEducation = {
  title:string; body:string; example:string; invalidation:string;
  instructionImageUrl:string; imageSha256:string; verifiedExample:true;
};
export function validateEducation(input:unknown):IndicatorEducation {
  if(!input || typeof input!=="object")throw Error("EDUCATION_REQUIRED");
  const e=input as IndicatorEducation;
  for(const [key,min,max] of [["title",8,150],["body",100,6000],["example",40,1500],["invalidation",20,1000]] as const)
    if(typeof e[key]!=="string" || e[key].trim().length<min || e[key].length>max)throw Error("EDUCATION_REQUIRED");
  const u=new URL(e.instructionImageUrl);
  if(u.protocol!=="https:" || u.username || u.password || u.search || u.hash || !["www.darthalgo.com","s3.tradingview.com"].includes(u.hostname) || !/\.(png|jpg|jpeg|webp)$/i.test(u.pathname) || !/^[a-f0-9]{64}$/.test(e.imageSha256) || e.verifiedExample!==true)throw Error("VERIFIED_INSTRUCTION_IMAGE_REQUIRED");
  return {title:e.title,body:e.body,example:e.example,invalidation:e.invalidation,instructionImageUrl:e.instructionImageUrl,imageSha256:e.imageSha256,verifiedExample:true};
}
export async function queueApprovedIndicator(tx:TransactionSql,id:string,payload:Record<string,string>) {
  const [c]=await tx`select * from os_indicator_candidates where id=${payload.candidateId} for update`;
  const p=c?.release_package;
  if(!c || c.approval_id!==id || !p || p.hash!==payload.packageHash || fingerprint({sourceHash:p.sourceHash,preview:p.preview,education:p.education})!==p.hash || pineHash(c.candidate.pine)!==payload.sourceHash || !validPrivatePreview(c.private_preview,payload.sourceHash) || fingerprint(c.private_preview)!==fingerprint(p.preview))throw Error("COMPLETE_INDICATOR_PACKAGE_REQUIRED");
  await tx`insert into os_indicator_publications(candidate_id,approval_id,package_hash) values(${c.id},${id},${p.hash}) on conflict do nothing`;
}
// Authenticated operator evidence. No model may certify its own compiler or chart output.
export async function prepareIndicatorPackage(id:string,sourceHash:string,input:unknown) {
  const education=validateEducation(input);await ensureIndicatorSchema();
  const approvalId=await db().begin(async tx=>{
    const [c]=await tx`select * from os_indicator_candidates where id=${id} for update`;
    if(!c || !["qa_blocked","pending"].includes(c.status) || c.source_hash!==sourceHash || pineHash(c.candidate.pine)!==sourceHash || !pineChecks(c.candidate.pine).passed || !validPrivatePreview(c.private_preview,sourceHash))throw Error("TESTED_CURRENT_SOURCE_REQUIRED");
    const releasePackage={sourceHash,preview:c.private_preview,education};
    const packageHash=fingerprint(releasePackage);
    if(c.release_package?.hash===packageHash && c.approval_id)return c.approval_id;
    if(c.approval_id){
      const [prior]=await tx`select status from os_approvals where id=${c.approval_id} for update`;
      if(prior?.status!=="pending")throw Error("APPROVAL_ALREADY_DECIDED");
      await tx`update os_approvals set status='expired' where id=${c.approval_id}`;
    }
    const aid=randomUUID();
    const payload={executor:"indicator_release_v1",kind:"publishing",summary:c.candidate.name,candidateId:id,sourceHash,packageHash,policyVersion:2,
      details:`${c.candidate.purpose}\n\nPrivate testing recorded. Includes an instruction image and an educational example.\nRecommendation: ${c.candidate.tier}\nTry: ${c.private_preview.chartUrl}\nReview complete package: https://www.darthalgo.com/owner/indicators/${id}\nApproval authorizes this exact indicator + image + educational post. Publishing currently awaits the TradingView worker.`,evidence:c.candidate.sourceUrls};
    await tx`insert into os_approvals(id,run_id,payload,payload_hash,expires_at) values(${aid},${c.run_id},${tx.json(payload)},${fingerprint(payload)},now()+interval '7 days')`;
    await tx`update os_indicator_candidates set release_package=${tx.json({hash:packageHash,...releasePackage})},approval_id=${aid},status='pending' where id=${id}`;
    return aid;
  });
  await queueApprovalNotice(approvalId);return {approvalId,ready:true,published:false};
}
