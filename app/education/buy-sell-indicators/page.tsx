import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert, BookOpen } from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";

export const metadata: Metadata = {
  title: "TradingView Buy/Sell Indicators: A Futures Trader's Evaluation Guide | Darth Algo",
  description: "How to evaluate TradingView buy and sell signals for Nasdaq, Gold and S&P futures. Five checks for trend, structure, invalidation, repainting and realistic outcomes, with real chart examples.",
  alternates: { canonical: "/education/buy-sell-indicators" },
  openGraph: {
    title: "5 Checks Before Trusting a TradingView Buy/Sell Indicator",
    description: "Real charts, no fake winning trades. A practical, independent checklist for futures traders.",
    images: ["/indicator-examples/darth-algo-feature-map-03.png"],
  },
};

const checks = [
  {
    title: "1. Start with the higher-timeframe trend",
    detail: "A green arrow against a strong downtrend isn't automatically a reversal. Check a higher timeframe, the trend backdrop, recent swing highs and lows, and whether price is expanding or ranging. You can still trade countertrend ideas, but the reason should be explicit.",
    test: "Can you explain whether the signal follows the trend or contradicts it, using the actual price structure?",
  },
  {
    title: "2. Find the closest meaningful structure",
    detail: "A buy marker directly below a major unbroken high may have less space to develop than the same marker after price retests support. Identify prior-day highs and lows, a credible swing point, a range edge and nearby liquidity before deciding the setup is attractive.",
    test: "What real price level or behavior would confirm your interpretation, and what would disprove it?",
  },
  {
    title: "3. Define invalidation before imagining a target",
    detail: "A planned stop reference defines where the trade thesis is no longer acceptable, not what you must risk. Consider position size, volatility and whether your risk allowance permits a realistic stop. Do not rely on tight hypothetical fills in fast futures markets.",
    test: "Where is the idea wrong, and could your account withstand the loss if price gets there?",
  },
  {
    title: "4. Review both repainting and signal timing",
    detail: "An indicator can look excellent after the candles have finished, while live signals behave differently. Ask whether markers wait for candle close, whether past markers move or disappear, and whether alerts match what the chart would have shown at that time. Test independently on fresh market data.",
    test: "Would the same signal have been visible at decision time, not just after the move happened?",
  },
  {
    title: "5. Include losers, slippage and fees",
    detail: "A selected winning trade is not a performance study. Include flat and losing setups, spreads, commission, likely slippage and periods of different volatility. Backtests do not establish future returns or executable live fills, especially with thin liquidity or news spikes.",
    test: "Are you evaluating a representative sample, or only a highlight reel?",
  },
] as const;

const faqs = [
  {
    q: "Do TradingView buy/sell indicators guarantee winning trades?",
    a: "No. Signals are analytical information, not guarantees. Any strategy or indicator can generate false signals and suffer losses.",
  },
  {
    q: "Can I use the same indicator on NQ, ES and Gold?",
    a: "You can evaluate chart tools across instruments if the script supports them, but market volatility, liquidity, tick values and sessions differ. Verify the configuration and risk separately.",
  },
  {
    q: "What is a repainting indicator?",
    a: "In trading charts, repainting generally means historical displays can differ from what appeared while bars were forming. Ask whether alerts and signals wait for confirmed bar closes, and test the script's actual live behavior.",
  },
  {
    q: "How is a signal different from a real filled trade?",
    a: "A chart signal may mark a theoretical setup; a broker fill includes time, price, size and market execution conditions. A screenshot alone does not prove a live executed trade or realized profit.",
  },
] as const;

