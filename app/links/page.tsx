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
  Play,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
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

const primaryLinks = [
  {
    title: "Enter the Darth Algo Community",
    detail: "Free trading education • live chart talk • indicator help",
    href: "/go/community?source=direct&campaign=links",
    icon: Users,
    accent: "from-emerald-400/40 via-cyan-400/15 to-violet-500/10",
    badge: "JOIN FREE",
    externalRoute: true,
  },
] as const;

const secondaryLinks = [
  { title: "Trading Education", href: "/education", icon: BookOpen },
  { title: "Affiliate Program", href: "/affiliates", icon: Sparkles },
  { title: "Customer Support", href: "/support", icon: LifeBuoy },
  { title: "DarthAlgo.com", href: "/", icon: Zap },
] as const;

export default function LinksPage() {
  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-[#07090d] px-4 py-8 text-white sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-red-600/15 blur-[110px]" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
        <svg viewBox="0 0 1200 1100" preserveAspectRatio="xMidYMin slice" className="absolute inset-x-0 top-24 h-[68rem] w-full opacity-[.24]">
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
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        <div className="flex justify-end">
          <LinkActions />
        </div>

        <section className="mt-5 text-center">
          <Link href="/" aria-label="Go to the Darth Algo website" className="inline-flex justify-center">
            <span className="relative grid h-40 w-40 place-items-center overflow-hidden rounded-[2rem] border border-red-400/40 bg-black shadow-[0_0_70px_rgba(239,68,68,.3)] ring-1 ring-white/10 sm:h-44 sm:w-44">
              <Image src="/darth-algo-link-logo.svg" alt="Darth Algo trading logo" fill priority sizes="176px" className="object-cover transition duration-500 hover:scale-105" />
              <span className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/15" />
            </span>
          </Link>
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[.18em] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Official link hub
            </span>
          </div>
          <h1 className="font-display mt-4 text-4xl font-black uppercase tracking-tight sm:text-5xl">
            <span className="text-red-500">Darth</span> Algo
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400 sm:text-base">
            TradingView indicators, trader education, community access, and real support—all in one place.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-zinc-400">
            <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5">Futures focused</span>
            <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5">TradingView ready</span>
            <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5">Stripe checkout</span>
          </div>
        </section>

        <section aria-label="Featured Darth Algo Pro Tool" className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-violet-400/30 bg-[#11121a] shadow-[0_24px_80px_rgba(109,40,217,.22)]">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(168,85,247,.32),transparent_34%),radial-gradient(circle_at_5%_92%,rgba(239,68,68,.22),transparent_38%)]" />
          <div className="relative border-b border-white/10 bg-black/25 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-violet-200"><span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" /> Featured indicator</span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-200">TradingView</span>
            </div>
          </div>

          <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-black">
            <Image src="/indicator-examples/darth-algo-feature-map-01.png" alt="Darth Algo Pro Tool showing signals and trading levels on a futures chart" fill priority sizes="(max-width: 640px) 100vw, 576px" className="object-cover object-left" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c12] via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 flex gap-2">
              <span className="rounded-md border border-white/15 bg-black/70 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">Buy + sell signals</span>
              <span className="rounded-md border border-white/15 bg-black/70 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">Risk levels</span>
            </div>
          </div>

          <div className="relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-300">Scalper + Swing</p>
                <h2 className="font-display mt-2 text-2xl font-black leading-tight sm:text-3xl">Buy the Darth Algo Pro Tool</h2>
              </div>
              <div className="shrink-0 text-right"><strong className="text-2xl font-black">$29</strong><span className="block text-[10px] font-bold uppercase text-zinc-500">per month</span></div>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">The complete monthly indicator bundle with real-time alerts, trade levels, trend confirmation, and risk tools.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-300">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Instant checkout</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Invite-only access</span>
            </div>
            <a href="https://buy.stripe.com/4gM8wQfxJ6gI1IabYM6kg05" className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-red-500 px-5 text-sm font-black text-white shadow-[0_12px_35px_rgba(168,85,247,.35)] transition hover:-translate-y-0.5 hover:brightness-110">
              <CreditCard className="h-4 w-4" /> Get Pro Access <ArrowUpRight className="h-4 w-4" />
            </a>
            <Link href="/#pricing" className="mt-3 flex min-h-11 items-center justify-center text-xs font-black text-zinc-400 transition hover:text-white">Compare every indicator plan</Link>
          </div>
        </section>

        <div aria-hidden="true" className="mt-5 flex items-center justify-between overflow-hidden rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-[9px] font-black uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5 text-emerald-300"><TrendingUp className="h-3.5 w-3.5" /> Futures focused</span><span>ES</span><span>NQ</span><span>GC</span><span className="text-red-300">Live signals</span>
        </div>

        <section aria-label="Main Darth Algo links" className="mt-8 space-y-3">
          {primaryLinks.map((item) => {
            const Icon = item.icon;
            const className = "group relative flex min-h-[112px] items-center gap-4 overflow-hidden rounded-[1.5rem] border border-emerald-300/25 bg-[#0d1718]/95 p-5 shadow-[0_20px_55px_rgba(16,185,129,.14)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-300/45 hover:shadow-[0_24px_70px_rgba(34,211,238,.2)]";
            const content = <>
              <span aria-hidden="true" className={`absolute inset-0 bg-gradient-to-r ${item.accent} opacity-80 transition group-hover:opacity-100`} />
              <span aria-hidden="true" className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-cyan-300/15 bg-cyan-300/10 blur-[1px] transition duration-500 group-hover:scale-125" />
              <span aria-hidden="true" className="absolute right-8 top-4 h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,.9)]" />
              <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-emerald-200/25 bg-gradient-to-br from-emerald-400/30 via-cyan-400/15 to-black/50 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.15),0_0_30px_rgba(16,185,129,.18)]">
                <Icon className="h-7 w-7" />
              </span>
              <span className="relative min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2">
                  <strong className="font-display text-lg font-black leading-tight sm:text-xl">{item.title}</strong>
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-zinc-300">{item.detail}</span>
                <span className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.14em] text-emerald-200">{item.badge}</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.14em] text-zinc-400">Telegram</span>
                </span>
              </span>
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.06] text-zinc-300 transition group-hover:rotate-12 group-hover:border-cyan-300/30 group-hover:bg-cyan-300/15 group-hover:text-white"><ArrowUpRight className="h-4 w-4" /></span>
            </>;

            if ("external" in item && item.external) {
              return <a key={item.title} href={item.href} target="_blank" rel="noreferrer" className={className}>{content}</a>;
            }
            if ("externalRoute" in item && item.externalRoute) {
              return <a key={item.title} href={item.href} className={className}>{content}</a>;
            }
            return <Link key={item.title} href={item.href} className={className}>{content}</Link>;
          })}
        </section>

        <section aria-labelledby="social-heading" className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">See it in action</p><h2 id="social-heading" className="font-display mt-1 text-2xl font-black">Watch. Learn. Follow.</h2></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Official socials</span>
          </div>

          <article className="overflow-hidden rounded-[1.5rem] border border-red-500/25 bg-[#11151d] shadow-[0_20px_50px_rgba(0,0,0,.3)]">
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

          <a href="https://www.instagram.com/darth.algo/" target="_blank" rel="noreferrer" className="group relative mt-3 flex min-h-[150px] items-end overflow-hidden rounded-[1.5rem] border border-fuchsia-400/25 bg-[#11151d] p-5 shadow-[0_20px_50px_rgba(0,0,0,.25)]">
            <Image src="/indicators/signal-context-alt.png" alt="Darth Algo indicator chart content featured on Instagram" fill sizes="(max-width: 640px) 100vw, 576px" className="object-cover opacity-50 transition duration-500 group-hover:scale-105 group-hover:opacity-65" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-fuchsia-700/70 via-purple-900/45 to-black/30" />
            <span className="relative flex w-full items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-red-500 to-amber-400 text-white shadow-lg"><Instagram className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1"><strong className="font-display block text-xl font-black">Follow @darth.algo</strong><span className="mt-1 block text-xs font-bold text-white/70">Trading content, product clips, and company updates</span></span>
              <ArrowUpRight className="h-5 w-5 shrink-0 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
            </span>
          </a>
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
