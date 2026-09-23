import Link from "next/link";
import {cookies} from "next/headers";
import {ownerCookie,validOwnerSession} from "../../../lib/business-os/owner-session";
import {db} from "../../../lib/affiliate-db";
import {notFound} from "next/navigation";
import {pineHash,validPrivatePreview,type IndicatorCandidate} from "../../../lib/business-os/indicator-policy";
import {SourceActions} from "./source-actions";
import {ReviewActions} from "./review-actions";
import {CaptureUpload} from "./capture-upload";
import {CaptureRetry} from "./capture-retry";
import {ensureCaptureJobSchema,captureBlockMessage} from "../../../lib/business-os/indicator-capture-worker";
import {type CaptureMetadata,type CaptureOrigin} from "../../../lib/business-os/indicator-captures";
export const dynamic="force-dynamic";
export const metadata={title:"Darth Algo · Indicator preview",robots:{index:false,follow:false}};
export default async function IndicatorPreview({params}:{params:Promise<{id:string}>}){
  if(process.env.AI_OS_ENABLED!=="true" || !validOwnerSession((await cookies()).get(ownerCookie)?.value,process.env.AI_OS_OWNER_KEY))return <main className="mx-auto max-w-3xl p-8"><h1>Private indicator preview</h1><p>Open your Telegram Command Center and choose Settings → Connect browser to view this prototype.</p></main>;
  const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))notFound();
  await ensureCaptureJobSchema();
  const [r]=await db()`select * from os_indicator_candidates where id=${id}`;if(!r)notFound();
  const [approval]=r.approval_id?await db()`select id,payload_hash from os_approvals where id=${r.approval_id}`:[];
  const [paidRequest]=await db()`select details from os_activity where event='indicator_paid_proposal_requested' and entity_id=${id} and details->>'sourceHash'=${r.source_hash} order by id desc limit 1`;
  const captures=await db()`select id,source_hash,image_hash,metadata,origin,created_at from os_indicator_captures where candidate_id=${id} and source_hash=${r.source_hash} order by created_at desc limit 12` as {id:string;source_hash:string;image_hash:string;metadata:CaptureMetadata;origin:CaptureOrigin;created_at:string}[];
  const [captureJob]=await db()`select status,error_code,attempts,started_at,finished_at from os_indicator_capture_jobs where candidate_id=${id} and source_hash=${r.source_hash}`;
  const [captureControl]=await db()`select blocked_reason from os_indicator_capture_control where id=1`;
  const c=r.candidate as IndicatorCandidate;
  const preview=validPrivatePreview(r.private_preview,r.source_hash) && pineHash(c.pine)===r.source_hash ? r.private_preview : null;
  return <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
    <Link href="/owner/indicators" className="text-sm text-zinc-400">← Indicator gallery</Link>
    <header><p className="text-xs tracking-widest text-violet-300">DARTH ALGO · PRIVATE INDICATOR LAB</p><h1 className="mt-4 text-4xl font-bold">{c.name}</h1><p className="mt-4 max-w-2xl text-lg text-zinc-400">{c.purpose}</p></header>
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-7">
      <h2 className="text-xl font-semibold">Chart previews</h2>
      <p className="mt-2 text-sm text-zinc-400">Free draft · Version {r.source_hash.slice(0,8)} · {r.status==="qa_blocked"?"Needs testing":r.status.replaceAll("_"," ")}</p>
      {captures.map((capture)=><figure key={capture.id} className="mt-6 space-y-3">
        <a href={`/api/owner/indicators/${id}/captures/${capture.id}`} target="_blank" rel="noopener noreferrer"><img src={`/api/owner/indicators/${id}/captures/${capture.id}`} alt={`${c.name}: ${capture.metadata.view==="before"?"chart before indicator":"indicator on chart"}`} className="w-full rounded-xl border border-white/10"/></a>
        <figcaption className="space-y-2 text-sm text-zinc-400">
          <p className="font-semibold text-zinc-200">{capture.metadata.view==="before"?"Before adding indicator · ":""}{capture.origin==="owner_submission"?"Owner-submitted screenshot · not agent validated":capture.origin==="assisted_browser"?"Actual TradingView capture · assisted browser":"Actual TradingView capture · browser worker"}</p>
          <p>{capture.metadata.symbol} · {capture.metadata.timeframe} · {capture.metadata.visibleRange}</p>
          <p>Inputs: {capture.metadata.settings}</p><p>Context: {capture.metadata.marketContext}</p>
          <p>Captured {new Date(capture.metadata.capturedAt).toLocaleString("en-US",{timeZone:"America/New_York"})} Eastern.</p>
          <p>{capture.origin==="owner_submission"?"Owner reports":"Recorded checks"}: compilation {capture.metadata.compiled?"passed":"not confirmed"}; replay {capture.metadata.replay?"checked":"pending"}; reopening {capture.metadata.reopened?"checked":"pending"}.</p>
          <p>{capture.metadata.notes}</p>
          {capture.metadata.chartUrl&&<a className="inline-block text-violet-300 underline" href={capture.metadata.chartUrl} target="_blank" rel="noopener noreferrer">Open chart layout ↗ (may have changed since capture)</a>}
        </figcaption>
      </figure>)}
      {!captures.length&&<p className="mt-4 text-sm text-amber-300">TradingView preview pending. Copy or download the complete Pine below to test this draft.</p>}
      {r.status==="qa_blocked"&&<div className="mt-5 rounded-xl border border-white/10 p-4"><p className="font-semibold">Automatic chart capture: {captureJob?.status==="captured"?"captured":captureControl?.blocked_reason?"blocked":captureJob?.status||"awaiting scheduled check"}</p><p className="mt-2 text-sm text-zinc-400">{captureJob?.status==="captured"?"The image is stored for this exact source. Replay and release are separate.":captureBlockMessage(captureControl?.blocked_reason||captureJob?.error_code)}</p><p className="mt-2 text-xs text-zinc-500">Checked every five minutes within the existing hosted-browser allowance. {captureJob?.attempts||0} of 3 attempts used for this version.</p>{captureJob?.status!=="captured"&&(captureJob?.attempts||0)<3&&<CaptureRetry id={id} sourceHash={r.source_hash}/>}<Link href="/owner/browser" className="mt-3 inline-block text-sm text-violet-300 underline">Open TradingView browser connection</Link></div>}
      {["qa_blocked","pending","approved"].includes(r.status)&&<CaptureUpload id={id} sourceHash={r.source_hash}/>}
      <h3 className="mt-6 font-semibold">Release testing</h3>
      {preview ? <><p className="mt-3 text-sm text-zinc-400">Compilation, chart replay and reopening this saved chart were recorded for this exact version. The link uses your TradingView account’s access.</p><div className="mt-6 flex flex-wrap gap-4"><a href={preview.chartUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-violet-300 px-5 py-3 font-semibold text-black">Open loaded TradingView chart ↗</a><a href={preview.screenshotUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/20 px-5 py-3">View actual chart capture ↗</a></div><p className="mt-4 text-xs text-zinc-500">Verification recorded {new Date(preview.checkedAt).toLocaleString("en-US",{timeZone:"America/New_York"})} Eastern. Saved charts can change after verification.</p></> : <><p className="mt-3 text-sm leading-7 text-zinc-400">Complete release validation is pending. Captures above remain available while compilation, replay and reopening checks are reviewed.</p></>}
    </section>
    <ReviewActions id={id} sourceHash={r.source_hash} stage={r.status} approvalId={approval?.id} payloadHash={approval?.payload_hash}/>
    {paidRequest&&<section className="rounded-2xl border border-white/10 p-5"><h2 className="text-xl font-semibold">Paid proposal request</h2><p className="mt-2 text-sm text-zinc-400">No commercial terms are approved. Existing plans and access are unchanged.</p><p className="mt-3 text-sm">Your rationale: {paidRequest.details.note}</p><p className="mt-2 text-sm text-zinc-400">{paidRequest.details.proposal?.recommendation}</p><p className="mt-2 text-sm text-zinc-400">Overlap: {paidRequest.details.proposal?.paidCatalogOverlap}</p><p className="mt-2 text-sm text-zinc-400">Support: {paidRequest.details.proposal?.supportBurden}</p></section>}
    {r.release_package?.education && <section className="space-y-5 rounded-2xl border border-white/10 p-7"><h2 className="text-2xl font-semibold">Educational post included in your approval</h2><h3 className="text-xl">{r.release_package.education.title}</h3><a href={r.release_package.education.instructionImageUrl} target="_blank" rel="noopener noreferrer"><img src={r.release_package.education.instructionImageUrl} alt="Annotated example showing how to use this indicator" className="w-full rounded-xl" /></a><p className="whitespace-pre-wrap text-zinc-300">{r.release_package.education.body}</p><h3 className="font-semibold">Worked example</h3><p className="text-zinc-400">{r.release_package.education.example}</p><h3 className="font-semibold">When this setup no longer applies</h3><p className="text-zinc-400">{r.release_package.education.invalidation}</p></section>}
    <p className="text-sm text-zinc-400">Build privately → Try on your chart → Approve publication in Telegram → Publish</p>
    <details className="rounded-xl border border-white/10 p-5"><summary className="cursor-pointer font-semibold">About this indicator</summary><div className="mt-5 space-y-4 text-sm text-zinc-400"><p>{c.differentiation}</p><p>For: {c.audience}</p><p>Demand hypothesis: {c.demand}</p><p>Release plan: Free, public on TradingView, no invitation required. {c.pricingRationale}</p><p>Stage: {r.status}. Screening: {r.score.total}/{r.score.outOf}; not a trading-performance score.</p><ul>{c.sourceUrls.map(u=><li key={u}><a className="break-all underline" href={u} rel="noopener noreferrer" target="_blank">{u}</a></li>)}</ul></div></details>
    <details open className="rounded-xl border border-white/10 p-5"><summary className="cursor-pointer font-semibold">Source and verification</summary><div className="mt-5 space-y-4"><p className="text-sm text-zinc-400">Static screening does not prove compilation or trading results. Private chart evidence is recorded by an authenticated operator, not independently certified by this page.</p><ul className="text-xs text-zinc-500">{Object.entries(r.qa.checks).map(([k,v])=><li key={k}>{v?"✓":"✕"} {k}</li>)}</ul><SourceActions source={c.pine} name={c.name}/><p className="break-all text-xs text-zinc-500">Version: {r.source_hash}</p>{r.qa.parentCandidateId&&<p className="text-xs text-zinc-400">Earlier version: <Link className="text-violet-300 underline" href={`/owner/indicators/${r.qa.parentCandidateId}`}>View preserved draft</Link></p>}{preview&&<p className="text-sm text-zinc-400">Chart test notes: {preview.notes}</p>}{r.release_evidence&&<pre className="overflow-auto text-xs">{JSON.stringify(r.release_evidence,null,2)}</pre>}</div></details>
  </main>;
}
