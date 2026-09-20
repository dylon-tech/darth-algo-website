import {randomUUID} from "node:crypto";
import {db} from "../affiliate-db";
import {fingerprint} from "./policy";
import {queueJob} from "./jobs";
import {queueApprovalNotice,queueOwnerNotice} from "./delivery";
import {pineChecks,pineHash,pineLogicHash,scoreIndicator,validateIndicator,validTradingViewRelease,validPrivatePreview,type IndicatorCandidate} from "./indicator-policy";
import {observedIndicatorUrls} from "./indicator-research";
import type {Evidence} from "./sources";

export const indicatorSchema=`
create table if not exists os_indicator_candidates (
 id uuid primary key, run_id uuid not null unique references os_runs(id),
 candidate jsonb not null, source_hash text not null, logic_hash text not null unique,
 qa jsonb not null, score jsonb not null, approval_id uuid unique references os_approvals(id),
 status text not null check(status in ('qa_blocked','pending','approved','declined','revision_requested','expired','released')),
 created_at timestamptz not null default now(), released_at timestamptz,
 tradingview_url text unique, release_evidence jsonb, private_preview jsonb
 );
alter table os_indicator_candidates add column if not exists private_preview jsonb;
`;
export async function ensureIndicatorSchema(){await db().begin(async tx=>{await tx`select pg_advisory_xact_lock(730932)`;await tx.unsafe(indicatorSchema);});}
export function labEnabled(){return process.env.AI_OS_INDICATOR_LAB_ENABLED==="true";}
export async function labContext(revisionId?:string):Promise<Evidence>{
  const rows=await db()`select id,candidate->>'name' as name,candidate->>'purpose' as purpose,status from os_indicator_candidates order by created_at desc limit 25`;
  const original=revisionId?await db()`select candidate from os_indicator_candidates where id=${revisionId}`:[];
  return {id:"indicator_inventory",status:"verified",checkedAt:new Date().toISOString(),scope:"Our saved prototypes; avoid repeating their purpose or logic. Status is workflow state, not product performance.",data:{existing:rows,revisionOriginal:original[0]?.candidate||null}};
}
export async function syncIndicatorLab(){
  if(!labEnabled() || process.env.AI_OS_ENABLED!=="true" || process.env.VERCEL_ENV!=="production")return {status:"disabled"};
  await ensureIndicatorSchema();
  const sql=db();const [control]=await sql`select paused from os_control where id=1`;
  if(!control || control.paused)return {status:"paused"};
  // Recover output-to-approval handoffs after crashes before adding more work.
  const runs=await sql`select r.id,r.result,r.snapshot from os_runs r join os_jobs j on j.run_id=r.id
    where r.status='completed' and j.request_key like 'indicator:%'
    and not exists(select 1 from os_activity a where a.event='indicator_handoff' and a.entity_id=r.id::text)
    order by r.finished_at limit 3`;
  for(const run of runs){
    const raw=run.result.indicatorCandidate;
    let c:IndicatorCandidate|null=null;
    try{if(raw)c=validateIndicator(raw,observedIndicatorUrls(run.snapshot as Evidence[]));}catch{/* Invalid output is held, never published. */}
    await sql.begin(async tx=>{
      await tx`select pg_advisory_xact_lock(730932)`;
      const [done]=await tx`select id from os_activity where event='indicator_handoff' and entity_id=${run.id} limit 1`;if(done)return;
      let reason="insufficient_evidence_or_invalid_output";
      if(c){
        const id=randomUUID(),qa=pineChecks(c.pine),score=scoreIndicator(c),hash=pineHash(c.pine);
        const [row]=await tx`insert into os_indicator_candidates(id,run_id,candidate,source_hash,logic_hash,qa,score,status)
          values(${id},${run.id},${tx.json(c)},${hash},${pineLogicHash(c.pine)},${tx.json(qa)},${tx.json(score)},'qa_blocked') on conflict do nothing returning id`;
        reason=row?"static_qa_blocked":"duplicate_logic";
        if(row && qa.passed){
          const approvalId=randomUUID();
          const payload={executor:"indicator_release_v1",kind:"publishing",summary:c.name,candidateId:id,sourceHash:hash,
            details:`${c.purpose}\nAudience: ${c.audience}\nDifference: ${c.differentiation}\nDemand signal: ${c.demand}\nScreening: ${score.total}/${score.outOf}\nRecommendation: ${c.tier}${c.tier==="paid"?` · $${c.monthlyPriceUsd}/month (hypothesis)`:""}\n${c.pricingRationale}\nStatic checks passed. TradingView compiler and chart replay still required. Approval prepares this exact version for release; it does not certify performance.\nPreview: https://www.darthalgo.com/owner/indicators/${id}`,
            evidence:c.sourceUrls,policyVersion:1};
          await tx`insert into os_approvals(id,run_id,payload,payload_hash,expires_at) values(${approvalId},${run.id},${tx.json(payload)},${fingerprint(payload)},now()+interval '7 days')`;
          await tx`update os_indicator_candidates set approval_id=${approvalId},status='pending' where id=${id}`;
          reason="approval_prepared";
        }
      }
      await tx`insert into os_activity(actor,event,entity_id,details) values('research','indicator_handoff',${run.id},${tx.json({reason})})`;
    });
  }
  await sql`update os_indicator_candidates c set status=case when a.status='pending' and a.expires_at<=now() then 'expired' else a.status end
    from os_approvals a where c.approval_id=a.id and c.status<>'released' and (a.status<>c.status or (a.status='pending' and a.expires_at<=now()))`;
  const cards=await sql`select approval_id from os_indicator_candidates c where status='pending' and not exists(select 1 from os_outbox where dedupe_key='approval:' || c.approval_id::text || ':0') order by created_at limit 3`;
  for(const row of cards)await queueApprovalNotice(row.approval_id);
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  if(process.env.AI_OS_AI_ENABLED==="true" && process.env.AI_OS_AUTONOMY_ENABLED==="true"){
    const n=Number(process.env.AI_OS_INDICATORS_PER_DAY||"1");const limit=Number.isInteger(n)?Math.max(1,Math.min(3,n)):1;
    const pending=await sql`select id from os_jobs where request_key like 'indicator:%' and status in ('queued','running') limit 1`;
    const [{count}]=await sql`select count(*)::int as count from os_jobs where request_key like ${`indicator:${day}:%`}`;
    if(!pending.length && count<limit){
      const [revision]=await sql`select c.id,c.candidate,a.decision_note from os_indicator_candidates c join os_approvals a on a.id=c.approval_id
        where c.status='revision_requested' and not exists(select 1 from os_jobs where request_key like 'indicator:%' and message like '%Revision ID: ' || c.id::text || '%') order by a.decided_at limit 1`;
      await queueJob("research",`[INDICATOR_LAB] Generate one original, useful Pine Script v6 indicator prototype from today's observed market evidence. Prioritize unmet trader needs and differentiated behavior. Name each indicator Darth Algo followed by a short, familiar trading term that accurately describes its setup or function (for example Opening Range Fakeout or VWAP Pullback only when implemented). Avoid opaque fantasy names and unsupported order-flow or liquidity claims. Explain in plain language what each plotted color or marker means, the exact closed-bar trigger, intended use, supported sessions/timeframes and key limitations in the brief and Pine comments. Never copy, translate or imitate another author's source code. Cite at least two observed URLs. Return indicatorCandidate:null if evidence is insufficient or no distinct idea is warranted. Use closed-bar signals, alertcondition, plots, documented limitations; no request.*, imports, negative plot offsets, varip or timenow. Keep Pine below 4500 characters and brief below 700 characters to fit the response budget. Pricing is a hypothesis; recommend free unless differentiated value and comparable advertised pricing justify paid. Do not invent compiler, backtest, sales, or chart results. Do not create tasks or proposals; the server creates the exact approval card. ${revision?`Revision ID: ${revision.id}\nPrior prototype: ${revision.candidate.name}: ${revision.candidate.purpose}\nOwner revision: ${revision.decision_note}`:"Avoid all existing indicator_inventory prototypes."}`,`indicator:${day}:${count+1}`,"schedule");
    }
  }
  const [last]=await sql`select details from os_activity where event='indicator_handoff' order by id desc limit 1`;
  const [counts]=await sql`select count(*)::int as candidates,count(*) filter(where status='pending')::int as pending from os_indicator_candidates`;
  const [delivery]=await sql`select count(*)::int as sent from os_outbox o join os_indicator_candidates c on o.dedupe_key='approval:' || c.approval_id::text || ':0' where o.status='sent'`;
  return {status:"active",cardsQueued:cards.length,candidates:counts.candidates,pending:counts.pending,cardsDelivered:delivery.sent,lastHandoff:last?.details?.reason||null};
}
export async function indicatorDecisionMessage(id:string,decision:string){
  await db()`update os_indicator_candidates set status=${decision} where approval_id=${id} and status='pending'`;
  return decision==="approved"?"Indicator approved. Its exact source is saved. Release is waiting for TradingView compilation, chart replay and a verified publication URL; the catalog stays unchanged until then.":decision==="revision_requested"?"Revision saved. The Lab will use your notes in the next available daily slot; revised code needs a new approval.":"Indicator declined. It will not be released.";
}
export async function recordIndicatorRelease(id:string,hash:string,url:string,checks:{compiled:boolean;replay:boolean;notes:string;screenshotUrl:string}){
  if(!validTradingViewRelease(url) || checks.compiled!==true || checks.replay!==true || typeof checks.notes!=="string" || checks.notes.trim().length<30 || checks.notes.length>2000 || !/^https:\/\/www\.tradingview\.com\/x\/[A-Za-z0-9]+\/$/.test(checks.screenshotUrl||""))throw Error("RELEASE_VERIFICATION_REQUIRED");
  // This is an authenticated operator attestation, never a model-claimed test.
  await db().begin(async tx=>{
    const [control]=await tx`select paused from os_control where id=1 for share`;if(!control || control.paused)throw Error("OS_PAUSED");
    const [c]=await tx`select c.*,a.status as decision,a.payload,a.payload_hash from os_indicator_candidates c join os_approvals a on a.id=c.approval_id where c.id=${id} for update of c,a`;
    if(!c || c.decision!=="approved" || c.source_hash!==hash || pineHash(c.candidate.pine)!==hash || c.payload.sourceHash!==hash || fingerprint(c.payload)!==c.payload_hash || !pineChecks(c.candidate.pine).passed)throw Error("APPROVED_VERSION_REQUIRED");
    if(c.status==="released"){if(c.tradingview_url!==url)throw Error("RELEASE_ALREADY_RECORDED");return;}
    await tx`update os_indicator_candidates set status='released',tradingview_url=${url},released_at=now(),release_evidence=${tx.json({...checks,attestedBy:"owner",checkedAt:new Date().toISOString()})} where id=${id}`;
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','indicator_released',${id},${tx.json({sourceHash:hash,url})})`;
  });
  await queueOwnerNotice(`indicator-released:${id}`,`Indicator release recorded and added to the Darth Algo catalog.\n${url}`);
  return {released:true,catalogUrl:"https://www.darthalgo.com/indicators"};
}
export async function indicatorDashboard(){
  if(!labEnabled())return "◆ INDICATOR LAB\n\nWaiting for deployment activation.";
  await ensureIndicatorSchema();
  const rows=await db()`select candidate->>'name' as name,status,score->>'total' as score,created_at from os_indicator_candidates order by created_at desc limit 5`;
  const [latest]=await db()`select details,created_at from os_activity where event='indicator_handoff' order by id desc limit 1`;
  return `◆ INDICATOR LAB\n\nDaily target: ${Math.max(1,Math.min(3,Number(process.env.AI_OS_INDICATORS_PER_DAY)||1))} original prototypes, within the existing AI budget. Evidence or quality gaps can reduce output.\n\n${rows.map(r=>`${r.name}\n${r.status} · screening ${r.score}/90`).join("\n\n")||"First prototype is waiting."}\n\n${latest?`Latest handoff: ${latest.details.reason}`:""}\nTradingView compilation and chart replay must be verified before release. Use My decisions for approval cards.`;
}

