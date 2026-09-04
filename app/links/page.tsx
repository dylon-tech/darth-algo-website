import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Instagram,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
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
    title: "Get the Indicators",
    detail: "Compare Scalper, Swing, Pro, and Lifetime",
    href: "/#pricing",
    icon: ShoppingBag,
    accent: "from-red-500/30 via-red-500/10 to-transparent",
    badge: "START HERE",
  },
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
  {
    title: "Follow on Instagram",
    detail: "Trading content, product clips, and updates · @darth.algo",
    href: "https://www.instagram.com/darth.algo/",
    icon: Instagram,
    accent: "from-fuchsia-500/25 via-orange-400/10 to-transparent",
    badge: "SOCIAL",
    external: true,
  },
  {
    title: "Watch on YouTube",
    detail: "Indicator demos, trading clips, and tutorials · @DarthAlgoTools",
    href: "https://www.youtube.com/@DarthAlgoTools",
    icon: Youtube,
    accent: "from-red-600/30 via-red-500/10 to-transparent",
    badge: "VIDEOS",
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
