import {syncIndicatorIdeas} from "./indicator-ideas";
import {randomUUID} from "node:crypto";
import {db} from "../affiliate-db";
import {fingerprint} from "./policy";
import {queueJob} from "./jobs";
import {queueApprovalNotice,queueOwnerNotice} from "./delivery";
import {indicatorReleasePolicy,freePublicReleaseVerified,pineChecks,pineHash,pineLogicHash,scoreIndicator,validateIndicator,validTradingViewRelease,validPrivatePreview,type IndicatorCandidate} from "./indicator-policy";
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
alter table os_indicator_candidates alter column run_id drop not null;
alter table os_indicator_candidates add column if not exists private_preview jsonb;
alter table os_indicator_candidates add column if not exists release_package jsonb;
create table if not exists os_indicator_publications (
 candidate_id uuid primary key references os_indicator_candidates(id), approval_id uuid not null references os_approvals(id),
 package_hash text not null, status text not null default 'awaiting_tradingview_worker',
 script_url text, education_url text, created_at timestamptz not null default now(), completed_at timestamptz
);
`;
export async function ensureIndicatorSchema(){await db().begin(async tx=>{await tx`select pg_advisory_xact_lock(730932)`;await tx.unsafe(indicatorSchema);});}
export function labEnabled(){return process.env.AI_OS_INDICATOR_LAB_ENABLED==="true";}
const immediatePrototype:IndicatorCandidate={
  name:"Darth Algo Session VWAP Reclaim",
  purpose:"Highlight a confirmed reclaim or rejection of session VWAP only when price closes back through VWAP with short-term trend alignment.",
  differentiation:"A deliberately small, readable prototype: session filter, closed-bar VWAP cross, EMA direction filter, one marker per direction until price crosses back, and explicit alerts. It is a review prototype, not a profitability claim.",
  audience:"Intraday futures traders who want fewer, context-aware VWAP markers on 1-, 3-, 5- or 15-minute charts.",
  demand:"Owner requested an immediately reviewable original prototype. Market demand and trading performance have not been measured; the cited sources document implementation primitives only.",
  pricingRationale:"Owner direction keeps new Indicator Lab releases free and publicly discoverable if they later pass compilation, replay, education and release QA.",
  tier:"free",monthlyPriceUsd:0,
  sourceUrls:["https://www.tradingview.com/pine-script-docs/concepts/sessions/","https://www.tradingview.com/pine-script-docs/language/built-ins/"],
  pine:`//@version=6
indicator("Darth Algo Session VWAP Reclaim", overlay=true)
tradeSession = input.session("0930-1600", "Trading session")
emaLength = input.int(21, "Trend EMA", minval=2, maxval=200)
inSession = not na(time(timeframe.period, tradeSession))
vwapLine = ta.vwap(hlc3)
trendEma = ta.ema(close, emaLength)
longSetup = inSession and barstate.isconfirmed and ta.crossover(close, vwapLine) and close > trendEma
shortSetup = inSession and barstate.isconfirmed and ta.crossunder(close, vwapLine) and close < trendEma
var int lastSide = 0
longSignal = longSetup and lastSide != 1
shortSignal = shortSetup and lastSide != -1
if longSignal
    lastSide := 1
if shortSignal
    lastSide := -1
if not inSession
    lastSide := 0
