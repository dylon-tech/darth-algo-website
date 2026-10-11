import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Instagram,
  LifeBuoy,
  MessageCircle,
  Music2,
  Play,
  ShieldCheck,
  Sparkles,
  Youtube,
  Zap,
} from "lucide-react";
import LinkActions from "./link-actions";
import { getCheckoutLink, products } from "../lib/products";
import MarketScene from "./market-scene";
import "./market-scene.css";

export const metadata: Metadata = {
  title: "Darth Algo Links | Indicators, Community & Support",
  description: "The official Darth Algo link hub for TradingView indicators, the trader community, education, support, and creator affiliates.",
  alternates: { canonical: "/links" },
  openGraph: {
    title: "Darth Algo | Official Links",
    description: "Indicators, community, education, and support—all in one place.",
    url: "/links",
    images: [{ url: "/hero/darth-algo-before-after.jpg", width: 1254, height: 1254, alt: "Darth Algo TradingView indicator" }],
  },
};

const secondaryLinks = [
  { title: "Trading Education", href: "/education", icon: BookOpen },
  { title: "Affiliate Program", href: "/affiliates", icon: Sparkles },
  { title: "Customer Support", href: "/support", icon: LifeBuoy },
  { title: "DarthAlgo.com", href: "/", icon: Zap },
] as const;

