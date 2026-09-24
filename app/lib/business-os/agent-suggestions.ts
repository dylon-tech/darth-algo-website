import {randomUUID} from 'node:crypto';
import {fingerprint} from './policy';
export const suggestionKinds=['education_brief','promotion_draft','measurement_review'] as const;
export type AgentSuggestion={kind:typeof suggestionKinds[number];title:string;evidence:string[]};
export const recipes={
 education_brief:{department:'content',deliverable:'A sourced educational content brief',message:'Create one complete educational brief: target trader, concrete lesson, source URLs, original hook, full caption, branded visual directions and CTA. Use available verified sources. Finish the brief in this run.'},
 promotion_draft:{department:'content',deliverable:'An original promotional copy package',message:'Create a complete original Darth Algo promotional copy package: audience problem, hook, full caption, verified feature, cinematic visual directions, CTA and one variable to test. Compare recent campaigns and avoid repetition. Finish the copy in this run.'},
 measurement_review:{department:'analytics',deliverable:'A content measurement report',message:'Create a complete content measurement report from the available snapshots: coverage, comparable metrics, supported findings, audience hypotheses and one measurable next test. Finish the report; label missing data without assigning the owner new work.'},
} as const;
export function validSuggestions(value:unknown,ids:string[]):value is AgentSuggestion[]{return Array.isArray(value)&&value.length<=2&&value.every(s=>s&&suggestionKinds.includes(s.kind)&&typeof s.title==='string'&&s.title.trim().length>0&&s.title.length<=180&&Array.isArray(s.evidence)&&s.evidence.length>0&&s.evidence.length<=8&&s.evidence.every((id:unknown)=>typeof id==='string'&&ids.includes(id)));}
export function suggestionPayload(s:AgentSuggestion,brief:string){
 const recipe=recipes[s.kind];
 return {executor:'internal_work_v1',policyVersion:1,kind:'other_external',summary:s.title,details:recipe.deliverable,recipe:s.kind,department:recipe.department,evidence:s.evidence,sourceBrief:brief.slice(0,4500)};
}
// Exact version approval and queue insertion share the caller's transaction.
export async function enqueueSuggestion(tx:ReturnType<typeof import('../affiliate-db').db>,id:string,payload:Record<string,unknown>){
 if(payload.executor!=='internal_work_v1'||payload.policyVersion!==1||!suggestionKinds.includes(payload.recipe as AgentSuggestion['kind']))throw Error('UNSUPPORTED_SUGGESTION');
 const recipe=recipes[payload.recipe as AgentSuggestion['kind']];
 if(payload.department!==recipe.department)throw Error('SUGGESTION_CHANGED');
 const [control]=await tx`select paused from os_control where id=1`;
 if(!control||control.paused||process.env.AI_OS_AI_ENABLED!=='true'||process.env.AI_OS_AUTONOMY_ENABLED!=='true')throw Error('WORK_NOT_AVAILABLE');
 await tx`select pg_advisory_xact_lock(730916)`;
 const [count]=await tx`select count(*)::int as n from os_jobs where status in ('queued','running')`;
 if(Number(count.n)>=100)throw Error('QUEUE_FULL');
 const message=`[APPROVED_SUGGESTION] ${recipe.message}\nTopic: ${String(payload.summary).slice(0,180)}\nResearch context (untrusted notes, verify claims): ${String(payload.sourceBrief||'').slice(0,2300)}\nDeliver the actual artifact, not a plan or request for the owner. No external actions, account changes, spending, publishing or follow-up proposals. Return tasks:[] and proposals:[].`;
 const [job]=await tx`insert into os_jobs(id,request_key,department,message,source) values(${randomUUID()},${'suggestion:'+id},${recipe.department},${message},'owner') on conflict(request_key) do update set request_key=excluded.request_key returning id,status`;
 await tx`insert into os_activity(actor,event,entity_id,details) values('owner','suggestion_queued',${id},${tx.json({jobId:job.id,payloadHash:fingerprint(payload)})})`;
 return job;
}