plot(vwapLine, "Session VWAP", color=color.new(color.purple, 0), linewidth=2)
plot(trendEma, "Trend EMA", color=color.new(color.gray, 25), linewidth=1)
plotshape(longSignal, title="VWAP Reclaim", text="RECLAIM", style=shape.labelup, location=location.belowbar, color=color.new(color.lime, 0), textcolor=color.black, size=size.tiny)
plotshape(shortSignal, title="VWAP Rejection", text="REJECT", style=shape.labeldown, location=location.abovebar, color=color.new(color.red, 0), textcolor=color.white, size=size.tiny)
alertcondition(longSignal, "Darth Algo VWAP Reclaim", "Confirmed close reclaimed VWAP with EMA alignment")
alertcondition(shortSignal, "Darth Algo VWAP Rejection", "Confirmed close rejected VWAP with EMA alignment")`
};
async function seedImmediatePrototype(){
 const qa=pineChecks(immediatePrototype.pine);if(!qa.passed)throw Error("BUILTIN_PROTOTYPE_QA_FAILED");
 const sql=db(),logic=pineLogicHash(immediatePrototype.pine),hash=pineHash(immediatePrototype.pine);
 const [prior]=await sql`select id from os_indicator_candidates where logic_hash=${logic}`;if(prior)return String(prior.id);
 const id=randomUUID();
 const [row]=await sql`insert into os_indicator_candidates(id,run_id,candidate,source_hash,logic_hash,qa,score,status)
  values(${id},null,${sql.json(immediatePrototype)},${hash},${logic},${sql.json({...qa,origin:"owner_directed_builtin_prototype",reviewState:"code_ready_static_qa_only"})},${sql.json(scoreIndicator(immediatePrototype))},'qa_blocked') on conflict do nothing returning id`;
 if(row)await sql`insert into os_activity(actor,event,entity_id,details) values('research','indicator_prototype_ready',${id},${sql.json({name:immediatePrototype.name,sourceHash:hash,reviewState:"static_qa_passed"})})`;
 return row?String(row.id):null;
}
export async function labContext(revisionId?:string):Promise<Evidence>{
  const rows=await db()`select id,candidate->>'name' as name,candidate->>'purpose' as purpose,status from os_indicator_candidates order by created_at desc limit 25`;
  const original=revisionId?await db()`select candidate from os_indicator_candidates where id=${revisionId}`:[];
  return {id:"indicator_inventory",status:"verified",checkedAt:new Date().toISOString(),scope:"Our saved prototypes; avoid repeating their purpose or logic. Status is workflow state, not product performance.",data:{existing:rows,revisionOriginal:original[0]?.candidate||null}};
}
export async function syncIndicatorLab(){
  if(!labEnabled() || process.env.AI_OS_ENABLED!=="true" || process.env.VERCEL_ENV!=="production")return {status:"disabled"};
  await ensureIndicatorSchema();
  await queueOwnerNotice("indicator-lab-installed-v2","Indicator Lab is connected to this Command Center. Research → Growth → Indicator Builder uses the server schedule and your existing AI allowance when agents are resumed. Target: up to 3 original prototypes per day. Complete packages receive Approve / Decline. TradingView testing/publishing and broad Instagram/TikTok discovery still need connections; unfinished prototypes are held, not sent as ready releases.",[[{text:"🧪 Indicator Lab",callback_data:"ui:nav:lab"}]]);
  const sql=db();const [control]=await sql`select paused from os_control where id=1`;
  if(!control || control.paused)return {status:"paused"};
  // Owner-authorized, deterministic starter prototype. This keeps prototype
  // creation moving when paid discovery or the hosted TradingView browser is
  // unavailable. Publication remains blocked until real compiler/replay QA.
  await seedImmediatePrototype();
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
          // Compilation, actual chart example and education precede owner approval.
          reason="awaiting_private_test_and_education";
        }
      }
      await tx`insert into os_activity(actor,event,entity_id,details) values('research','indicator_handoff',${run.id},${tx.json({reason})})`;
    });
  }
  await sql`update os_indicator_candidates c set status=case when a.status='pending' and a.expires_at<=now() then 'expired' else a.status end
    from os_approvals a where c.approval_id=a.id and c.status<>'released' and (a.status<>c.status or (a.status='pending' and a.expires_at<=now()))`;
  // A source-verified import uses actual supervised QA evidence, not a fake AI run.
  const {preparePrivateBetaPackage}=await import('./private-beta-package');
  let privatePackage='not_ready';
  try{privatePackage=(await preparePrivateBetaPackage()).status;}catch{privatePackage='education_package_needs_check';}
  const cards=await sql`select approval_id from os_indicator_candidates c where status='pending' and release_package is not null and not exists(select 1 from os_outbox where dedupe_key='approval:' || c.approval_id::text || ':0') order by created_at limit 3`;
  for(const row of cards)await queueApprovalNotice(row.approval_id);
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  let ideaStage="ai_disabled";
  if(process.env.AI_OS_AI_ENABLED==="true" && process.env.AI_OS_AUTONOMY_ENABLED==="true"){
    ideaStage=await syncIndicatorIdeas(day);
    if(ideaStage==="no_supported_idea")await queueOwnerNotice(`indicator-ideas-held:${day}`,"Indicator Lab: Research and Growth completed today's review, but found insufficient supported demand for a new build. No indicator is ready for approval. The Lab will research again tomorrow. Social research connection status: https://www.darthalgo.com/owner/connections");
    const n=Number(process.env.AI_OS_INDICATORS_PER_DAY||"1");const limit=Number.isInteger(n)?Math.max(1,Math.min(3,n)):1;
    const pending=await sql`select id from os_jobs where request_key like 'indicator:%' and status in ('queued','running') limit 1`;
    const [{count}]=await sql`select count(*)::int as count from os_jobs where request_key like ${`indicator:${day}:%`}`;
    if(ideaStage==="ready" && !pending.length && count<limit){
      const [revision]=await sql`select c.id,c.candidate,a.decision_note from os_indicator_candidates c join os_approvals a on a.id=c.approval_id
        where c.status='revision_requested' and not exists(select 1 from os_jobs where request_key like 'indicator:%' and message like '%Revision ID: ' || c.id::text || '%') order by a.decided_at limit 1`;
      await queueJob("indicator_builder",`[INDICATOR_LAB] Act as the Indicator Builder. Generate one original, useful Pine Script v6 indicator prototype from today's Growth-selected ideas in indicator_idea_handoffs and their observed source evidence. Return indicatorCandidate:null if Growth says BUILD_NONE. Do not skip the Research and Growth handoff. Prioritize unmet trader needs and differentiated behavior. Name each indicator Darth Algo followed by a short, familiar trading term that accurately describes its setup or function (for example Opening Range Fakeout or VWAP Pullback only when implemented). Avoid opaque fantasy names and unsupported order-flow or liquidity claims. Explain in plain language what each plotted color or marker means, the exact closed-bar trigger, intended use, supported sessions/timeframes and key limitations in the brief and Pine comments. Never copy, translate or imitate another author's source code. Cite at least two observed URLs. Return indicatorCandidate:null if evidence is insufficient or no distinct idea is warranted. Use closed-bar signals, alertcondition, plots, documented limitations; no request.*, imports, negative plot offsets, varip or timenow. Keep complete Pine below 6500 characters and brief below 700 characters to fit the response budget. All NEW indicators must be FREE: tier=free, monthlyPriceUsd=0. Prepare a public protected Community script with no invite requirement and useful search keywords. Existing paid tools stay unchanged. Do not invent compiler, backtest, sales, or chart results. Do not create tasks or proposals; the server creates the exact approval card. ${revision?`Revision ID: ${revision.id}\nPrior prototype: ${revision.candidate.name}: ${revision.candidate.purpose}\nOwner revision: ${revision.decision_note}`:"Avoid all existing indicator_inventory prototypes."}`,`indicator:${day}:${count+1}`,"schedule");
    }
  }
  const [last]=await sql`select details from os_activity where event='indicator_handoff' order by id desc limit 1`;
  const [counts]=await sql`select count(*)::int as candidates,count(*) filter(where status='pending')::int as pending,count(*) filter(where status='qa_blocked' and qa->>'reviewState'='code_ready_static_qa_only')::int as "prototypeReady" from os_indicator_candidates`;
  const [delivery]=await sql`select count(*)::int as sent from os_outbox o join os_indicator_candidates c on o.dedupe_key='approval:' || c.approval_id::text || ':0' where o.status='sent'`;
  const social=await (await import("./vidiq-connection")).vidiqStatus().catch(()=>null);
  const hosted=await (await import("./hosted-browser")).browserStatus().catch(()=>null);
  const socialState=social?.connected?(social.latest?.status||"awaiting_first_check"):"public_sources_ready";
  return {status:counts.prototypeReady?"prototype_ready":"active",ideaStage,hostedBrowser:hosted?.connected?"connected":"connection_required",hostedBrowserStartsRemaining:hosted?.remainingPilotStarts??null,privatePackage,privateTesting:hosted?.tradingViewVerified&&hosted?.latestCheck?.status==="checked"?"private_runtime_checked":hosted?.latestCheck?.status||"hosted_sign_in_test_required",publishing:"supervised_release_ready",socialDiscovery:socialState==="waiting_for_credits"?"public_sources_fallback":socialState,prototypeReady:counts.prototypeReady,cardsQueued:cards.length,candidates:counts.candidates,pending:counts.pending,cardsDelivered:delivery.sent,lastHandoff:last?.details?.reason||null};
}
export async function indicatorDecisionMessage(id:string,decision:string){
  await db()`update os_indicator_candidates set status=${decision} where approval_id=${id} and status='pending'`;
  return decision==="approved"?"Release package approved: indicator, instruction image and educational post. Saved for supervised exact-version TradingView release; nothing has been published yet.":decision==="revision_requested"?"Revision saved. The Lab will use your notes in the next available daily slot; revised code needs a new approval.":"Indicator declined. It will not be released.";
}
export async function recordIndicatorRelease(id:string,hash:string,url:string,checks:{compiled:boolean;replay:boolean;notes:string;screenshotUrl:string;educationUrl:string;packageHash:string;privacy:string;visibility:string;freeToUse:boolean;inviteRequired:boolean;communitySearchVerified:boolean;addToChartVerified:boolean}){
  if(!freePublicReleaseVerified(checks))throw Error("FREE_PUBLIC_DISCOVERY_REQUIRED");
  if(!validTradingViewRelease(url) || checks.compiled!==true || checks.replay!==true || typeof checks.notes!=="string" || checks.notes.trim().length<30 || checks.notes.length>2000 || !/^https:\/\/www\.tradingview\.com\/x\/[A-Za-z0-9]+\/$/.test(checks.screenshotUrl||""))throw Error("RELEASE_VERIFICATION_REQUIRED");
  if(!/^https:\/\/www\.tradingview\.com\/chart\/[A-Za-z0-9._-]+\/[A-Za-z0-9-]+\/$/.test(checks.educationUrl||""))throw Error("EDUCATIONAL_POST_REQUIRED");
  // This is an authenticated operator attestation, never a model-claimed test.
  await db().begin(async tx=>{
    const [control]=await tx`select paused from os_control where id=1 for share`;if(!control || control.paused)throw Error("OS_PAUSED");
    const [c]=await tx`select c.*,a.status as decision,a.payload,a.payload_hash from os_indicator_candidates c join os_approvals a on a.id=c.approval_id where c.id=${id} for update of c,a`;
    if(!c || c.decision!=="approved" || c.source_hash!==hash || pineHash(c.candidate.pine)!==hash || c.payload.sourceHash!==hash || fingerprint(c.payload)!==c.payload_hash || !pineChecks(c.candidate.pine).passed)throw Error("APPROVED_VERSION_REQUIRED");
    if(c.candidate.tier!=="free" || c.candidate.monthlyPriceUsd!==0)throw Error("FREE_INDICATOR_REQUIRED");
    const p=c.release_package;
    if(!p || p.hash!==checks.packageHash || c.payload.packageHash!==p.hash || fingerprint({sourceHash:p.sourceHash,preview:p.preview,education:p.education,publication:p.publication})!==p.hash || fingerprint(p.publication)!==fingerprint(indicatorReleasePolicy))throw Error("APPROVED_PACKAGE_REQUIRED");
    if(c.status==="released"){if(c.tradingview_url!==url || c.release_evidence.educationUrl!==checks.educationUrl)throw Error("RELEASE_ALREADY_RECORDED");return;}
    await tx`update os_indicator_candidates set status='released',tradingview_url=${url},released_at=now(),release_evidence=${tx.json({...checks,attestedBy:"owner",checkedAt:new Date().toISOString()})} where id=${id}`;
    await tx`update os_indicator_publications set status='completed',script_url=${url},education_url=${checks.educationUrl},completed_at=now() where candidate_id=${id} and package_hash=${checks.packageHash}`;
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
  const stages=await db()`select department,status from os_jobs where request_key like 'indicator-ideas:%' order by created_at desc limit 2`;
  const labels:Record<string,string>={qa_blocked:"Prototype ready · chart compilation/replay still required",pending:"Ready for your decision",approved:"Approved · supervised release ready",declined:"Declined",released:"Published"};
  const social=await (await import("./vidiq-connection")).vidiqStatus().catch(()=>null);
  return `◆ INDICATOR LAB\n\nNew releases: free · public on TradingView\nResearch → Growth → Indicator Builder\n${stages.map(s=>`${s.department}: ${s.status}`).join("\n")}\n\nDaily target: ${Math.max(1,Math.min(3,Number(process.env.AI_OS_INDICATORS_PER_DAY)||1))} original prototypes, within the existing AI budget. Evidence or quality gaps can reduce output.\n\n${rows.map(r=>`${r.name}\n${labels[r.status]||r.status} · screening ${r.score}/90`).join("\n\n")||"First prototype is waiting."}\n\n${latest?`Latest handoff: ${latest.details.reason}`:""}\nTradingView release executor: supervised exact-version flow ready. Instagram/TikTok discovery: ${social?.connected ? (social.latest?.status === "waiting_for_credits" ? "public-source fallback active" : (social.latest?.status || "first scheduled check pending").replaceAll("_"," ")) : "public-source fallback active"}.\nConnections: https://www.darthalgo.com/owner/connections Only fully tested packages with an instruction image and educational example reach Approve / Decline.`;
}

