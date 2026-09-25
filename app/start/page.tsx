import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { normalizeCampaign, normalizeGrowthSource } from "../lib/growth-db";
import ChartWalkthrough from "./chart-walkthrough";
import FeatureExplorer from "./feature-explorer";

export const metadata: Metadata = {
  title: "Read Your Chart: Free Darth Algo Walkthrough",
  description: "Learn to read market context, entry, invalidation and targets with a free interactive Darth Algo chart walkthrough and practical checklist.",
  alternates: { canonical: "/start" },
  openGraph: { title: "Understand your chart before your next session", description: "A free chart walkthrough: context, invalidation, targets.", url: "/start" },
  twitter: { title: "Read your chart with Darth Algo", description: "Explore the free interactive chart walkthrough." },
};

type Params = Record<string, string | string[] | undefined>;
const first = (value: Params[string]) => Array.isArray(value) ? value[0] : value;

export default async function StartPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const source = normalizeGrowthSource(first(params.source) || first(params.utm_source));
  const campaign = normalizeCampaign(first(params.campaign) || first(params.utm_campaign) || "chart_clarity");
  const communityHref = `/community?${new URLSearchParams({ source, campaign })}`;
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <SiteHeader />
      <main id="main-content" className="section-shell py-7 sm:py-10">
        <div className="mb-6 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300">Free chart walkthrough · No signup needed</p>
          <h1 className="mt-3 text-balance text-3xl font-black leading-tight sm:text-4xl">Explore what your chart is telling you.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">Tap a feature to find it on a real Darth Algo chart. Zoom in for a closer look, then test your understanding.</p>
        </div>
        <FeatureExplorer />
        <ChartWalkthrough />
        <section aria-labelledby="checklist-title" className="mt-12 grid gap-8 border-y border-white/10 py-10 lg:grid-cols-2">
          <div><p className="text-sm font-bold uppercase tracking-wider text-blue-300">Keep this checklist</p><h2 id="checklist-title" className="mt-3 text-3xl font-bold">Before you consider a setup.</h2><p className="mt-4 text-base leading-7 text-zinc-400">Use this process on another chart. Clear levels help organize a decision; they do not remove trading risk.</p></div>
          <ol className="space-y-4 text-base leading-7 text-zinc-200">
            <li><strong className="text-white">1. Context:</strong> identify direction, timeframe, and whether the market is trending or choppy.</li>
            <li><strong className="text-white">2. Invalidation:</strong> identify the stop area and evaluate position size and potential loss.</li>
            <li><strong className="text-white">3. Targets:</strong> compare possible exits with downside, execution costs, and your own plan.</li>
          </ol>
        </section>
        <section aria-labelledby="community-title" className="mt-10 rounded-2xl border border-blue-400/25 bg-blue-400/[.06] p-6 sm:p-9">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="text-sm font-bold uppercase tracking-wider text-blue-300">Keep learning together</p><h2 id="community-title" className="mt-3 text-3xl font-bold">Bring your questions to the community.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">Explore the free Darth Algo Telegram community for chart discussions, short lessons, and TradingView setup help.</p></div>
            <Link href={communityHref} className="inline-flex min-h-14 items-center justify-center rounded-lg bg-ember px-7 text-base font-bold text-white hover:bg-red-500">Explore the free community</Link>
          </div>
        </section>
        <section aria-labelledby="setup-title" className="mt-12 grid gap-8 lg:grid-cols-2">
          <div><h2 id="setup-title" className="text-2xl font-bold">Want to try the tool?</h2><p className="mt-4 text-base leading-7 text-zinc-300">Swing offers a two-day trial, then $14.99/month unless canceled. The trial starts at checkout. Access is manually activated, usually within 24 hours.</p><Link href="/#swing-trial" className="mt-5 inline-flex min-h-12 items-center rounded-lg border border-white/25 px-5 text-base font-bold hover:bg-white/5">Review the Swing trial</Link></div>
          <div><h2 id="setup-title-details" className="text-2xl font-bold">Already have access?</h2><ol aria-labelledby="setup-title-details" className="mt-4 list-inside list-decimal space-y-2 text-base leading-7 text-zinc-300"><li>Open your TradingView chart.</li><li>Open Indicators, then Invite-only scripts.</li><li>Add your Darth Algo tool and review its settings.</li></ol><Link href="/support" className="mt-5 inline-flex min-h-12 items-center text-base font-semibold text-blue-200 underline underline-offset-4">Get help with access or setup</Link></div>
        </section>
        <p className="mt-12 text-sm leading-6 text-zinc-400">Educational product demonstration only, not financial advice. Trading involves risk. Selected historical screenshots do not establish typical results or future performance.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
