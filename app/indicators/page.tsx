import Link from "next/link";
import { ArrowRight, Check, FlaskConical, MousePointer2, UserRound, ChartNoAxesCombined } from "lucide-react";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import TradingViewUsernameHelp from "../components/tradingview-username-help";
import { db } from "../lib/affiliate-db";
import { productList, getCheckoutLink } from "../lib/products";
import ProductSpotlight from "../components/product-spotlight";
import ProductGallery from "./product-gallery";
export const dynamic = "force-dynamic";
export const metadata = { title: "Indicator catalog | Darth Algo", description: "Explore free public Darth Algo indicators and compare the paid Swing, Scalper and Pro tools for TradingView.", alternates: { canonical: "/indicators" } };
const accents = { scalp: "text-scalp", swing: "text-swing", pro: "text-pro" };
const buttons = { scalp: "bg-scalp hover:bg-orange-400", swing: "bg-swing hover:bg-blue-500", pro: "bg-pro hover:bg-violet-500" };
export default async function IndicatorCatalog() {
  let rows: Array<{ id: string; name: string; purpose: string; tier: string; url: string }> = [];
  let unavailable = false;
  try { rows = await db()`select id,candidate->>'name' as name,candidate->>'purpose' as purpose,candidate->>'tier' as tier,tradingview_url as url from os_indicator_candidates where status='released' and candidate->>'tier'='free' and release_evidence->>'privacy'='public' and release_evidence->>'freeToUse'='true' and release_evidence->>'communitySearchVerified'='true' and release_evidence->>'addToChartVerified'='true' order by released_at desc`; } catch { unavailable = true; }
  return <>
    <SiteHeader />
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <ProductSpotlight eyebrow="The indicator collection" title="Your chart. More clarity." description="Explore the signals, trend cloud and planned levels. Choose Scalper, Swing or both.">
        <a href="#collection-title" className="product-primary">Explore the tools <ArrowRight size={17} /></a>
        <a href="#access" className="product-secondary">How access works</a>
      </ProductSpotlight>
      <section className="section-shell py-14 sm:py-20" aria-labelledby="collection-title">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-zinc-500">Choose your horizon</p><h2 id="collection-title" className="mt-2 font-display text-3xl font-bold">Three ways to read the market.</h2></div><p className="text-xs text-zinc-400">Select a thumbnail to explore each tool.</p></div>
        <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
          {productList.map((product, index) => <article key={product.slug} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111720]">
            <div className="flex items-center justify-between gap-3 px-5 py-4"><span className={"text-xs font-bold uppercase tracking-wider " + accents[product.color]}>{product.mode}</span><span className="text-[10px] uppercase tracking-wider text-zinc-500">0{index + 1}</span></div>
            <ProductGallery product={product} priority={index === 0} />
            <div className="flex flex-1 flex-col p-6"><div className="flex items-center justify-between gap-2"><h3 className="font-display text-3xl font-bold">{product.shortName}</h3>{product.slug === "pro" && <span className="rounded-full border border-pro/30 bg-pro/10 px-3 py-1 text-[10px] font-bold uppercase text-pro">Both tools</span>}</div><p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">{product.summary}</p><ul className="my-6 space-y-3">{product.features.slice(0, 4).map(feature => <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300"><Check size={15} className={"mt-0.5 shrink-0 " + accents[product.color]} />{feature}</li>)}</ul>
              <div className="mt-auto border-t border-white/10 pt-5"><p><span className="text-3xl font-bold">{product.price}</span><span className="ml-2 text-sm text-zinc-500">/ month</span></p><p className="mt-2 min-h-10 text-xs leading-5 text-zinc-400">{product.slug === "swing" ? "2 days free, then " + product.price + "/month unless canceled." : "Monthly subscription · TradingView invite-only access."}</p><a href={getCheckoutLink(product.slug)} className={"mt-5 flex min-h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white transition " + buttons[product.color]}>{product.slug === "swing" ? "Start 2-day free trial" : "Get " + product.shortName + " access"}<ArrowRight size={16} /></a><Link href={"/products/" + product.slug} className="mt-3 flex min-h-10 items-center justify-center text-xs font-semibold text-zinc-400 hover:text-white">Explore all features →</Link></div>
            </div>
          </article>)}
        </div>
        <p className="mt-5 text-xs leading-6 text-zinc-500">Actual product screenshots illustrate chart features, not guaranteed outcomes. Preview images are not live market data.</p>
      </section>
      <section id="access" className="border-y border-white/10 bg-[#090d13] py-16 sm:py-20">
        <div className="section-shell"><p className="text-xs font-bold uppercase tracking-widest text-ember">From checkout to chart</p><h2 className="mt-3 font-display text-4xl font-bold">How to get your indicator.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">Use your existing TradingView account. Enter your exact username at checkout for automatic indicator access immediately after purchase.</p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">{[{ icon: MousePointer2, title: "Choose your tool", text: "Select Get access above, or start the Swing trial. Complete your subscription through Stripe." }, { icon: UserRound, title: "Add your TradingView username", text: "Enter your exact TradingView username in the required checkout field so we can invite the right account." }, { icon: ChartNoAxesCombined, title: "Open it on your chart", text: "After checkout, open TradingView → Indicators → Invite-only scripts and select your Darth Algo tool." }].map((step, index) => <div key={step.title}><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03]"><step.icon size={18} /></span><span className="font-mono text-xs text-zinc-600">STEP 0{index + 1}</span></div><h3 className="font-bold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-zinc-400">{step.text}</p></div>)}</div>
          <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6"><TradingViewUsernameHelp /><Link href="/support" className="text-sm text-zinc-400 hover:text-white">Need help with access? Contact support →</Link></div>
        </div>
      </section>
      <section id="free-indicators" className="section-shell py-16"><div className="flex items-center gap-3 text-zinc-400"><FlaskConical size={20} /><span className="text-xs font-bold uppercase tracking-widest">Darth Algo Lab</span></div><h2 className="mt-4 font-display text-3xl font-bold">Free tools. Find them on TradingView.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">New Lab indicators are free to use. After release, search their exact Darth Algo name in TradingView → Indicators → Community, or open the link below and add the tool to your chart. No purchase or invitation is required.</p>
        {rows.length ? <div className="mt-7 grid gap-4 md:grid-cols-2">{rows.map(row => <article key={row.id} className="rounded-xl border border-white/10 p-6"><p className="text-xs uppercase text-ember">Free · Public on TradingView</p><h3 className="mt-2 text-xl font-bold">{row.name}</h3><p className="mt-3 text-sm text-zinc-400">{row.purpose}</p><a href={row.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Open free indicator on TradingView <ArrowRight size={16} /></a></article>)}</div> : <p className="mt-6 rounded-lg border border-dashed border-white/15 p-5 text-sm text-zinc-500">{unavailable ? "Lab releases are temporarily unavailable. The tools above are available to explore." : "The first free releases are still being prepared and tested. Only verified public releases appear here."}</p>}
      </section>
    </main>
    <SiteFooter />
  </>;
}
