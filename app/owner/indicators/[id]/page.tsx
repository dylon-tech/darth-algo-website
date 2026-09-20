import Link from "next/link";
import {cookies} from "next/headers";
import {ownerCookie,validOwnerSession} from "../../../lib/business-os/owner-session";
import {db} from "../../../lib/affiliate-db";
import {notFound} from "next/navigation";
import type {IndicatorCandidate} from "../../../lib/business-os/indicator-policy";
export const dynamic="force-dynamic";
export const metadata={title:"Darth Algo · Indicator preview",robots:{index:false,follow:false}};
export default async function IndicatorPreview({params}:{params:Promise<{id:string}>}){
  if(process.env.AI_OS_ENABLED!=="true" || !validOwnerSession((await cookies()).get(ownerCookie)?.value,process.env.AI_OS_OWNER_KEY))return <main className="mx-auto max-w-3xl p-8"><h1>Private indicator preview</h1><p>Open your Telegram Command Center and choose Settings → Connect browser to view this prototype.</p></main>;
  const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))notFound();
  const [r]=await db()`select * from os_indicator_candidates where id=${id}`;if(!r)notFound();
  const c=r.candidate as IndicatorCandidate;
  return <main className="mx-auto max-w-4xl space-y-6 p-8"><Link href="/owner">← Command Center</Link><p className="text-red-400">DARTH ALGO · INDICATOR LAB</p><h1 className="text-3xl font-bold">{c.name}</h1><p>{c.purpose}</p><p>{c.differentiation}</p><p>Audience: {c.audience}</p><p>Demand hypothesis: {c.demand}</p><p>Recommendation: {c.tier}{c.tier==="paid"?` · $${c.monthlyPriceUsd}/month`:""}. {c.pricingRationale}</p><p>Stage: {r.status}. Screening: {r.score.total}/{r.score.outOf}.</p><p>Static checks are screening only. TradingView compilation, chart replay and performance testing have not been completed unless release evidence below records them. No trading results are promised.</p><ul>{Object.entries(r.qa.checks).map(([k,v])=><li key={k}>{v?"✓":"✕"} {k}</li>)}</ul><h2 className="text-xl">Original source</h2><pre className="overflow-auto rounded bg-black p-5 text-sm">{c.pine}</pre><p className="break-all text-xs">Version: {r.source_hash}</p><h2>Observed sources</h2><ul>{c.sourceUrls.map(u=><li key={u}><a className="underline" href={u} rel="noopener noreferrer" target="_blank">{u}</a></li>)}</ul><h2>Release checklist</h2><p>Compile this exact version in TradingView. Test at least two symbols and three timeframes, including insufficient history, session boundaries and closed-bar alert behavior. Save a TradingView chart screenshot and the checks performed. Publish through the authorized TradingView account after approval, then record the public script URL and test evidence.</p>{r.release_evidence&&<pre>{JSON.stringify(r.release_evidence,null,2)}</pre>}</main>;
}
