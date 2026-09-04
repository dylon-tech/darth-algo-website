import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
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
    title: "Join the Free Community",
    detail: "Education, chart talk, setup help, and updates",
    href: "/go/community?source=direct&campaign=links",
    icon: Users,
    accent: "from-emerald-400/25 via-emerald-400/10 to-transparent",
    badge: "TELEGRAM",
    externalRoute: true,
  },
  {
    title: "Message D.A. Assistant",
    detail: "Fast help with plans, access, and TradingView setup",
    href: "https://t.me/DarthAlgoAssistantBot",
    icon: Bot,
    accent: "from-sky-400/25 via-sky-400/10 to-transparent",
    badge: "24/7 HELP",
    external: true,
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
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        <div className="flex justify-end">
          <LinkActions />
        </div>

        <section className="mt-5 text-center">
          <Link href="/" aria-label="Go to the Darth Algo website" className="inline-flex justify-center">
            <span className="grid h-24 w-24 place-items-center rounded-[1.8rem] border border-red-500/30 bg-gradient-to-br from-red-500/20 via-[#12151c] to-black shadow-[0_0_55px_rgba(239,68,68,.22)]">
              <Image src="/darth-algo-icon.svg" alt="Darth Algo" width={68} height={68} priority className="h-[68px] w-[68px] drop-shadow-[0_0_18px_rgba(239,68,68,.45)]" />
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
            const className = "group relative flex min-h-[78px] items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#11151d]/90 p-4 shadow-[0_14px_35px_rgba(0,0,0,.28)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-[#151a24]";
            const content = <>
              <span aria-hidden="true" className={`absolute inset-0 bg-gradient-to-r ${item.accent} opacity-80 transition group-hover:opacity-100`} />
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/35 text-white shadow-inner">
                <Icon className="h-5 w-5" />
              </span>
              <span className="relative min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2">
                  <strong className="font-display text-[17px] font-black">{item.title}</strong>
                  <span className="hidden rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[8px] font-black tracking-[.12em] text-zinc-400 sm:inline">{item.badge}</span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-zinc-400">{item.detail}</span>
              </span>
              <ArrowUpRight className="relative h-5 w-5 shrink-0 text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
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
              <Link key={item.title} href={item.href} className="group flex min-h-[92px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[.035] p-4 transition hover:border-red-500/35 hover:bg-red-500/[.07]">
                <Icon className="h-5 w-5 text-red-400 transition group-hover:scale-110" />
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