export default function BuySellIndicatorsGuide() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Evaluate TradingView Buy/Sell Indicators for Futures",
    datePublished: "2026-11-08",
    author: { "@type": "Organization", name: "Darth Algo" },
    publisher: { "@type": "Organization", name: "Darth Algo" },
    mainEntityOfPage: "https://www.darthalgo.com/education/buy-sell-indicators",
    description: "A practical five-step checklist for evaluating real buy/sell chart signals and trading risk.",
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
  };

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="min-h-screen bg-[#090b10] text-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
        <div className="border-t-[3px] border-[#d42342]" />
        <div className="section-shell py-14 sm:py-20">
          <nav className="text-xs font-semibold text-zinc-400"><Link href="/education" className="hover:text-white">Education</Link> <span className="mx-2">/</span> TradingView Indicators</nav>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-rose-300"><BookOpen size={16} /> Free trading education</p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl">TradingView buy/sell indicators: <span className="text-[#fa5269]">5 checks before trusting a signal.</span></h1>
              <p className="mt-6 text-base leading-8 text-zinc-300">Whether you're reviewing NQ, ES, Gold or another futures chart, an indicator is only useful when you understand its limitations. This practical checklist separates genuine chart context from marketing hype.</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Updated November 2026 · Approx. 5-minute read</p>
              <a href="#checklist" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#c61e39] px-6 py-3 text-sm font-bold hover:bg-[#eb3c58]">Read the 5 checks <ArrowRight size={16} /></a>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#10141c]">
              <div className="relative aspect-[1.3] w-full"><Image src="/indicator-examples/darth-algo-feature-map-03.png" alt="Unaltered screenshot of Darth Algo Pro indicator on a TradingView chart showing signals and market context" fill priority sizes="(max-width: 1024px) 100vw, 44vw" className="object-contain" /></div>
              <figcaption className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-zinc-400">Actual Darth Algo product screenshot. An interface demonstration, not a record of an executed or profitable trade.</figcaption>
            </figure>
          </div>
        </div>
        <section id="checklist" className="border-y border-white/10 bg-[#11161e]">
          <div className="section-shell py-14 sm:py-20">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-300">Practical buyer's checklist</p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">A signal is the beginning of the process.</h2>
              <p className="mt-4 text-base leading-8 text-zinc-300">A single marker cannot account for every market condition. Before relying on a chart tool, ask these five questions on a real chart—preferably in replay and forward observation, not only after a winning move.</p>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {checks.map((c,i) => (
                <article key={c.title} className={`rounded-xl border border-white/10 bg-[#0b0e14] p-6 sm:p-8 ${i===4 ? "lg:col-span-2" : ""}`}>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#c61e39] text-sm font-black">{String(i+1).padStart(2,"0")}</div>
                  <h3 className="mt-5 text-xl font-extrabold">{c.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-zinc-300">{c.detail}</p>
                  <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-zinc-200"><CheckCircle2 className="mb-2 h-5 w-5 text-rose-300" /><strong>Ask yourself:</strong> {c.test}</div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="section-shell grid gap-8 py-14 lg:grid-cols-[1fr_1fr] lg:items-center sm:py-20">
          <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#11151c]">
            <div className="relative aspect-[1.35] w-full"><Image src="/indicators/scalper-risk-plan.png" alt="Real Darth Algo Scalper view on TradingView illustrating planning levels, not confirmed executions" fill sizes="(max-width: 1024px) 100vw, 48vw" className="object-contain" /></div>
            <figcaption className="border-t border-white/10 px-4 py-3 text-xs text-zinc-400">Real product screenshot showing planned chart levels. Not an authenticated trading result.</figcaption>
          </figure>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-300">How Darth Algo fits</p>
            <h2 className="mt-4 text-3xl font-extrabold">See trend context, signals and planned levels in one place.</h2>
            <p className="mt-5 text-sm leading-7 text-zinc-300">Darth Algo provides chart overlays designed to help futures traders review directional signals alongside trend context, entry ideas, invalidation and potential targets in TradingView. That can improve how clearly a trader reviews the setup; it does not predict the next candle or remove risk.</p>
            <p className="mt-4 text-sm leading-7 text-zinc-300">The Swing, Scalper and Pro products serve different trading horizons. Evaluate actual screenshots and product terms before selecting a plan.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/indicators" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/20 px-5 py-3 text-sm font-bold hover:bg-white/10">Compare real screenshots <ArrowRight size={16}/></Link>
              <Link href="/black-friday" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#c61e39] px-5 py-3 text-sm font-bold hover:bg-[#eb3c58]">Current offers <ArrowRight size={16}/></Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500">Offers and eligibility are shown at Stripe checkout. No guarantee of trading profits.</p>
          </div>
        </section>
        <section className="border-t border-white/10 bg-[#11161e]">
          <div className="section-shell py-14 sm:py-20">
            <h2 className="max-w-2xl text-3xl font-extrabold">Frequently asked questions</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {faqs.map((item) => (<div key={item.q} className="rounded-xl border border-white/10 bg-[#0b0e14] p-6"><h3 className="text-base font-bold">{item.q}</h3><p className="mt-3 text-sm leading-7 text-zinc-300">{item.a}</p></div>))}
            </div>
            <div className="mt-10 rounded-xl border border-rose-500/20 bg-[#24131c] p-6"><ShieldAlert className="h-6 w-6 text-rose-300"/><p className="mt-3 text-sm leading-7 text-zinc-200">This article is for educational purposes only and does not provide individualized investment advice. Futures trading can cause substantial financial losses. Signals and chart examples must not be confused with verified broker executions.</p></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