export async function recordPrivateIndicatorPreview(id:string, sourceHash:string, input:unknown) {
  if(!input || typeof input !== "object" || Array.isArray(input)) throw Error("PRIVATE_PREVIEW_REQUIRED");
  const raw=input as Record<string,unknown>;
  const preview={sourceHash,chartUrl:raw.chartUrl,screenshotUrl:raw.screenshotUrl,compiled:raw.compiled,replay:raw.replay,reopened:raw.reopened,notes:raw.notes,checkedAt:new Date().toISOString(),attestedBy:"owner"};
  if(!validPrivatePreview(preview,sourceHash)) throw Error("PRIVATE_PREVIEW_REQUIRED");
  await ensureIndicatorSchema();
  await db().begin(async tx=>{
    const [c]=await tx`select * from os_indicator_candidates where id=${id} for update`;
    if(!c || !["qa_blocked","pending"].includes(c.status) || c.source_hash!==sourceHash || pineHash(c.candidate.pine)!==sourceHash || !pineChecks(c.candidate.pine).passed) throw Error("CURRENT_SOURCE_REQUIRED");
    // An authenticated operator attests to the actual chart; URLs alone prove nothing.
    await tx`update os_indicator_candidates set private_preview=${tx.json(preview)} where id=${id}`;
    await tx`insert into os_activity(actor,event,entity_id,details) values('owner','indicator_private_preview_ready',${id},${tx.json({sourceHash,chartUrl:preview.chartUrl})})`;
  });
  return {ready:true,chartUrl:preview.chartUrl,published:false};
}
