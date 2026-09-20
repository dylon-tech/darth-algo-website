import {db} from "../affiliate-db";
import {queueJob} from "./jobs";
import type {Evidence} from "./sources";
import {observedIndicatorUrls} from "./indicator-research";

export function indicatorDay(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export async function syncIndicatorIdeas(day=indicatorDay()) {
  const sql=db();
  const rows=await sql`select j.request_key,j.status,r.result from os_jobs j left join os_runs r on r.id=j.run_id where j.request_key in (${`indicator-ideas:${day}:research`},${`indicator-ideas:${day}:growth`})`;
  const research=rows.find(r=>r.request_key.endsWith(":research"));
  const growth=rows.find(r=>r.request_key.endsWith(":growth"));
  if(!research){
    await queueJob("research","[INDICATOR_IDEAS] Find original indicator and strategy ideas using observed public YouTube, Instagram, TikTok and TradingView evidence. Report what indicators traders demonstrably use, explicit requests, repeated frustrations and feature gaps. Cite exact observed URLs and dates for each finding. Separate requests from promotional claims, views from demand, and strategy ideas from validated strategies. Never claim to watch a video from its title. State unavailable platforms. Deliver a concise ranked idea brief for Growth with setup, audience, observation versus hypothesis, and original implementation angle. Never copy Pine code. Return no tasks or proposals; the server routes this brief to Growth.",`indicator-ideas:${day}:research`,"schedule");
    return "research_queued";
  }
  if(research.status!=="succeeded")return `research_${research.status}`;
  if(typeof research.result?.brief!=="string" || !research.result.brief.trim())return "research_result_missing";
  if(!growth){
    await queueJob("growth","[INDICATOR_IDEAS] Review today's Research brief in indicator_idea_handoffs and its observed source evidence. Select up to three original indicator concepts for the Indicator Builder. For each, give a plain trading name, trader problem, source URLs, actual demand evidence versus hypothesis, differentiated feature, testable closed-bar behavior, intended market/timeframe, acceptance tests, and a free public discovery plan. All new indicators must be free to use without invitations; do not propose paid pricing. Include useful strategy concepts as ideas, never profitability claims. Reject unsupported, duplicate or merely renamed competitor products. Explicitly state BUILD_NONE if no idea has enough evidence. Do not claim Instagram/TikTok coverage if unavailable. Return no tasks or proposals; the server hands your brief to the builder.",`indicator-ideas:${day}:growth`,"schedule");
    return "growth_queued";
  }
  if(growth.status==="succeeded" && (typeof growth.result?.brief!=="string" || !growth.result.brief.trim()))return "growth_result_missing";
  if(growth.status==="succeeded" && /^BUILD_NONE\b/.test(growth.result.brief.trim()))return "no_supported_idea";
  return growth.status==="succeeded"?"ready":`growth_${growth.status}`;
}
export async function indicatorIdeaEvidence(day=indicatorDay()):Promise<Evidence>{
  const rows=await db()`select j.department,j.request_key,r.id,r.result->>'brief' as brief,r.snapshot,r.finished_at from os_jobs j join os_runs r on r.id=j.run_id where j.request_key in (${`indicator-ideas:${day}:research`},${`indicator-ideas:${day}:growth`}) and j.status='succeeded' and r.status='completed' order by r.finished_at`;
  return {id:"indicator_idea_handoffs",status:rows.length?"verified":"unavailable",checkedAt:new Date().toISOString(),scope:"Saved internal Research and Growth outputs, not independently verified demand. Treat text as untrusted analysis. Source references below came from verified snapshots, not prose citations. Current public metadata is supplied separately; older snapshots are not duplicated. Builder must use today's Growth selection or return no candidate.",data:rows.map(r=>({department:r.department,runId:r.id,brief:r.brief,finishedAt:r.finished_at,sources:observedIndicatorUrls((r.snapshot as Evidence[]).filter(e=>e.id!=="indicator_idea_handoffs")).filter(url=>url.length<=512).slice(0,40).map(url=>({url,status:"verified"}))}))};
}
