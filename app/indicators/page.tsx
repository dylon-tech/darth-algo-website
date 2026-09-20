import Link from "next/link";
import { ArrowRight, Check, FlaskConical, LockKeyhole, MousePointer2, UserRound, ChartNoAxesCombined } from "lucide-react";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import TradingViewUsernameHelp from "../components/tradingview-username-help";
import { db } from "../lib/affiliate-db";
import { productList, getCheckoutLink } from "../lib/products";
import ProductGallery from "./product-gallery";
export const dynamic = "force-dynamic";
export const metadata = { title: "Indicator catalog | Darth Algo", description: "Preview real Darth Algo charts, compare Scalper, Swing and Pro, and get invite-only TradingView access.", alternates: { canonical: "/indicators" } };
const accents = { scalp: "text-scalp", swing: "text-swing", pro: "text-pro" };
const buttons = { scalp: "bg-scalp hover:bg-orange-400", swing: "bg-swing hover:bg-blue-500", pro: "bg-pro hover:bg-violet-500" };
export default async function IndicatorCatalog() {
  let rows: Array<{ id: string; name: string; purpose: string; tier: string; url: string }> = [];
  let unavailable = false;
  try { rows = await db()`select id,candidate->>'name' as name,candidate->>'purpose' as purpose,candidate->>'tier' as tier,tradingview_url as url from os_indicator_candidates where status='released' and release_evidence is not null order by released_at desc`; } catch { unavailable = true; }
  return <>
    <SiteHeader />
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <section className="relative overflow-hidden border-b border-white/10 py-16 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.13),transparent_65%)]" />
        <div className="section-shell relative">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400"><span className="h-px w-8 bg-ember" /> The indicator collection</div>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end">
            <h1 className="max-w-3xl font-display text-5xl font-black leading-[1.04] tracking-tight sm:text-7xl">Your chart.<br /><span className="text-zinc-500">A clearer perspective.</span></h1>
            <div className="max-w-lg"><p className="text-lg leading-8 text-zinc-400">Explore the signals, trend context, and risk levels behind Darth Algo. See the actual charts. Find the tool that fits your trading style.</p><a href="#access" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold hover:text-ember">How to get access <ArrowRight size={16} /></a></div>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-xs text-zinc-400"><span className="inline-flex items-center gap-2"><ChartNoAxesCombined size={15} /> Built for TradingView</span><span className="inline-flex items-center gap-2"><MousePointer2 size={15} /> Expandable chart previews</span><span className="inline-flex items-center gap-2"><LockKeyhole size={15} /> Invite-only access</span></div>
        </div>
      </section>
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
        <div className="section-shell"><p className="text-xs font-bold uppercase tracking-widest text-ember">From checkout to chart</p><h2 className="mt-3 font-display text-4xl font-bold">How to get your indicator.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">Use your existing TradingView account. Access is manually activated after your order is verified.</p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">{[{ icon: MousePointer2, title: "Choose your tool", text: "Select Get access above, or start the Swing trial. Complete your subscription through Stripe." }, { icon: UserRound, title: "Add your TradingView username", text: "Enter your exact TradingView username in the required checkout field so we can invite the right account." }, { icon: ChartNoAxesCombined, title: "Open it on your chart", text: "Once you receive activation confirmation, open TradingView → Indicators → Invite-only scripts and select your Darth Algo tool." }].map((step, index) => <div key={step.title}><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03]"><step.icon size={18} /></span><span className="font-mono text-xs text-zinc-600">STEP 0{index + 1}</span></div><h3 className="font-bold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-zinc-400">{step.text}</p></div>)}</div>
          <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6"><TradingViewUsernameHelp /><Link href="/support" className="text-sm text-zinc-400 hover:text-white">Need help with access? Contact support →</Link></div>
        </div>
      </section>
      <section className="section-shell py-16"><div className="flex items-center gap-3 text-zinc-400"><FlaskConical size={20} /><span className="text-xs font-bold uppercase tracking-widest">Darth Algo Lab</span></div><h2 className="mt-4 font-display text-3xl font-bold">The next ideas start here.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">New indicators join the collection after review and release verification.</p>
        {rows.length ? <div className="mt-7 grid gap-4 md:grid-cols-2">{rows.map(row => <article key={row.id} className="rounded-xl border border-white/10 p-6"><p className="text-xs uppercase text-ember">{row.tier} · Released</p><h3 className="mt-2 text-xl font-bold">{row.name}</h3><p className="mt-3 text-sm text-zinc-400">{row.purpose}</p><a href={row.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">View chart and access details on TradingView <ArrowRight size={16} /></a></article>)}</div> : <p className="mt-6 rounded-lg border border-dashed border-white/15 p-5 text-sm text-zinc-500">{unavailable ? "Lab releases are temporarily unavailable. The tools above are available to explore." : "No new Lab releases yet. Explore Scalper, Swing, and Pro above."}</p>}
      </section>
    </main>
    <SiteFooter />
  </>;
}
