import type { Metadata } from "next";
import Image from "next/image";
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

const features = [
  { title: "Read the direction", copy: "See the trend cloud and dashboard beside your price action, so you can review a signal in context." },
  { title: "Keep the plan visible", copy: "Entry, stop, Target 1 and Target 2 appear on the chart. Evaluate those levels against your own risk limits." },
  { title: "Choose your pace", copy: "Use Scalper for shorter-term setups or Swing for broader moves. Pro includes both tools in one monthly subscription." },
];

export default function AlternativesPage() {
  return (
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <SiteHeader />
      <section className="border-b border-white/10 py-16 sm:py-24">
        <div className="section-shell">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-ember">Another option for your TradingView chart</p>
          <h1 className="mt-5 max-w-4xl text-balance font-display text-4xl font-black leading-tight sm:text-6xl">Considering LuxAlgo or ChartPrime? Meet Darth Algo.</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">Put Darth Algo on your shortlist. Our invite-only TradingView tools bring buy/sell signals, trend context and a visible trade plan together. Pro includes Scalper and Swing for {products.pro.price}/month.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#see-the-tools" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ember px-6 font-bold">See the tools <ArrowRight className="h-4 w-4" /></a>
            <Link href="/start" className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/25 px-6 font-bold">Try the free walkthrough</Link>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-400">Monthly billing. No annual purchase required. A TradingView account is required; its plans and market data are separate.</p>
        </div>
      </section>

      <section id="see-the-tools" aria-labelledby="tools-heading" className="scroll-mt-24 py-16">
        <div className="section-shell">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="font-mono text-xs font-bold uppercase text-ember">The actual product</p><h2 id="tools-heading" className="mt-3 font-display text-3xl font-black sm:text-4xl">Your signal. Your context. Your plan.</h2></div>
            <Link href="/products/pro" className="inline-flex min-h-11 shrink-0 items-center gap-2 font-bold text-white underline underline-offset-4">Explore Pro <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <figure className="mt-8 overflow-hidden rounded-md border border-white/15 bg-black">
            <Image src={products.pro.overview} alt={products.pro.overviewAlt} width={1805} height={767} sizes="(max-width: 1280px) 100vw, 1200px" className="h-auto w-full object-contain" />
            <figcaption className="border-t border-white/10 px-5 py-4 text-xs leading-6 text-zinc-400">Actual Darth Algo product capture. Chart labels show the indicator interface; they do not establish executed fills or investment returns. <a href={products.pro.overview} className="font-semibold text-white underline underline-offset-4">Open the full-size image</a>.</figcaption>
          </figure>
          <div className="mt-8 grid gap-6 md:grid-cols-3">{features.map(feature => <article key={feature.title} className="border-l-2 border-ember pl-5"><h3 className="font-display text-xl font-bold">{feature.title}</h3><p className="mt-3 text-sm leading-7 text-zinc-300">{feature.copy}</p></article>)}</div>
        </div>
      </section>

      <section aria-labelledby="options-heading" className="border-y border-white/10 bg-secondary py-16">
        <div className="section-shell">
          <h2 id="options-heading" className="font-display text-3xl font-black">Compare the product you actually need.</h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">These businesses offer different products. Compare the tools, platform, billing commitment and help included in the exact plan you are considering.</p>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <article className="rounded-md border border-ember/50 bg-black/30 p-6"><h3 className="font-display text-2xl font-bold">Darth Algo</h3><p className="mt-4 text-sm leading-7 text-zinc-300">Invite-only tools inside TradingView, with Scalper and Swing workflows, chart levels, a dashboard and alerts. Pro includes both tools for {products.pro.price}/month.</p><Link href="/compare" className="mt-5 inline-flex min-h-11 items-center font-bold underline underline-offset-4">Compare Darth Algo plans</Link></article>
            <article className="rounded-md border border-white/15 bg-black/30 p-6"><h3 className="font-display text-2xl font-bold">LuxAlgo</h3><p className="mt-4 text-sm leading-7 text-zinc-300">Its published platform plans cover Vela charts, a tool library, orderflow and Quant credits. Features, data and flagship toolkit access vary by tier. Check the platform and billing option that fit your needs.</p><a href="https://www.luxalgo.com/pricing/" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center font-bold underline underline-offset-4">Read LuxAlgo&apos;s plan details</a></article>
            <article className="rounded-md border border-white/15 bg-black/30 p-6"><h3 className="font-display text-2xl font-bold">ChartPrime</h3><p className="mt-4 text-sm leading-7 text-zinc-300">Its published packages combine TradingView tools with community and educational resources. Compare the tools and support included in the selected tier, along with its current monthly or annual terms.</p><a href="https://chartprime.com/" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center font-bold underline underline-offset-4">Read ChartPrime&apos;s plan details</a></article>
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
