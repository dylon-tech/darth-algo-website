import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, CalendarDays, Sparkles } from "lucide-react";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";

export const metadata: Metadata = {
  title: "Black Friday | 25% Off TradingView Indicators + $89 Lifetime",
  description: "Darth Algo Black Friday: 25% off your first month of Swing, Scalper or Pro, or Lifetime Pro for $89. See real indicator screenshots, terms and secure Stripe checkout.",
  alternates: { canonical: "/black-friday" },
  openGraph: {
    title: "Darth Algo Black Friday | Pro Lifetime $89",
    description: "See real Darth Algo charts and unlock Black Friday pricing on Swing, Scalper, Pro and Lifetime.",
    url: "/black-friday",
    images: ["/indicator-examples/darth-algo-feature-map-03.png"],
  },
};

const products = [
  {
    name: "Swing",
    subtitle: "Broader market direction",
    before: "$14.99",
    after: "$11.24",
    renewal: "$14.99/month after the discounted first payment",
    image: "/indicators/swing-overview.png",
    alt: "Authentic Darth Algo Swing indicator on a TradingView chart",
    href: "https://buy.stripe.com/28EcN699l8oQ9aC5Ao6kg02",
    badge: "For broader setups",
  },
  {
    name: "Scalper",
    subtitle: "Active intraday structure",
    before: "$18.99",
    after: "$14.24",
    renewal: "$18.99/month after the discounted first payment",
    image: "/indicators/scalper-risk-plan.png",
    alt: "Authentic Darth Algo Scalper indicator displaying planned levels",
    href: "https://buy.stripe.com/14AfZi4T5fRidqS2oc6kg03",
    badge: "For active sessions",
  },
  {
    name: "Pro",
    subtitle: "Scalp + Swing in one workflow",
    before: "$29.00",
    after: "$21.75",
    renewal: "$29/month after the discounted first payment",
    image: "/indicator-examples/darth-algo-feature-map-03.png",
    alt: "Authentic Darth Algo Pro indicator chart with trend and trade planning features",
    href: "https://buy.stripe.com/4gM8wQfxJ6gI1IabYM6kg05",
    badge: "The combined system",
  },
] as const;

