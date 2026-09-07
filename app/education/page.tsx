import type { Metadata } from "next";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import EducationLibrary from "./education-library";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trading Education | Darth Algo",
  description: "Beginner-friendly trading education about market structure, risk planning, trend confirmation, TradingView alerts, and disciplined execution.",
  alternates: { canonical: "/education" },
};

export default function EducationPage() {
  return (
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/10 py-16 sm:py-24">
        <div aria-hidden="true" className="absolute inset-0 bg-grid bg-[size:48px_48px] opacity-[0.12]" />
        <div className="section-shell relative">
          <p className="font-mono text-[10px] font-bold uppercase text-swing">Darth Algo Education</p>
          <h1 className="mt-5 max-w-4xl text-balance font-display text-5xl font-black leading-[0.98] sm:text-7xl">Learn the process behind the chart.</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400">Clear, practical education for understanding signals, market context, and defined risk. Educational content only, never financial advice.</p>
        </div>
      </section>
      <section className="py-16 sm:py-24"><div className="section-shell"><Link href="/start?campaign=chart_clarity" className="block rounded-xl border border-swing/40 bg-swing/10 p-6 hover:bg-swing/20"><span className="text-sm font-bold uppercase text-blue-200">Start with a real chart example</span><h2 className="mt-2 text-2xl font-bold">Try the free interactive walkthrough</h2><p className="mt-3 text-base leading-7 text-zinc-300">Read context, invalidation, and targets. Three short steps, no signup needed.</p></Link><EducationLibrary /></div></section>
      <SiteFooter />
    </main>
  );
}
