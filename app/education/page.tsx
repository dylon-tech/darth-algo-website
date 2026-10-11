import type { Metadata } from "next";
import ProductSpotlight from "../components/product-spotlight";
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
      <ProductSpotlight eyebrow="Learn with Darth Algo" title="Know what your chart is telling you." description="Start with the trend. Read the signal. Check the risk. Learn each layer on a real indicator example." product="swing">
        <Link href="/start?campaign=chart_clarity" className="product-primary">Start the free walkthrough →</Link>
        <a href="#lessons" className="product-secondary">Browse the lessons</a>
        <p className="product-terms">Educational content only, never financial advice.</p>
      </ProductSpotlight>
      <div id="lessons" />
      <section className="py-16 sm:py-24"><div className="section-shell"><Link href="/start?campaign=chart_clarity" className="block rounded-xl border border-swing/40 bg-swing/10 p-6 hover:bg-swing/20"><span className="text-sm font-bold uppercase text-blue-200">Start with a real chart example</span><h2 className="mt-2 text-2xl font-bold">Try the free interactive walkthrough</h2><p className="mt-3 text-base leading-7 text-zinc-300">Read context, invalidation, and targets. Three short steps, no signup needed.</p></Link><EducationLibrary /></div></section>
      <SiteFooter />
    </main>
  );
}
