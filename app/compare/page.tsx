import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import ProductSpotlight from "../components/product-spotlight";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { products } from "../lib/products";

export const metadata: Metadata = {
  title: "Scalper vs Swing vs Pro: Compare Darth Algo TradingView Tools",
  description: "Compare Darth Algo Scalper, Swing and Pro by trading style, chart workflow and price. See actual indicator screenshots and choose the tool that fits your process.",
  alternates: { canonical: "/compare" },
};

const choices = [
  { product: products.scalper, fit: "You trade active intraday sessions", detail: "Responsive trend context and short-term signals for active sessions.", href: "/#scalper-plan", cta: "Choose Scalper" },
  { product: products.swing, fit: "You follow broader directional moves", detail: "Broader trend context and more selective signals. Try the workflow free for two days.", href: "/#swing-trial", cta: "Try Swing free for 2 days" },
  { product: products.pro, fit: "You use both trading styles", detail: "Both tools, one subscription. $29/month instead of $33.98 for the separate plans.", href: "/#pro-plan", cta: "Choose Pro" },
];

export default function ComparePage() {
  return (
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <SiteHeader />
      <ProductSpotlight eyebrow="Find your trading rhythm" title="Scalp. Swing. Or do both." description="See both styles on the chart. Then choose the access that fits your routine.">
        <a href="#compare-tools" className="product-primary">Find my fit <ArrowRight size={17} /></a>
        <Link href="/start" className="product-secondary">Try the free walkthrough</Link>
      </ProductSpotlight>

      <section id="compare-tools" aria-labelledby="comparison-title" className="scroll-mt-24 py-16 sm:py-24">
        <div className="section-shell">
          <h2 id="comparison-title" className="font-display text-3xl font-black sm:text-4xl">Three paths. One clear trading process.</h2>
          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {choices.map(({ product, fit, detail, href, cta }) => (
              <article key={product.slug} className="flex flex-col overflow-hidden rounded-md border border-white/15 bg-card">
                <div className="relative aspect-video border-b border-white/10"><Image src={product.overview} alt={product.overviewAlt} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-contain" /></div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="font-mono text-xs font-bold uppercase text-ember">{product.shortName}</p>
                  <h3 className="mt-3 font-display text-2xl font-bold">{fit}</h3>
                  <p className="mt-4 text-sm leading-7 text-zinc-300">{detail}</p>
                  <p className="mt-5 text-xl font-bold">{product.price}<span className="mt-1 block text-xs font-normal leading-6 text-zinc-400">{product.cadence}</span></p>
                  <ul className="my-6 space-y-3">{product.features.slice(0, 3).map(feature => <li key={feature} className="flex gap-2 text-sm leading-6 text-zinc-300"><Check className="mt-1 h-4 w-4 shrink-0 text-ember" />{feature}</li>)}</ul>
                  <Link href={href} className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ember px-4 text-sm font-bold">{cta}<ArrowRight className="h-4 w-4" /></Link>
                  <Link href={`/products/${product.slug}`} className="mt-2 inline-flex min-h-11 items-center justify-center text-sm font-semibold text-zinc-300 underline underline-offset-4">See {product.shortName} on the chart</Link>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-zinc-400">Pro saves $4.98/month compared with buying both monthly tools separately, before any applicable tax. If you only need one trading style, the single-tool plan costs less.</p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-secondary py-16">
        <div className="section-shell grid gap-10 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs font-bold uppercase text-ember">Before you choose</p>
            <h2 className="mt-4 font-display text-3xl font-black">Check the workflow on your chart.</h2>
            <ol className="mt-6 list-decimal space-y-4 pl-5 text-sm leading-7 text-zinc-300">
              <li>Choose the tool that matches the pace you already trade.</li>
              <li>Read the trend context, then evaluate a signal and its entry, stop, and targets together.</li>
              <li>Decide whether that information improves the clarity of your process. A signal is not a guaranteed result.</li>
            </ol>
            <Link href="/start" className="mt-6 inline-flex min-h-12 items-center gap-2 font-bold text-white underline underline-offset-4">Try the free chart walkthrough <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="rounded-md border border-white/15 bg-black/30 p-6 sm:p-8">
            <h2 className="font-display text-3xl font-black">What happens after checkout?</h2>
            <p className="mt-5 text-sm leading-7 text-zinc-300">TradingView access is granted automatically using the exact username you enter at checkout. Sign in to that account, open Indicators → Invite-only scripts, and add your tool.</p>
            <p className="mt-4 text-sm leading-7 text-zinc-300">The Swing trial starts at checkout and lasts two days. It then costs $14.99/month. Check your confirmation for timing and cancellation details.</p>
            <Link href="/start#setup-title-details" className="mt-5 inline-flex min-h-11 items-center font-bold text-white underline underline-offset-4">Read the setup guide</Link>
            <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-7 text-zinc-400">Already subscribed? <Link href="/support" className="font-semibold text-white underline underline-offset-4">Contact support about changing plans</Link> before starting another subscription.</p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="section-shell flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-display text-3xl font-black">Prefer lifetime access?</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">The $134.99 one-time Lifetime plan includes all tools, future updates, source code, and commercial rights. Review the full plan and terms before choosing.</p></div>
          <Link href="/#lifetime-plan" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-ember/60 px-6 font-bold">View Lifetime <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
      <div className="section-shell pb-10"><Link href="/alternatives" className="text-sm text-zinc-300 underline underline-offset-4">Comparing other indicator brands? See where Darth Algo fits.</Link></div>
      <SiteFooter />
    </main>
  );
}
