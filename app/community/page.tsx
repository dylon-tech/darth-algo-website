import type { Metadata } from "next";
import { ArrowRight, BookOpen, Bot, ChartNoAxesCombined, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import ProductSpotlight, { ExploreTools } from "../components/product-spotlight";
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
        <ProductSpotlight eyebrow="Free Darth Algo community" title="Bring your chart. Ask better questions." description="Learn the indicator, discuss setups and get help putting it on TradingView." product="scalper">
          <a href={joinHref} className="product-primary">Join the Free Community <ArrowRight size={17} /></a>
          <Link href="/products/pro" className="product-secondary">Explore the indicator</Link>
          <p className="product-terms">Free to join. No profit promises or personalized financial advice. Trading involves risk.</p>
        </ProductSpotlight>

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
      <ExploreTools />
      <SiteFooter />
    </div>
  );
}