export default function LinksPage() {
  return (
    <main id="main-content" className="links-market-hub relative min-h-screen overflow-hidden bg-[#07090d] px-4 py-4 text-white sm:py-8">
      <MarketScene />

      <div className="hub-content relative mx-auto w-full max-w-xl">
        <div className="hub-share absolute right-0 top-0 z-20">
          <LinkActions />
        </div>

        <section className="hub-brand-stage text-center">
          <Link href="/" aria-label="Go to the Darth Algo website" className="inline-flex justify-center">
            <span className="hub-brand-emblem relative grid h-28 w-28 place-items-center overflow-hidden rounded-[1.6rem] border border-red-400/40 bg-black shadow-[0_0_55px_rgba(239,68,68,.28)] ring-1 ring-white/10 sm:h-36 sm:w-36">
              <Image src="/darth-algo-link-logo.svg" alt="Darth Algo trading logo" fill priority sizes="144px" className="object-cover transition duration-500 hover:scale-105" />
              <span className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/15" />
            </span>
          </Link>
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[.18em] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Official link hub
            </span>
          </div>
          <h1 className="mx-auto mt-3 max-w-[19rem] sm:max-w-[23rem]">
            <Image src="/darth-algo-wordmark-clean.svg" alt="Darth Algo" width={830} height={100} priority className="h-auto w-full drop-shadow-[0_8px_28px_rgba(239,68,68,.34)]" />
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-zinc-400 sm:text-base">
            TradingView tools. Clearer chart context. Your trading community.
          </p>
          <nav aria-label="Find what you need" className="mt-5 flex justify-center gap-2">
            <a href="#indicators" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-semibold text-zinc-950">Indicators</a>
            <a href="#community" className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-[#11151d] px-4 text-sm font-medium text-zinc-200 hover:bg-white/10">Community</a>
            <a href="#socials" className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-[#11151d] px-4 text-sm font-medium text-zinc-200 hover:bg-white/10">Socials</a>
          </nav>
        </section>

        <section id="indicators" aria-label="Darth Algo Pro: Scalper and Swing together" className="hub-depth-card relative mt-4 overflow-hidden rounded-[1.75rem] border border-red-400/30 bg-[#111116] shadow-[0_24px_80px_rgba(0,0,0,.25)]">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(239,68,68,.15),transparent_45%)]" />
          <div className="relative border-b border-white/10 bg-black/25 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-wide text-red-300">For traders who use both styles</span>
              <span className="shrink-0 rounded-full border border-white/20 px-2.5 py-1 text-xs font-semibold text-white">Pro bundle</span>
            </div>
          </div>

          <div className="relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-wide text-red-300">Darth Algo Pro</p>
                <h2 className="font-display mt-2 text-3xl font-black leading-tight sm:text-4xl">Scalp the session.<br />Follow the bigger move.</h2>
              </div>
              <div className="shrink-0 text-right"><strong className="text-3xl font-black text-white">{products.pro.price}</strong><span className="block text-xs text-zinc-300">/ month</span></div>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Scalper and Swing in one subscription. Read trend context, review signals, and keep entry, stop and targets together on TradingView.</p>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-zinc-200">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-red-300" /> Both tools included</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-red-300" /> $4.98/month less than buying both separately</span>
            </div>
            <Link href="/products/pro" className="mt-5 block overflow-hidden rounded-xl border border-white/15 bg-black">
              <Image src={products.pro.overview} alt={products.pro.overviewAlt} width={1805} height={767} sizes="(max-width: 640px) 100vw, 528px" className="h-auto w-full object-contain" />
              <span className="block px-3 py-2 text-xs leading-5 text-zinc-300">Recorded Pro example · Explore the tool →</span>
            </Link>
            <a href={getCheckoutLink("pro")} className="hub-primary-cta mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-base font-bold text-white transition hover:bg-red-500">
              <CreditCard className="h-4 w-4" /> Get Pro — $29/month <ArrowUpRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-center text-xs leading-5 text-zinc-300">Billed monthly. Cancel anytime. Applicable tax may be added at checkout.</p>
            <p className="mt-2 text-center text-xs leading-5 text-zinc-400">Automatic TradingView access after checkout. Enter your exact TradingView username.</p>
            <Link href="/start" className="mt-3 flex min-h-11 items-center justify-center text-sm font-semibold text-white underline underline-offset-4">Try the free chart walkthrough first</Link>
            <p className="mt-2 text-center text-xs leading-5 text-zinc-400">Already subscribed? <Link href="/support" className="text-zinc-200 underline underline-offset-4">Ask about switching plans</Link> before starting another subscription.</p>
          </div>
        </section>

        <section aria-labelledby="more-tools-heading" className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold text-zinc-400">Only need one style?</p><h2 id="more-tools-heading" className="font-display mt-1 text-2xl font-black">Choose your tool.</h2></div><Link href="/compare" className="flex min-h-11 items-center text-sm font-semibold text-zinc-300 underline underline-offset-4 hover:text-white">Compare all</Link></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {name:'Scalper Tool',eyebrow:'Active intraday sessions',price:products.scalper.price,image:products.scalper.overview,href:getCheckoutLink('scalper'),product:'/products/scalper',cta:'Get Scalper',terms:'Billed monthly. Cancel anytime.',accent:'from-orange-500 to-red-500',border:'border-orange-400/25',text:'text-orange-300'},
              {name:'Swing Tool',eyebrow:'Broader directional moves',price:products.swing.price,image:products.swing.overview,href:getCheckoutLink('swing'),product:'/products/swing',cta:'Try Swing free for 2 days',terms:'Trial starts at checkout, then $14.99/month unless canceled.',accent:'from-blue-600 to-sky-500',border:'border-sky-400/25',text:'text-sky-300'},
            ].map(tool=><article key={tool.name} className={`hub-depth-card relative group overflow-hidden rounded-[1.35rem] border bg-[#0d1118]/92 backdrop-blur-sm ${tool.border} shadow-[0_18px_45px_rgba(0,0,0,.22)]`}>
              <Link href={tool.product} className="relative block aspect-[16/8] overflow-hidden bg-black"><Image src={tool.image} alt={`Darth Algo ${tool.name} chart preview`} fill sizes="(max-width: 640px) 100vw, 288px" className="object-contain"/></Link>
              <div className="p-4"><p className={`mb-2 text-xs font-semibold ${tool.text}`}>{tool.eyebrow}</p><div className="flex items-start justify-between gap-3"><h3 className="font-display text-lg font-black">Darth Algo {tool.name}</h3><div className="shrink-0 text-right"><strong className="text-lg font-black">{tool.price}</strong><span className="block text-xs text-zinc-400">/ month</span></div></div><a href={tool.href} className={`mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 text-sm font-bold text-white transition hover:brightness-110 ${tool.accent}`}>{tool.cta} <ArrowUpRight className="h-4 w-4"/></a><p className="mt-3 text-xs leading-5 text-zinc-300">{tool.terms}</p><Link href={tool.product} className="mt-2 flex min-h-11 items-center text-sm text-zinc-300 underline underline-offset-4">Explore {tool.name}</Link></div>
            </article>)}
          </div>
        </section>

        <section id="community" aria-label="Join the Darth Algo community" className="hub-depth-card relative mt-5 overflow-hidden rounded-[1.75rem] border border-emerald-300/30 bg-[#081314]/92 shadow-[0_28px_80px_rgba(16,185,129,.18)] backdrop-blur-sm">
          <div className="relative aspect-video overflow-hidden border-b border-white/10 bg-black">
            <Image src="/darth-algo-community-banner.svg" alt="Darth Algo traders sharing charts in the community trading room" fill sizes="(max-width: 640px) 100vw, 576px" className="object-cover transition duration-700 hover:scale-105" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#081314] via-transparent to-transparent" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-black/65 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-emerald-200 backdrop-blur"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_14px_#6ee7b7]" /> Trader community</span>
            <span className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/65 px-3 py-2 text-[9px] font-bold text-white/75 backdrop-blur">Charts • Education • Indicator help</span>
          </div>
          <div className="relative p-4 sm:p-5">
            <span aria-hidden="true" className="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative flex items-center justify-between gap-3">
              <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Free Telegram community</p><h2 className="font-display mt-1 text-2xl font-black">Join the trading room.</h2></div>
              <span className="flex shrink-0 -space-x-2">{['DA','ES','NQ','GC'].map((label, index) => <span key={label} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#081314] text-[7px] font-black text-white ${['bg-red-500','bg-emerald-500','bg-sky-500','bg-amber-500'][index]}`}>{label}</span>)}</span>
            </div>
            <p className="relative mt-2 text-sm leading-5 text-zinc-400">Share charts, learn the indicators, discuss futures setups, and get Darth Algo updates.</p>
            <a href="/go/community?source=direct&campaign=links" className="relative mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 px-5 text-sm font-black text-[#031211] shadow-[0_16px_45px_rgba(16,185,129,.35)] transition duration-300 hover:-translate-y-1 hover:brightness-110">
              Join the Community — Free <ArrowUpRight className="h-5 w-5" />
            </a>
            <p className="relative mt-3 text-center text-[9px] font-black uppercase tracking-[.15em] text-zinc-600">Opens instantly in Telegram</p>
          </div>
        </section>

        <section id="socials" aria-labelledby="social-heading" className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">See it in action</p><h2 id="social-heading" className="font-display mt-1 text-2xl font-black">Watch. Learn. Follow.</h2></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Official socials</span>
          </div>

          <article className="hub-depth-card relative overflow-hidden rounded-[1.5rem] border border-red-500/25 bg-[#11151d]/92 shadow-[0_20px_50px_rgba(0,0,0,.3)] backdrop-blur-sm">
            <div className="relative aspect-video overflow-hidden bg-black">
              <iframe
                src="https://www.youtube-nocookie.com/embed/YGhU7kgd8h0?rel=0"
                title="Darth Algo indicator demonstration"
                loading="lazy"
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <a href="https://www.youtube.com/@DarthAlgoTools" target="_blank" rel="noreferrer" className="group flex items-center gap-4 p-4 transition hover:bg-red-500/[.07]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-[0_0_25px_rgba(220,38,38,.3)]"><Youtube className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm font-black">More Darth Algo videos</strong><span className="mt-0.5 block text-xs text-zinc-500">Demos, trading clips, and tutorials · @DarthAlgoTools</span></span>
              <Play className="h-4 w-4 fill-current text-red-400 transition group-hover:scale-110" />
            </a>
          </article>

          <article className="hub-depth-card relative mt-3 overflow-hidden rounded-[1.5rem] border border-fuchsia-400/25 bg-[#11151d]/92 shadow-[0_20px_50px_rgba(0,0,0,.25)] backdrop-blur-sm">
            <a href="https://www.instagram.com/darth.algo/" target="_blank" rel="noreferrer" aria-label="Explore Darth Algo charts on Instagram" className="grid grid-cols-3 gap-1 bg-black p-1">
              {[
                ["/indicators/signal-context-alt.png", "Darth Algo signal chart post"],
                ["/indicator-examples/darth-algo-feature-map-03.png", "Darth Algo risk plan post"],
                ["/indicators/swing-trend-cloud.png", "Darth Algo trend cloud post"],
              ].map(([src, alt]) => <div key={src} className="group relative aspect-square overflow-hidden bg-zinc-950"><Image src={src} alt={alt} fill sizes="(max-width: 640px) 33vw, 190px" className="object-cover transition duration-500 group-hover:scale-110" /><span className="absolute inset-0 bg-gradient-to-t from-fuchsia-700/30 to-transparent" /></div>)}
            </a>
            <a href="https://www.instagram.com/darth.algo/" target="_blank" rel="noreferrer" className="group flex items-center gap-4 bg-gradient-to-r from-fuchsia-700/25 via-purple-700/10 to-transparent p-4 transition hover:from-fuchsia-700/35">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-red-500 to-amber-400 text-white shadow-lg"><Instagram className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1"><strong className="font-display block text-xl font-black">See us on Instagram</strong><span className="mt-1 block text-xs font-bold text-white/60">Posts, chart clips, and updates · @darth.algo</span></span>
              <ArrowUpRight className="h-5 w-5 shrink-0 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
            </a>
          </article>

          <article className="hub-depth-card relative mt-3 overflow-hidden rounded-[1.5rem] border border-cyan-300/25 bg-[#0c1118]/92 shadow-[0_20px_50px_rgba(0,0,0,.25)] backdrop-blur-sm">
            <a href="https://www.tiktok.com/@darth.algo" target="_blank" rel="noreferrer" aria-label="Watch Darth Algo chart clips on TikTok" className="relative grid h-48 grid-cols-3 gap-1 overflow-hidden bg-black p-1">
              {[
                ["/indicator-examples/darth-algo-feature-map-01.png", "Darth Algo Pro Tool TikTok preview"],
                ["/indicators/scalper-execution.png", "Darth Algo Scalper TikTok preview"],
                ["/indicators/swing-overview.png", "Darth Algo Swing TikTok preview"],
              ].map(([src, alt], index) => <div key={src} className="group relative overflow-hidden rounded-sm bg-zinc-950"><Image src={src} alt={alt} fill sizes="(max-width: 640px) 33vw, 190px" className="object-cover transition duration-500 group-hover:scale-110" /><span className={`absolute inset-0 ${index === 1 ? 'bg-cyan-400/10' : 'bg-red-500/10'}`} /><span className="absolute inset-0 grid place-items-center"><span className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur"><Play className="h-3.5 w-3.5 fill-current" /></span></span></div>)}
              <span aria-hidden="true" className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[8px] font-black uppercase tracking-[.15em] text-white backdrop-blur">Darth Algo clips</span>
            </a>
            <a href="https://www.tiktok.com/@darth.algo" target="_blank" rel="noreferrer" className="group flex items-center gap-4 bg-gradient-to-r from-cyan-400/15 via-transparent to-red-500/15 p-4 transition hover:from-cyan-400/25 hover:to-red-500/25">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-black text-white shadow-[-4px_0_0_#22d3ee,4px_0_0_#f43f5e]"><Music2 className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1"><strong className="font-display block text-xl font-black">Watch us on TikTok</strong><span className="mt-1 block text-xs font-bold text-white/60">Signals, demos, and trading lives · @darth.algo</span></span>
              <ArrowUpRight className="h-5 w-5 shrink-0 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
            </a>
          </article>
        </section>

        <section aria-label="More Darth Algo links" className="mt-5 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-[#11151d]">
          {secondaryLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="flex min-h-16 items-center gap-3 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/5">
                <Icon aria-hidden="true" className="h-5 w-5 text-zinc-400" />
                <span className="flex-1">{item.title}</span>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-zinc-400" />
              </Link>
            );
          })}
        </section>

        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-4 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Official Darth Algo links only</p>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">Educational tools only—not financial advice. Trading involves risk. Past performance does not guarantee future results. Background prices are illustrative, not live quotes.</p>
        </div>

        <footer className="mt-8 flex items-center justify-center gap-2 pb-4 text-xs font-bold text-zinc-600">
          <MessageCircle className="h-3.5 w-3.5" /> © 2026 Darth Algo
        </footer>
      </div>
    </main>
  );
}
