import type { Metadata } from "next";
import ProductSpotlight from "../components/product-spotlight";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { getCheckoutLink, products } from "../lib/products";

const title = "Comparing LuxAlgo and ChartPrime? Meet Darth Algo";
const description = "Explore Darth Algo as another option for your TradingView workflow. See real indicator screenshots, Scalper and Swing features, and Pro at $29/month.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/alternatives" },
  openGraph: { title, description, url: "/alternatives", type: "website", images: [{ url: products.pro.overview, width: 1805, height: 767, alt: products.pro.overviewAlt }] },
  twitter: { card: "summary_large_image", title, description, images: [products.pro.overview] },
};

export default function AlternativesPage() {
  return (
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <SiteHeader />
      <ProductSpotlight eyebrow="Darth Algo for TradingView" title="See the setup. Keep the plan in view." description="Buy/sell signals, trend context, entry, stop and targets. Explore the indicator before you choose it." id="see-the-tools">
        <Link href="/products/pro" className="product-primary">Explore Pro — $29/month <ArrowRight size={17} /></Link>
        <Link href="/start" className="product-secondary">Learn to read the chart</Link>
        <p className="product-terms">Scalper + Swing included. Monthly billing. No annual purchase required. TradingView plans and market data are separate.</p>
      </ProductSpotlight>

      <section aria-labelledby="options-heading" className="border-y border-white/10 bg-secondary py-16">
        <div className="section-shell">
          <h2 id="options-heading" className="font-display text-3xl font-black">Comparing LuxAlgo or ChartPrime?</h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">Start with the workflow you need—not the longest feature list.</p>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <article className="rounded-md border border-ember/50 bg-black/30 p-6"><h3 className="font-display text-2xl font-bold">Darth Algo</h3><p className="mt-4 text-sm leading-7 text-zinc-300">Scalper + Swing on TradingView. Signals, trend context, planned levels and alerts. Both tools: {products.pro.price}/month.</p><Link href="/compare" className="mt-5 inline-flex min-h-11 items-center font-bold underline underline-offset-4">Compare Darth Algo plans</Link></article>
            <article className="rounded-md border border-white/15 bg-black/30 p-6"><h3 className="font-display text-2xl font-bold">LuxAlgo</h3><p className="mt-4 text-sm leading-7 text-zinc-300">Vela charts, a tool library, orderflow and Quant credits. Platform, data and toolkit access vary by tier.</p><a href="https://www.luxalgo.com/pricing/" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center font-bold underline underline-offset-4">Read LuxAlgo&apos;s plan details</a></article>
            <article className="rounded-md border border-white/15 bg-black/30 p-6"><h3 className="font-display text-2xl font-bold">ChartPrime</h3><p className="mt-4 text-sm leading-7 text-zinc-300">TradingView tools with community and educational resources. Check the selected tier and its monthly or annual terms.</p><a href="https://chartprime.com/" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center font-bold underline underline-offset-4">Read ChartPrime&apos;s plan details</a></article>
          </div>
          <p className="mt-5 text-xs leading-6 text-zinc-400">Competitor descriptions checked October 10, 2026 against the linked official pages. Offers can change. This comparison is published by Darth Algo; there is no affiliation or endorsement by LuxAlgo or ChartPrime. Features and performance are not claimed to be equivalent.</p>
        </div>
      </section>

      <section aria-labelledby="price-heading" className="py-16 sm:py-20">
        <div className="section-shell grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="font-mono text-xs font-bold uppercase text-ember">Keep your monthly choice simple</p>
            <h2 id="price-heading" className="mt-4 font-display text-4xl font-black">Both styles. {products.pro.price}/month.</h2>
            <ul className="mt-6 space-y-3">{["Scalper and Swing included", "Entry, stop and target levels", "Trend dashboard and TradingView alerts"].map(item => <li key={item} className="flex gap-3 text-sm leading-7 text-zinc-300"><Check className="mt-1 h-5 w-5 shrink-0 text-ember" />{item}</li>)}</ul>
            <a href={getCheckoutLink("pro")} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ember px-6 font-bold">Get Darth Algo Pro <ArrowRight className="h-4 w-4" /></a>
            <p className="mt-4 max-w-md text-xs leading-6 text-zinc-400">{products.pro.price}/month, plus applicable tax. Renews monthly; cancel future renewals from your billing portal. Review the <Link href="/refund-policy" className="underline underline-offset-4">refund policy</Link> before purchasing.</p>
          </div>
          <div className="rounded-md border border-white/15 bg-card p-6 sm:p-8">
            <h3 className="font-display text-2xl font-bold">Prefer one trading style?</h3>
            <p className="mt-4 text-sm leading-7 text-zinc-300"><Link href="/products/scalper" className="font-bold text-white underline underline-offset-4">Scalper is {products.scalper.price}/month</Link>. <Link href="/products/swing" className="font-bold text-white underline underline-offset-4">Swing is {products.swing.price}/month after its two-day free trial</Link>. The trial starts at checkout. Lifetime access remains available for $134.99 one time; <Link href="/#lifetime-plan" className="text-white underline underline-offset-4">review the full Lifetime terms</Link>.</p>
            <h3 className="mt-7 font-display text-xl font-bold">Ready on your TradingView account</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-300">Enter your exact TradingView username at checkout for automatic access. Open Indicators → Invite-only scripts to add your tool. Use the <Link href="/start#setup-title-details" className="text-white underline underline-offset-4">setup guide</Link> if you need help.</p>
            <p className="mt-4 text-sm leading-7 text-zinc-400">Already subscribed? <Link href="/support" className="font-semibold text-white underline underline-offset-4">Ask support about your existing plan</Link> before starting another subscription.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
