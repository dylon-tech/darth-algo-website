import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft, ArrowUpRight, FlaskConical } from 'lucide-react';
import { ownerCookie, validOwnerSession } from '../../lib/business-os/owner-session';
import { db } from '../../lib/affiliate-db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Darth Algo · Indicator Lab', robots: { index: false, follow: false } };

type CandidateRow = {
  id: string;
  name: string | null;
  purpose: string | null;
  status: string;
  score: { total?: number; outOf?: number } | null;
  created_at: string;
};

function label(status: string) {
  if (status === 'pending') return 'Ready for review';
  if (status === 'prototype_ready') return 'Prototype ready';
  if (status === 'released') return 'Release recorded';
  if (status === 'approved') return 'Approved · awaiting release';
  if (status === 'qa_blocked') return 'Draft · chart test pending';
  return status.replaceAll('_', ' ');
}

export default async function IndicatorLab() {
  const authorized = process.env.AI_OS_ENABLED === 'true' && validOwnerSession((await cookies()).get(ownerCookie)?.value, process.env.AI_OS_OWNER_KEY);
  if (!authorized) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-3xl font-bold">Private Indicator Lab</h1><p className="mt-4 text-zinc-400">Open the CEO Command Center and sign in to review prototypes.</p><Link href="/owner" className="mt-6 inline-block rounded-xl bg-red-600 px-5 py-3 font-semibold">Open Command Center</Link></main>;

  const rows = await db()`select id, candidate->>'name' as name, candidate->>'purpose' as purpose, status, score, created_at from os_indicator_candidates order by created_at desc limit 30` as CandidateRow[];
  return <main className="min-h-screen bg-[#08090c] px-5 pb-28 pt-8 text-zinc-50">
    <div className="mx-auto max-w-5xl">
      <Link href="/owner" className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-300"><ArrowLeft size={17}/> Command Center</Link>
      <header className="mt-8 rounded-3xl border border-white/10 bg-[#11141b] p-7 sm:p-10">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-red-400"><FlaskConical size={22}/></div>
        <p className="mt-7 text-xs font-bold tracking-[.18em] text-zinc-400">PRODUCT PIPELINE</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Indicator Lab</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">Original concepts move from research to prototype, private chart testing, approval, and release. Nothing is marked live without evidence.</p>
        <Link href="/owner/research" className="mt-5 inline-block rounded-xl border border-white/20 px-5 py-3 text-sm text-violet-300">View research and sources →</Link>
      </header>
      <section className="mt-6 grid gap-4">
        {rows.length ? rows.map((item) => <Link key={item.id} href={`/owner/indicators/${item.id}`} className="group rounded-2xl border border-white/10 bg-[#11141b] p-6 transition hover:border-white/20">
          <div className="flex items-start justify-between gap-4"><div><span className="inline-flex rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold capitalize text-zinc-300">{label(item.status)}</span><h2 className="mt-4 text-xl font-semibold">{item.name || 'Untitled indicator concept'}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{item.purpose || 'Open the private review for concept and verification details.'}</p></div><ArrowUpRight className="mt-1 shrink-0 text-zinc-500 transition group-hover:text-white" size={20}/></div>
          <div className="mt-5 flex gap-4 text-xs text-zinc-500"><span>{new Date(item.created_at).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'})}</span>{item.score?.total != null && <span>Opportunity screen {item.score.total}/{item.score.outOf || 100}</span>}</div>
        </Link>) : <div className="rounded-2xl border border-white/10 bg-[#11141b] p-8"><h2 className="text-xl font-semibold">No prototypes yet</h2><p className="mt-3 text-sm leading-6 text-zinc-400">The research agent will add an original candidate when evidence clears the opportunity threshold.</p></div>}
      </section>
    </div>
  </main>;
}
