import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import ProductSpotlight from "../components/product-spotlight";

export const metadata: Metadata = {
  title: "About Darth Algo",
  description: "Meet Darth Algo: TradingView indicators for futures traders. Explore real Scalper, Swing and Pro chart examples.",
  alternates: { canonical: "/about-darth-algo" },
};
export default function AboutDarthAlgo() {
  return <main id="main-content" className="min-h-screen bg-obsidian text-white"><SiteHeader />
    <ProductSpotlight eyebrow="The official Darth Algo" title="Built around the chart. Built for your process." description="TradingView indicators that put signals, trend context and your trade plan in the same view.">
      <Link href="/products/pro" className="product-primary">Meet Darth Algo Pro →</Link>
      <Link href="/compare" className="product-secondary">Find your trading style</Link>
    </ProductSpotlight>
    <section className="section-shell grid gap-10 py-16 md:grid-cols-2">
      <div><p className="product-eyebrow">One brand. Three tools.</p><h2 className="mt-3 font-display text-3xl font-bold">A tool for the way you trade.</h2><ul className="mt-5 space-y-4 text-zinc-300"><li><Link href="/products/scalper" className="underline underline-offset-4">Scalper</Link> — active intraday sessions.</li><li><Link href="/products/swing" className="underline underline-offset-4">Swing</Link> — broader directional moves.</li><li><Link href="/products/pro" className="underline underline-offset-4">Pro</Link> — both in one monthly plan.</li><li><Link href="/#lifetime-plan" className="underline underline-offset-4">Lifetime</Link> — review full access and license terms.</li></ul></div>
      <div><h2 className="font-display text-2xl font-bold">Make sure you’re in the right place.</h2><p className="mt-4 text-sm leading-7 text-zinc-300">Darth Algo, DarthAlgo and darth.algo are our official brand at darthalgo.com. We are not “Dark Algo,” “Dark Algo EA,” or an MT4/MT5 trading robot.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/links" className="product-secondary">Official links</Link><Link href="/company/founder/dylon-d-feagin" className="product-secondary">Meet the founder</Link></div></div>
    </section><SiteFooter />
  </main>;
}