export default function BlackFridayPage() {
  const promoActive = Date.now() < Date.parse("2026-12-10T04:59:00.000Z");

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="min-h-screen bg-[#080a0e] text-white">
        <div className="border-t-[3px] border-[#e32645]" />
        <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#101319]">
          <div className="pointer-events-none absolute -right-32 -top-48 h-[480px] w-[480px] rounded-full bg-[#ad1a31]/20 blur-[120px]" aria-hidden="true" />
          <div className="section-shell relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#ed3651]/40 bg-[#ed3651]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-rose-300"><Sparkles className="h-4 w-4" /> November–December 2026 · Limited-time offer</p>
              <h1 className="mt-7 text-4xl font-black leading-[1.06] tracking-tight sm:text-6xl">See the setup.<br /><span className="text-[#fc506b]">Plan the trade.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-zinc-300">Black Friday pricing for Darth Algo TradingView indicators. Review authentic chart screenshots, compare your options, and choose the workflow that fits your trading horizon.</p>
              {promoActive ? (
                <>
                  <p className="mt-7 text-2xl font-black sm:text-3xl"><span className="text-[#fc506b]">25% off</span> the first month <span className="text-zinc-500">or</span> <span className="text-[#fc506b]">$89</span> Lifetime</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a href="#monthly" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#cc1d39] px-5 py-3 text-sm font-bold hover:bg-[#ed3651]">Shop monthly offers <ArrowRight className="h-4 w-4"/></a>
                    <a href="#lifetime" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-rose-400/40 bg-white/5 px-5 py-3 text-sm font-bold hover:bg-white/10">See $89 Lifetime offer</a>
                  </div>
                </>
              ) : (
                <div className="mt-7 rounded-lg border border-white/15 bg-white/5 p-5">
                  <p className="font-bold">This Black Friday promotion has ended.</p>
                  <p className="mt-2 text-sm text-zinc-400">Browse the current plans and pricing; the promotional codes below are no longer valid.</p>
                  <Link href="/indicators" className="mt-3 inline-block font-semibold text-rose-300 underline">Explore current products</Link>
                </div>
              )}
              <div className="mt-7 flex items-center gap-2 text-sm text-zinc-400"><CalendarDays className="h-4 w-4 text-rose-300" /> Offer ends December 9, 2026 at 11:59 PM Eastern.</div>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_80px_rgba(190,26,56,0.14)]">
              <div className="relative aspect-[1.3] w-full">
                <Image src="/indicator-examples/darth-algo-feature-map-03.png" alt="Actual Darth Algo Pro product screenshot showing market chart and indicator planning tools" fill priority className="object-contain" sizes="(max-width: 1024px) 100vw, 48vw" />
              </div>
              <figcaption className="border-t border-white/10 p-3 text-xs leading-5 text-zinc-400">Authentic Darth Algo product screenshot. Example chart view; not proof of a filled or profitable trade.</figcaption>
            </figure>
          </div>
        </section>

        <section id="monthly" className="section-shell py-14 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.23em] text-rose-300">Monthly indicators</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">Choose your trading horizon.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">All three monthly discounts use the code <strong className="select-all text-white">BLACKFRIDAY25</strong> at Stripe checkout. Only the first payment is discounted. Future monthly renewals use the standard price.</p>
          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.name} className="overflow-hidden rounded-2xl border border-white/10 bg-[#131821]">
                <div className="relative aspect-video bg-[#090b10]">
                  <Image src={product.image} alt={product.alt} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 32vw" />
                </div>
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-300">{product.badge}</p>
                  <h3 className="mt-2 text-2xl font-black">{product.name}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{product.subtitle}</p>
                  <div className="mt-6 flex items-end gap-3"><span className="text-3xl font-black text-white">{promoActive ? product.after : product.before}</span>{promoActive && <span className="pb-1 text-sm text-zinc-500 line-through">{product.before}</span>}</div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{promoActive ? product.renewal : "Standard monthly price"} · taxes may apply.</p>
                  {promoActive && <p className="mt-5 rounded-lg border border-[#fa506b]/30 bg-[#661b2a]/30 px-4 py-3 text-xs font-bold">Enter code <strong className="select-all text-rose-200">BLACKFRIDAY25</strong> at checkout</p>}
                  <a href={product.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#cc1d39] px-4 text-sm font-bold hover:bg-[#ed3651]">Continue to secure checkout <ArrowRight className="h-4 w-4"/></a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="lifetime" className="border-y border-white/10 bg-[#12161e]">
          <div className="section-shell grid gap-9 py-14 sm:py-20 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.23em] text-rose-300">One-time purchase</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Pro Lifetime. No monthly Pro subscription required.</h2>
              <p className="mt-5 text-sm leading-7 text-zinc-300">Lifetime includes Darth Algo Pro access plus an archived private copy of the Pro Pine Script and a <Link href="/lifetime-setup" className="text-rose-300 underline">10-step visual setup guide</Link>. Support delivers the source after verified purchase. Keep the code private.</p>
              <div className="mt-6 flex items-end gap-4"><span className="text-5xl font-black text-white">{promoActive ? "$89.00" : "$134.99"}</span>{promoActive && <span className="pb-2 text-lg text-zinc-500 line-through">$134.99</span>}</div>
              {promoActive && <p className="mt-5 inline-block rounded-lg border border-[#fa506b]/30 bg-[#661b2a]/30 px-5 py-3 text-sm font-black">Use code <span className="select-all text-rose-200">BLACKFRIDAY89</span></p>}
              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">Already subscribed monthly? Buying Lifetime does not automatically cancel your existing monthly subscription. Contact support to arrange the transition and avoid additional monthly charges.</p>
              <a href="https://buy.stripe.com/6oUcN62KX0WoeuW1k86kg04" target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#cc1d39] px-6 py-3 text-sm font-bold hover:bg-[#ed3651]">Get Lifetime through Stripe <ArrowRight className="h-4 w-4"/></a>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#090b10]">
              <div className="relative aspect-[1.35] w-full"><Image src="/indicator-examples/darth-algo-feature-map-01.png" alt="Real Darth Algo Pro TradingView product screenshot" fill className="object-contain" sizes="(max-width: 1024px) 100vw, 48vw"/></div>
              <figcaption className="border-t border-white/10 p-4 text-xs leading-5 text-zinc-400">The indicator and chart are for evaluating the product interface, not a guarantee of trading returns.</figcaption>
            </figure>
          </div>
        </section>

        <section className="section-shell py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <ShieldCheck className="mx-auto h-7 w-7 text-rose-300" />
            <h2 className="mt-4 text-2xl font-black sm:text-3xl">A clearer chart, not a promise of profits.</h2>
            <p className="mt-5 text-sm leading-7 text-zinc-400">Darth Algo provides technical chart tools that help organize signals, trend context, entry ideas and risk levels. Trading involves financial risk. Historical examples or chart illustrations do not guarantee future results. Promotional pricing and eligibility are confirmed by Stripe at checkout; taxes may apply.</p>
            <Link href="/support" className="mt-6 inline-flex font-bold text-rose-300 underline underline-offset-4">Questions? Contact Darth Algo support</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
