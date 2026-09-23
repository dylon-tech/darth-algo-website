import Link from "next/link";
import {cookies} from "next/headers";
import {ownerCookie,validOwnerSession} from "../../lib/business-os/owner-session";
import {indicatorMarketEvidence} from "../../lib/business-os/indicator-research";
import {indicatorIdeaEvidence} from "../../lib/business-os/indicator-ideas";

export const dynamic="force-dynamic";
export const metadata={title:"Darth Algo · Research",robots:{index:false,follow:false}};

type Source={name:string;url:string;kind:string;status:string;checkedAt:string;metadata?:{
  title:string;description:string;links?:{url:string;title:string;summary:string}[];
  discussions?:{url:string;title:string;summary:string;published:string|null}[];
}|null};

export default async function ResearchPage(){
  if(process.env.AI_OS_ENABLED!=="true" || !validOwnerSession((await cookies()).get(ownerCookie)?.value,process.env.AI_OS_OWNER_KEY))return <main className="p-8">Sign in through the private <Link href="/owner">Command Center</Link>.</main>;
  const [market,ideas]=await Promise.all([indicatorMarketEvidence(),indicatorIdeaEvidence()]);
  const sources=((market.data as {sources?:Source[]}|null)?.sources||[]);
  const briefs=(ideas.data||[]) as {department:string;brief:string;finishedAt:string;sources:{url:string}[]}[];
  return <main className="min-h-screen bg-[#08090c] px-5 py-10 text-white"><div className="mx-auto max-w-4xl space-y-8">
    <Link href="/owner/indicators" className="text-violet-300">← Indicator Lab</Link>
    <header><h1 className="mt-5 text-4xl font-bold">Research</h1><p className="mt-3 text-zinc-400">Public observations and saved internal handoffs. Source descriptions are author claims; they do not prove demand or indicator performance.</p><p className="mt-2 text-sm text-zinc-500">Snapshot: {market.checkedAt}. The public-source sample is cached for up to 24 hours.</p></header>
    <section className="space-y-4"><h2 className="text-2xl font-semibold">Source coverage</h2>{sources.map(s=><article key={s.url} className="rounded-2xl border border-white/10 bg-[#11141b] p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{s.name}</h3><span className={s.status==="verified"?"text-emerald-300":"text-amber-300"}>{s.status}</span></div><a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-sm text-violet-300">{s.url}</a><p className="mt-2 text-sm text-zinc-400">Retrieved {s.checkedAt} · {s.kind} · publication date and engagement unknown unless shown below.</p>{s.metadata&&<><p className="mt-3 text-sm">{s.metadata.title}</p><p className="mt-2 text-sm text-zinc-400">{s.metadata.description}</p><ul className="mt-3 space-y-2 text-sm">{[...(s.metadata.links||[]),...(s.metadata.discussions||[])].map((x:{url:string;title:string;summary:string;published?:string|null})=><li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer" className="text-violet-300 underline">{x.title}</a>{x.published&&<span className="text-zinc-500"> · {x.published}</span>}<p className="text-zinc-400">{x.summary}</p></li>)}</ul></>}</article>)}</section>
    <section><h2 className="text-2xl font-semibold">Platform limits</h2><p className="mt-3 text-sm leading-6 text-zinc-400">This public snapshot directly samples TradingView, Reddit and one competitor website. YouTube, X, Instagram and TikTok are not covered by this snapshot. Separate connected providers may supply evidence to scheduled agents; their availability and citations must be checked in each saved handoff. A failed source stays unavailable.</p></section>
    <section className="space-y-4"><h2 className="text-2xl font-semibold">Saved research and growth handoffs</h2>{briefs.length?briefs.map(b=><article key={b.department+b.finishedAt} className="rounded-2xl border border-white/10 p-5"><h3 className="font-semibold capitalize">{b.department} · {b.finishedAt}</h3><p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{b.brief}</p><ul className="mt-3 text-xs">{b.sources.map(s=><li key={s.url}><a href={s.url} className="break-all text-violet-300">{s.url}</a></li>)}</ul></article>):<p className="text-amber-300">No completed handoff for the current New York day.</p>}</section>
  </div></main>;
}
