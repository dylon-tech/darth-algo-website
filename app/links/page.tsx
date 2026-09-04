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
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-[#07090d] px-4 py-4 text-white sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-red-600/15 blur-[110px]" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
        <div className="absolute inset-x-[-18%] top-0 h-[45rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_2%,black_66%,transparent_100%)]">
          <Image src="/indicators/swing-overview.png" alt="" fill priority sizes="136vw" className="market-hero-chart object-cover object-center saturate-[1.35] contrast-110" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,9,13,.08),rgba(7,9,13,.28)_52%,#07090d),radial-gradient(circle_at_50%_28%,transparent_8%,rgba(7,9,13,.46)_84%)]" />
          <div className="market-hero-scan absolute inset-y-0 w-28 bg-gradient-to-r from-transparent via-sky-300/10 to-transparent blur-xl" />
          <div className="absolute inset-0 bg-red-950/[.06] mix-blend-color" />
        </div>
        <svg viewBox="0 0 1200 1100" preserveAspectRatio="xMidYMin slice" className="market-chart-drift absolute inset-x-0 top-[43rem] h-[68rem] w-full opacity-[.26]">
          <defs>
            <linearGradient id="market-line" x1="0" x2="1"><stop stopColor="#ef4444"/><stop offset=".5" stopColor="#a855f7"/><stop offset="1" stopColor="#34d399"/></linearGradient>
            <filter id="market-glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <path d="M0 650 C120 620 145 700 250 625 S430 520 520 590 S690 690 775 530 S955 430 1200 300" fill="none" stroke="url(#market-line)" strokeWidth="5" filter="url(#market-glow)" />
          <path d="M0 665 C120 635 145 715 250 640 S430 535 520 605 S690 705 775 545 S955 445 1200 315 L1200 1100 L0 1100Z" fill="url(#market-line)" opacity=".07" />
          <g strokeWidth="4">
            <g stroke="#ef4444" fill="#ef4444"><path d="M82 380v135"/><rect x="66" y="410" width="32" height="70" rx="3"/></g>
            <g stroke="#34d399" fill="#34d399"><path d="M145 300v150"/><rect x="129" y="330" width="32" height="78" rx="3"/></g>
            <g stroke="#34d399" fill="#34d399"><path d="M208 230v155"/><rect x="192" y="260" width="32" height="86" rx="3"/></g>
            <g stroke="#ef4444" fill="#ef4444"><path d="M995 585v155"/><rect x="979" y="610" width="32" height="84" rx="3"/></g>
            <g stroke="#34d399" fill="#34d399"><path d="M1058 500v160"/><rect x="1042" y="535" width="32" height="82" rx="3"/></g>
            <g stroke="#34d399" fill="#34d399"><path d="M1121 420v155"/><rect x="1105" y="450" width="32" height="85" rx="3"/></g>
          </g>
          <g fill="#ffffff" fontFamily="monospace" fontSize="19" fontWeight="700" opacity=".4"><text x="45" y="545">SELL</text><text x="178" y="215">BUY</text><text x="955" y="770">SELL</text><text x="1080" y="400">BUY</text></g>
        </svg>
        {[50,78,110,145,185,228].map((top,index)=><div key={top} style={{top:`${top}rem`,transform:`rotate(${index % 2 ? 1.2 : -1.2}deg)`}} className="absolute inset-x-[-8%] overflow-hidden border-y border-white/[.055] bg-gradient-to-r from-red-500/[.055] via-transparent to-emerald-400/[.06] py-2.5 opacity-45 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          <div style={{animationDuration:`${24 + index * 3}s`}} className={`market-ticker-track flex w-max items-center gap-10 whitespace-nowrap font-mono text-[10px] font-black uppercase tracking-[.16em] ${index % 2 ? 'market-ticker-reverse' : ''}`}>
            {[0,1].map(copy=><span key={copy} className="flex items-center gap-10"><span className="text-red-300/70">DARTH ALGO WIRE</span><span className="text-emerald-300/80">ES +0.62%</span><span className="text-red-300/75">NQ −0.18%</span><span className="text-emerald-300/80">GC +0.41%</span><span className="text-sky-200/65">SIGNAL CONTEXT ONLINE</span><span className="text-zinc-400/60">RISK LEVELS MAPPED</span><span className="text-violet-200/65">COMMUNITY ROOM OPEN</span></span>)}
          </div>
        </div>)}
        <div className="absolute left-[max(1.5rem,calc(50%-31rem))] top-[45rem] hidden w-44 rotate-[-4deg] rounded-xl border border-emerald-300/15 bg-[#0a1212]/65 p-3 font-mono shadow-[0_20px_50px_rgba(0,0,0,.3)] backdrop-blur md:block">
          <p className="text-[8px] font-black uppercase tracking-wider text-zinc-600">Market pulse</p><p className="mt-2 text-lg font-black text-emerald-300">+0.62%</p><div className="mt-2 flex h-7 items-end gap-1">{[35,55,42,70,62,88,76].map((height,index)=><span key={index} className="w-2 rounded-t-sm bg-emerald-400/50" style={{height:`${height}%`}} />)}</div>
        </div>
        <div className="absolute right-[max(1.5rem,calc(50%-31rem))] top-[68rem] hidden w-44 rotate-3 rounded-xl border border-red-300/15 bg-[#120a0b]/65 p-3 font-mono shadow-[0_20px_50px_rgba(0,0,0,.3)] backdrop-blur md:block">
          <p className="text-[8px] font-black uppercase tracking-wider text-zinc-600">Session watch</p><p className="mt-2 text-xs font-black text-white">NY PM • ACTIVE</p><p className="mt-2 text-[8px] leading-4 text-zinc-500">Momentum and risk context updating</p>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        <div className="absolute right-0 top-0 z-20">
          <LinkActions />
        </div>

        <section className="pt-3 text-center">
          <Link href="/" aria-label="Go to the Darth Algo website" className="inline-flex justify-center">
            <span className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-[1.6rem] border border-red-400/40 bg-black shadow-[0_0_55px_rgba(239,68,68,.28)] ring-1 ring-white/10 sm:h-36 sm:w-36">
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
            Indicators, education, community, and support—all in one place.
          </p>
        </section>

        <section aria-label="Featured Darth Algo Swing Tool trial" className="relative mt-4 overflow-hidden rounded-[1.75rem] border border-sky-400/35 bg-[#0c131d]/95 shadow-[0_24px_80px_rgba(14,165,233,.22)] backdrop-blur">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(14,165,233,.32),transparent_34%),radial-gradient(circle_at_5%_92%,rgba(59,130,246,.2),transparent_38%)]" />
          <div className="relative border-b border-white/10 bg-black/25 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-sky-200"><span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" /> Start here</span>
              <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-sky-100">2 days free</span>
            </div>
          </div>

          <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-black">
            <Image src="/indicators/swing-overview.png" alt="Darth Algo Swing Tool showing signals and market trends on a futures chart" fill priority sizes="(max-width: 640px) 100vw, 576px" className="object-cover object-left" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c12] via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 flex gap-2">
              <span className="rounded-md border border-white/15 bg-black/70 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">Buy + sell signals</span>
              <span className="rounded-md border border-white/15 bg-black/70 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">Risk levels</span>
            </div>
          </div>

          <div className="relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-300">Swing trading intelligence</p>
                <h2 className="font-display mt-2 text-2xl font-black leading-tight sm:text-3xl">Try the Darth Algo Swing Tool</h2>
              </div>
              <div className="shrink-0 text-right"><span className="block text-sm font-black text-zinc-600 line-through">$14.99</span><strong className="text-2xl font-black text-sky-300">$0</strong><span className="block text-[9px] font-bold uppercase text-zinc-500">for 2 days</span></div>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Start free with swing-focused buy and sell signals, market trend confirmation, alerts, and structured trade levels.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-300">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Instant checkout</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Invite-only access</span>
            </div>
            <a href="https://buy.stripe.com/28EcN699l8oQ9aC5Ao6kg02" className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-5 text-sm font-black text-white shadow-[0_12px_35px_rgba(14,165,233,.35)] transition hover:-translate-y-0.5 hover:brightness-110">
              <CreditCard className="h-4 w-4" /> Start My 2-Day Free Trial <ArrowUpRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-center text-[10px] font-bold text-zinc-500">Then $14.99/month. Cancel anytime.</p>
            <Link href="/#pricing" className="mt-3 flex min-h-11 items-center justify-center text-xs font-black text-zinc-400 transition hover:text-white">Compare every indicator plan</Link>
          </div>
        </section>

        <section aria-label="Join the Darth Algo community" className="relative mt-5 overflow-hidden rounded-[1.75rem] border border-emerald-300/30 bg-[#081314]/92 shadow-[0_28px_80px_rgba(16,185,129,.18)] backdrop-blur-sm">
          <div className="relative aspect-video overflow-hidden border-b border-white/10 bg-black">
            <Image src="/darth-algo-community-banner.svg" alt="Darth Algo traders sharing charts in the community trading room" fill sizes="(max-width: 640px) 100vw, 576px" className="object-cover transition duration-700 hover:scale-105" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#081314] via-transparent to-transparent" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-black/65 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-emerald-200 backdrop-blur"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_14px_#6ee7b7]" /> Community live</span>
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

        <section aria-labelledby="social-heading" className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">See it in action</p><h2 id="social-heading" className="font-display mt-1 text-2xl font-black">Watch. Learn. Follow.</h2></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Official socials</span>
          </div>

          <article className="overflow-hidden rounded-[1.5rem] border border-red-500/25 bg-[#11151d]/92 shadow-[0_20px_50px_rgba(0,0,0,.3)] backdrop-blur-sm">
            <div className="relative aspect-video overflow-hidden bg-black">
              <iframe
                src="https://www.youtube-nocookie.com/embed/YGhU7kgd8h0?rel=0"
                title="Darth Algo real-time buy and sell signals"
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

          <article className="mt-3 overflow-hidden rounded-[1.5rem] border border-fuchsia-400/25 bg-[#11151d]/92 shadow-[0_20px_50px_rgba(0,0,0,.25)] backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-1 bg-black p-1">
              {[
                ["/indicators/signal-context-alt.png", "Darth Algo signal chart post"],
                ["/indicator-examples/darth-algo-feature-map-03.png", "Darth Algo risk plan post"],
                ["/indicators/swing-trend-cloud.png", "Darth Algo trend cloud post"],
              ].map(([src, alt]) => <div key={src} className="group relative aspect-square overflow-hidden bg-zinc-950"><Image src={src} alt={alt} fill sizes="(max-width: 640px) 33vw, 190px" className="object-cover transition duration-500 group-hover:scale-110" /><span className="absolute inset-0 bg-gradient-to-t from-fuchsia-700/30 to-transparent" /></div>)}
            </div>
            <a href="https://www.instagram.com/darth.algo/" target="_blank" rel="noreferrer" className="group flex items-center gap-4 bg-gradient-to-r from-fuchsia-700/25 via-purple-700/10 to-transparent p-4 transition hover:from-fuchsia-700/35">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-red-500 to-amber-400 text-white shadow-lg"><Instagram className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1"><strong className="font-display block text-xl font-black">See us on Instagram</strong><span className="mt-1 block text-xs font-bold text-white/60">Posts, chart clips, and updates · @darth.algo</span></span>
              <ArrowUpRight className="h-5 w-5 shrink-0 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
            </a>
          </article>

          <article className="mt-3 overflow-hidden rounded-[1.5rem] border border-cyan-300/25 bg-[#0c1118]/92 shadow-[0_20px_50px_rgba(0,0,0,.25)] backdrop-blur-sm">
            <div className="relative grid h-48 grid-cols-3 gap-1 overflow-hidden bg-black p-1">
              {[
                ["/indicator-examples/darth-algo-feature-map-01.png", "Darth Algo Pro Tool TikTok preview"],
                ["/indicators/scalper-execution.png", "Darth Algo Scalper TikTok preview"],
                ["/indicators/swing-overview.png", "Darth Algo Swing TikTok preview"],
              ].map(([src, alt], index) => <div key={src} className="group relative overflow-hidden rounded-sm bg-zinc-950"><Image src={src} alt={alt} fill sizes="(max-width: 640px) 33vw, 190px" className="object-cover transition duration-500 group-hover:scale-110" /><span className={`absolute inset-0 ${index === 1 ? 'bg-cyan-400/10' : 'bg-red-500/10'}`} /><span className="absolute inset-0 grid place-items-center"><span className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur"><Play className="h-3.5 w-3.5 fill-current" /></span></span></div>)}
              <span aria-hidden="true" className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[8px] font-black uppercase tracking-[.15em] text-white backdrop-blur">Darth Algo clips</span>
            </div>
            <a href="https://www.tiktok.com/@darth.algo" target="_blank" rel="noreferrer" className="group flex items-center gap-4 bg-gradient-to-r from-cyan-400/15 via-transparent to-red-500/15 p-4 transition hover:from-cyan-400/25 hover:to-red-500/25">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-black text-white shadow-[-4px_0_0_#22d3ee,4px_0_0_#f43f5e]"><Music2 className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1"><strong className="font-display block text-xl font-black">Watch us on TikTok</strong><span className="mt-1 block text-xs font-bold text-white/60">Signals, demos, and trading lives · @darth.algo</span></span>
              <ArrowUpRight className="h-5 w-5 shrink-0 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
            </a>
          </article>
        </section>

        <section aria-labelledby="more-tools-heading" className="mt-6">
          <div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">More indicator access</p><h2 id="more-tools-heading" className="font-display mt-1 text-2xl font-black">Choose your next tool.</h2></div><Link href="/#pricing" className="text-[9px] font-black uppercase tracking-wider text-zinc-500 hover:text-white">Compare all</Link></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {name:'Scalper Tool',eyebrow:'Fast session signals',price:'$18.99',image:'/indicators/scalper-execution.png',href:'https://buy.stripe.com/14AfZi4T5fRidqS2oc6kg03',product:'/products/scalper',accent:'from-orange-500 to-red-500',border:'border-orange-400/25',text:'text-orange-300'},
              {name:'Pro Tool',eyebrow:'Scalper + Swing',price:'$29',image:'/indicator-examples/darth-algo-feature-map-01.png',href:'https://buy.stripe.com/4gM8wQfxJ6gI1IabYM6kg05',product:'/products/pro',accent:'from-violet-600 to-fuchsia-500',border:'border-violet-400/25',text:'text-violet-300'},
            ].map(tool=><article key={tool.name} className={`group overflow-hidden rounded-[1.35rem] border bg-[#0d1118]/92 backdrop-blur-sm ${tool.border} shadow-[0_18px_45px_rgba(0,0,0,.22)]`}>
              <Link href={tool.product} className="relative block aspect-[16/8] overflow-hidden bg-black"><Image src={tool.image} alt={`Darth Algo ${tool.name} chart preview`} fill sizes="(max-width: 640px) 100vw, 288px" className="object-cover transition duration-500 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-[#0d1118] to-transparent"/><span className={`absolute bottom-2 left-3 text-[8px] font-black uppercase tracking-[.15em] ${tool.text}`}>{tool.eyebrow}</span></Link>
              <div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-display text-lg font-black">Darth Algo {tool.name}</h3><div className="shrink-0 text-right"><strong className="text-lg font-black">{tool.price}</strong><span className="block text-[8px] uppercase text-zinc-600">/ month</span></div></div><a href={tool.href} className={`mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 ${tool.accent}`}>Get {tool.name} <ArrowUpRight className="h-3.5 w-3.5"/></a></div>
            </article>)}
          </div>
        </section>

        <section aria-label="More Darth Algo links" className="mt-4 grid grid-cols-2 gap-3">
          {secondaryLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="group relative flex min-h-[100px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.06] to-white/[.015] p-4 shadow-[0_12px_30px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-1 hover:border-red-500/35 hover:shadow-[0_18px_45px_rgba(239,68,68,.12)]">
                <span aria-hidden="true" className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-red-500/10 blur-2xl transition group-hover:bg-red-500/25" />
                <Icon className="relative h-5 w-5 text-red-400 transition group-hover:scale-110" />
                <span className="flex items-end justify-between gap-2 text-sm font-black">
                  {item.title}<ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-white" />
                </span>
              </Link>
            );
          })}
        </section>

        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-4 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Official Darth Algo links only</p>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">Educational tools only—not financial advice. Trading involves risk. Past performance does not guarantee future results.</p>
        </div>

        <footer className="mt-8 flex items-center justify-center gap-2 pb-4 text-xs font-bold text-zinc-600">
          <MessageCircle className="h-3.5 w-3.5" /> © 2026 Darth Algo
        </footer>
      </div>
    </main>
  );
}
