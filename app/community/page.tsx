import type { Metadata } from "next";
import { ArrowRight, BookOpen, Bot, ChartNoAxesCombined, Check, MessageCircle, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { normalizeCampaign, normalizeGrowthSource } from "../lib/growth-db";
import CommunityTracker from "./community-tracker";

export const metadata: Metadata = {
  title: "Free Futures Trading Community | Darth Algo",
  description: "Join the free Darth Algo Telegram community for futures education, chart breakdowns, TradingView setup help, and trader discussion.",
  alternates: { canonical: "/community" },
  openGraph: {
    title: "Join the Darth Algo Futures Community",
    description: "Free futures education, chart breakdowns, indicator setup help, and trader discussion.",
    url: "/community",
    images: [{ url: "/hero/darth-algo-before-after.jpg", width: 1254, height: 1254, alt: "Darth Algo TradingView chart comparison" }],
  },
};

const benefits = [
  [BookOpen, "Futures education", "Practical lessons focused on market structure, risk, and repeatable trading routines."],
  [ChartNoAxesCombined, "Chart breakdowns", "Visual examples covering ES, NQ, GC, CL, trend conditions, and choppy sessions."],
  [Bot, "D.A. Assistant", "Fast answers about plans, TradingView setup, access, and customer support."],
  [Users, "Trader discussion", "A moderated space where members can compare ideas, share wins, and learn together."],
] as const;

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ source?: string; campaign?: string }> }) {
  const params = await searchParams;
  const source = normalizeGrowthSource(params.source);
  const campaign = normalizeCampaign(params.campaign);
  const joinHref = `/go/community?source=${encodeURIComponent(source)}&campaign=${encodeURIComponent(campaign)}`;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <CommunityTracker source={source} campaign={campaign} />
      <SiteHeader />
      <main id="main-content">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-grid bg-[size:42px_42px] opacity-40" aria-hidden="true" />
          <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-ember/15 blur-[130px]" aria-hidden="true" />
          <div className="section-shell relative grid gap-12 py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Free Telegram community
              </span>
              <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">Trade with more <span className="text-ember">structure.</span> Learn with other traders.</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">Join the official Darth Algo community for concise futures education, chart breakdowns, TradingView setup help, product updates, and real conversations with other traders.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={joinHref} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-ember px-7 text-base font-black shadow-glow transition hover:bg-red-500">
                  Join the Free Community <ArrowRight className="h-5 w-5" />
                </a>
                <Link href="/#pricing" className="inline-flex min-h-14 items-center justify-center rounded-md border border-white/15 bg-white/[.04] px-7 text-base font-bold transition hover:bg-white/[.08]">View Indicator Plans</Link>
              </div>
              <p className="mt-4 text-xs leading-5 text-zinc-500">Free to join. No profit promises or personalized financial advice. Trading involves risk.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111720]/95 p-5 shadow-2xl shadow-black/40 sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div><p className="text-xs font-black uppercase tracking-[.2em] text-ember">Darth Algo</p><h2 className="mt-1 text-2xl font-black">Community Control Center</h2></div>
                <MessageCircle className="h-8 w-8 text-ember" />
              </div>
              <div className="mt-6 space-y-3">
                {["Choose the right indicator plan", "Follow visual setup walkthroughs", "Receive futures education drops", "Ask D.A. Assistant for support", "Apply to become a creator affiliate"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-4 text-sm font-semibold text-zinc-200"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><Check className="h-4 w-4" /></span>{item}</div>
                ))}
              </div>
              <a href={joinHref} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-white font-black text-black transition hover:bg-zinc-200">Open Telegram <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <section className="section-shell py-20">
          <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-ember">Built for useful participation</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">What members get inside</h2><p className="mt-4 text-zinc-400">A focused community designed to help traders get answers quickly without drowning them in promotional messages.</p></div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {benefits.map(([Icon, title, copy]) => <article key={title} className="rounded-xl border border-white/10 bg-[#111720] p-7"><Icon className="h-7 w-7 text-ember" /><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-zinc-400">{copy}</p></article>)}
          </div>
        </section>

        <section className="border-y border-white/10 bg-black/20">
          <div className="section-shell grid gap-8 py-16 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><div className="flex items-center gap-3 text-emerald-300"><ShieldCheck className="h-6 w-6" /><span className="text-sm font-black uppercase tracking-[.18em]">Moderated and risk-aware</span></div><h2 className="mt-4 text-3xl font-black sm:text-4xl">Ready to enter the community?</h2><p className="mt-3 max-w-2xl text-zinc-400">Start with free education and discussion. If you later want the indicator, the assistant can help you compare every plan without pressure.</p></div>
            <a href={joinHref} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-ember px-8 font-black shadow-glow transition hover:bg-red-500">Join Darth Algo <ArrowRight className="h-5 w-5" /></a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