export async function recordPrivateIndicatorPreview(id:string, sourceHash:string, input:unknown) {
  if(!input || typeof input !== "object" || Array.isArray(input)) throw Error("PRIVATE_PREVIEW_REQUIRED");
  const raw=input as Record<string,unknown>;
  const preview={sourceHash,chartUrl:raw.chartUrl,screenshotUrl:raw.screenshotUrl,compiled:raw.compiled,replay:raw.replay,reopened:raw.reopened,notes:raw.notes,checkedAt:new Date().toISOString(),attestedBy:"owner"};
  if(!validPrivatePreview(preview,sourceHash)) throw Error("PRIVATE_PREVIEW_REQUIRED");
  await ensureIndicatorSchema();
  await db().begin(async tx=>{
    const [c]=await tx`select * from os_indicator_candidates where id=${id} for update`;
    if(!c || !["pending","approved"].includes(c.status) || c.source_hash!==sourceHash || pineHash(c.candidate.pine)!==sourceHash || !pineChecks(c.candidate.pine).passed) throw Error("CURRENT_SOURCE_REQUIRED");
    // An authenticated operator attests to the actual chart; URLs alone prove nothing.
    await tx`update os_indicator_candidates set private_preview=${tx.json(preview)} where id=${id}`;
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','indicator_private_preview_ready',${id},${tx.json({sourceHash,chartUrl:preview.chartUrl})})`;
  });
  return {ready:true,chartUrl:preview.chartUrl,published:false};
}
