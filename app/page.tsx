"use client";

import Image from "next/image";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Check,
  ChevronRight,
  CloudLightning,
  Code2,
  Crown,
  Gauge,
  LockKeyhole,
  Menu,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Performance", href: "#performance" },
  { label: "FAQ", href: "#faq" },
];

const features = [
  {
    icon: TrendingUp,
    title: "Buy & Sell Signals",
    copy: "Clear signal markers designed to identify actionable trend-following opportunities.",
  },
  {
    icon: CloudLightning,
    title: "Trend Cloud",
    copy: "Visual market direction confirmation so you can read momentum at a glance.",
  },
  {
    icon: Target,
    title: "Entry / Stop Loss / Take Profit Levels",
    copy: "Projected levels help structure trades before emotion enters the chart.",
  },
  {
    icon: BellRing,
    title: "TradingView Alerts",
    copy: "Real-time alert support for signals, trend shifts, and key market conditions.",
  },
  {
    icon: Gauge,
    title: "Risk/Reward Dashboard",
    copy: "A compact view of trade context, levels, and risk profile directly on chart.",
  },
  {
    icon: BarChart3,
    title: "Built for Futures Traders",
    copy: "Engineered around fast-moving futures workflows and intraday decision-making.",
  },
  {
    icon: LockKeyhole,
    title: "Invite-Only Access",
    copy: "Private TradingView access keeps the tool exclusive to verified members.",
  },
  {
    icon: Rocket,
    title: "Continuous Updates",
    copy: "Ongoing improvements, refinements, and future indicator enhancements.",
  },
];

const steps = [
  "Choose a plan",
  "Enter your TradingView username during checkout",
  "Receive manual invite-only access",
  "Add Darth Algo to your chart",
  "Start receiving signals",
];

const pricingPlans = [
  {
    id: "monthly",
    name: "Darth Algo Pro",
    price: "$29",
    cadence: "/month",
    featured: false,
    button: "Subscribe Monthly",
    includes: [
      "Darth Algo Buy/Sell Tool",
      "Real-Time Alerts",
      "Entry, Stop Loss & Take Profit Levels",
      "Dashboard Analytics",
      "Future Indicator Updates",
      "Invite-Only TradingView Access",
    ],
  },
  {
    id: "lifetime",
    name: "Darth Algo Lifetime",
    price: "$230",
    cadence: "One-Time Payment",
    featured: true,
    badge: "Best Value",
    button: "Buy Lifetime Access",
    includes: [
      "Lifetime Access to Darth Algo",
      "All Future Updates",
      "Full Ownership License",
      "Complete Pine Script Source Code",
      "Commercial Use Rights",
      "No Monthly Fees Ever",
    ],
  },
];

const checkoutLinks = {
  monthly:
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_LINK ||
    "https://buy.stripe.com/fZu4gA4T5fRiaeG0g46kg01",
  lifetime:
    process.env.NEXT_PUBLIC_STRIPE_LIFETIME_LINK ||
    "https://buy.stripe.com/3cI7sM71d48A4Um5Ao6kg00",
};

const featuredPerformance = [
  { label: "Win Rate", value: "87%", detail: "87 winning trades out of 100" },
  { label: "Average Risk/Reward", value: "1:2.3", detail: "Average reward profile" },
  { label: "Profit Factor", value: "3.4", detail: "Gross wins versus gross losses" },
];

const performanceMetrics = [
  { label: "Total Trades", value: "100" },
  { label: "Winning Trades", value: "87" },
  { label: "Losing Trades", value: "13" },
  { label: "Largest Win", value: "+5.2R" },
  { label: "Largest Loss", value: "-1R" },
  { label: "Average Trade", value: "+1.12R" },
  { label: "Max Drawdown", value: "3.8%" },
  { label: "Average Trades Per Week", value: "20" },
];

const performanceBars = [
  { label: "Win Distribution", value: "87 Wins", percent: "87%" },
  { label: "Loss Distribution", value: "13 Losses", percent: "13%" },
  { label: "Drawdown Control", value: "3.8% Max DD", percent: "24%" },
];

const indicatorExamples = [
  {
    title: "Feature Map",
    copy: "Dashboard, buy/sell signals, entry, take-profit, and stop-loss zones.",
    image: "/indicator-examples/darth-algo-feature-map-01.png",
    height: 767,
  },
  {
    title: "Bearish Setup",
    copy: "Short bias, sell continuation signals, and trade box levels.",
    image: "/indicator-examples/darth-algo-feature-map-02.png",
    height: 767,
  },
  {
    title: "Risk/Reward Planner",
    copy: "Entry, stop loss, TP1, and TP2 mapped before the move.",
    image: "/indicator-examples/darth-algo-feature-map-03.png",
    height: 767,
  },
  {
    title: "Trend Cloud",
    copy: "Bullish and bearish cloud shifts with matching signal markers.",
    image: "/indicator-examples/darth-algo-feature-map-04.png",
    height: 880,
  },
  {
    title: "Market Bias",
    copy: "Trend support, momentum flips, and clean price context.",
    image: "/indicator-examples/darth-algo-feature-map-05.png",
    height: 880,
  },
];

const testimonials = [
  {
    quote:
      "Darth Algo made my chart cleaner and gave me a stronger process for confirming trend trades.",
    name: "Futures Trader",
    role: "NQ / ES Scalper",
  },
  {
    quote:
      "The alerts and levels are exactly what I wanted: direct, fast, and easy to build into a routine.",
    name: "Private Member",
    role: "Day Trader",
  },
  {
    quote:
      "The lifetime option is serious value, especially with the source code and future updates included.",
    name: "Algo User",
    role: "TradingView Builder",
  },
];

const faqs = [
  {
    question: "How do I receive access?",
    answer:
      "Enter your TradingView username during Stripe checkout. After purchase, access is manually granted through TradingView's invite-only script system.",
  },
  {
    question: "Which markets does Darth Algo support?",
    answer:
      "Darth Algo is built with futures traders in mind, but it can be applied to futures, stocks, forex, crypto, and other TradingView-supported markets.",
  },
  {
    question: "Do I need TradingView Premium?",
    answer:
      "No. You need a TradingView account that supports invite-only scripts and alerts for the way you plan to trade.",
  },
  {
    question: "Is the source code included?",
    answer:
      "The complete Pine Script source code is included with the Darth Algo Lifetime plan only.",
  },
  {
    question: "What happens after I purchase?",
    answer:
      "Your payment and TradingView username are received through Stripe. Once the order is verified, invite-only access is manually activated and you receive confirmation.",
  },
];

const tickerTape = [
  "ES SIGNAL",
  "NQ MOMENTUM",
  "SPY TREND",
  "QQQ BREAKOUT",
  "YM WATCH",
  "RTY SETUP",
  "AAPL LEVELS",
  "TSLA VOLATILITY",
];

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "leading-none" : "leading-none"}>
      <div className="leading-none">
        <p className={`font-display font-bold tracking-[0.18em] text-ember ${compact ? "text-xl" : "text-3xl"}`}>
          DARTH
        </p>
        <p className={`font-display font-semibold tracking-[0.32em] text-white ${compact ? "text-sm" : "text-xl"}`}>
          ALGO
        </p>
      </div>
    </div>
  );
}

function MarketBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid bg-[size:42px_42px] opacity-[0.16]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,2,3,0.2),rgba(2,2,3,0.72)_48%,#020203)]" />
      <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_52%_0%,rgba(255,26,26,0.25),transparent_58%)]" />

      <div className="market-tape absolute left-0 right-0 top-24 border-y border-ember/10 bg-black/30 py-2 opacity-70 backdrop-blur-sm">
        <div className="market-tape-track flex gap-8 whitespace-nowrap font-display text-xs font-bold text-zinc-500 sm:text-sm">
          {[...tickerTape, ...tickerTape, ...tickerTape].map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex items-center gap-3">
              <span className="text-zinc-600">{item}</span>
              <span className={index % 3 === 0 ? "text-ember" : "text-zinc-300"}>
                {index % 3 === 0 ? "BUY" : index % 3 === 1 ? "HOLD" : "SELL"}
              </span>
            </span>
          ))}
        </div>
      </div>

      <svg
        className="absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 1100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="marketLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#ff1a1a" stopOpacity="0" />
            <stop offset="45%" stopColor="#ff1a1a" stopOpacity="0.68" />
            <stop offset="100%" stopColor="#ff1a1a" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="marketFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff1a1a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ff1a1a" stopOpacity="0" />
          </linearGradient>
          <filter id="softRedGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g opacity="0.35">
          {[150, 240, 330, 420, 510, 600, 690, 780].map((y) => (
            <line
              key={y}
              x1="80"
              x2="1360"
              y1={y}
              y2={y}
              stroke="#ffffff"
              strokeDasharray="8 18"
              strokeOpacity="0.12"
            />
          ))}
        </g>

        <path
          d="M-40 660 C110 610, 210 690, 320 560 S520 430, 650 480 S850 610, 980 390 S1230 230, 1490 305"
          fill="none"
          filter="url(#softRedGlow)"
          stroke="url(#marketLine)"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M-40 700 C110 650, 210 730, 320 600 S520 470, 650 520 S850 650, 980 430 S1230 270, 1490 345 L1490 1100 L-40 1100 Z"
          fill="url(#marketFill)"
        />

        <g opacity="0.72">
          {[
            [150, 500, 70, 46, "#35383f", "#d4d4d8"],
            [220, 455, 110, 54, "#b90000", "#ff4040"],
            [292, 410, 86, 48, "#d70000", "#ff5757"],
            [374, 372, 130, 58, "#23262c", "#a1a1aa"],
            [452, 312, 96, 50, "#c90000", "#ff4a4a"],
            [540, 355, 140, 62, "#e00000", "#ff6868"],
            [632, 280, 92, 48, "#252930", "#a1a1aa"],
            [720, 242, 122, 56, "#b90000", "#ff4040"],
            [812, 310, 96, 46, "#30343b", "#d4d4d8"],
            [904, 206, 136, 58, "#d00000", "#ff5050"],
            [1002, 170, 90, 48, "#b90000", "#ff4040"],
            [1098, 225, 118, 54, "#2b2f36", "#d4d4d8"],
            [1196, 150, 92, 46, "#dd0000", "#ff4f4f"],
            [1290, 188, 126, 54, "#a80000", "#ff3838"],
          ].map(([x, y, wick, body, fill, stroke]) => (
            <g key={`${x}-${y}`}>
              <line
                x1={x}
                x2={x}
                y1={Number(y) - Number(wick) / 2}
                y2={Number(y) + Number(wick) / 2}
                stroke={String(stroke)}
                strokeOpacity="0.9"
                strokeWidth="2"
              />
              <rect
                fill={String(fill)}
                height={Number(body)}
                stroke={String(stroke)}
                strokeOpacity="0.95"
                width="30"
                x={Number(x) - 15}
                y={Number(y) - Number(body) / 2}
              />
            </g>
          ))}
        </g>

        <g className="market-depth" opacity="0.48">
          <path
            d="M160 900 C280 812, 360 844, 452 760 S650 706, 748 752 S904 850, 1040 735 S1248 622, 1370 650"
            fill="none"
            stroke="#ffffff"
            strokeDasharray="10 14"
            strokeOpacity="0.18"
            strokeWidth="2"
          />
          <path
            d="M80 250 L520 190 L860 245 L1310 120"
            fill="none"
            stroke="#ff1a1a"
            strokeDasharray="6 10"
            strokeOpacity="0.32"
            strokeWidth="1"
          />
          <path
            d="M1050 920 L1350 790"
            fill="none"
            stroke="#ff1a1a"
            strokeOpacity="0.22"
            strokeWidth="2"
          />
        </g>
      </svg>

      <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-obsidian via-obsidian/80 to-transparent" />
    </div>
  );
}

function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <a
      href={href}
      className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 text-sm font-bold transition duration-300 ${
        variant === "primary"
          ? "bg-ember text-white shadow-glow hover:bg-red-500 hover:shadow-glow-lg"
          : "border border-white/15 bg-white/[0.04] text-white hover:border-ember/70 hover:bg-ember/10"
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
    </a>
  );
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-obsidian text-white">
      <MarketBackdrop />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-xl">
        <nav className="section-shell flex h-20 items-center justify-between">
          <a href="#top" aria-label="Darth Algo home">
            <LogoMark compact />
          </a>

          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-300 transition hover:text-ember"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:block">
            <ButtonLink href="#pricing">Get Access</ButtonLink>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/[0.04] lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {mobileOpen && (
          <div className="border-t border-white/10 bg-black/95 px-5 py-5 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md border border-white/10 px-4 py-3 text-sm text-zinc-200"
                >
                  {link.label}
                </a>
              ))}
              <ButtonLink href="#pricing">Get Access</ButtonLink>
            </div>
          </div>
        )}
      </header>

      <section id="top" className="relative z-10">
        <div className="section-shell grid min-h-[calc(100vh-5rem)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-3 rounded-md border border-ember/30 bg-ember/10 px-4 py-2 text-xs font-bold uppercase text-red-100 shadow-glow">
              <Sparkles className="h-4 w-4 text-ember" />
              Invite-only TradingView indicator
            </div>
            <h1 className="font-display text-6xl font-bold leading-[0.9] text-ember drop-shadow-[0_0_26px_rgba(255,26,26,0.55)] sm:text-7xl lg:text-8xl">
              DARTH <span className="block text-white drop-shadow-[0_0_26px_rgba(255,255,255,0.18)]">ALGO</span>
            </h1>
            <p className="mt-6 font-display text-2xl font-semibold text-zinc-100 sm:text-3xl">
              Built for Precision. Designed for Traders.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              A professional trend-following buy/sell indicator built for futures traders
              with real-time alerts, entry levels, stop loss, take profit zones, and market
              trend confirmation.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <ButtonLink href="#pricing">Get Access</ButtonLink>
              <ButtonLink href="#pricing" variant="secondary">
                View Pricing
              </ButtonLink>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-0 animate-pulseGlow rounded-full bg-ember/20 blur-3xl" />
            <div className="panel-border relative overflow-hidden rounded-md p-6 shadow-glow-lg">
              <div className="absolute inset-x-0 top-0 h-px red-line" />
              <div className="absolute inset-y-0 right-1/3 w-px animate-scan bg-gradient-to-b from-transparent via-ember/50 to-transparent" />
              <div className="mb-6 flex items-center justify-between">
                <LogoMark />
                <div className="rounded-md border border-ember/30 bg-ember/10 px-3 py-1 text-xs font-bold text-ember">
                  LIVE
                </div>
              </div>
              <div className="relative h-72 overflow-hidden rounded-md border border-white/10 bg-black">
                <div className="absolute inset-0 bg-grid bg-[size:34px_34px] opacity-30" />
                <div className="absolute left-5 right-5 top-1/2 h-24 -translate-y-1/2 rounded-full bg-ember/10 blur-2xl" />
                <svg
                  viewBox="0 0 500 280"
                  className="absolute inset-0 h-full w-full"
                  role="img"
                  aria-label="Trading chart preview"
                >
                  <defs>
                    <linearGradient id="cloud" x1="0" x2="1">
                      <stop offset="0%" stopColor="#ff1a1a" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#ff1a1a" stopOpacity="0.28" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M20 190 C80 150, 115 170, 160 128 S250 92, 300 118 S392 165, 480 75"
                    fill="none"
                    stroke="#ff1a1a"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M20 218 C80 178, 115 198, 160 156 S250 120, 300 146 S392 193, 480 103 L480 155 C392 230, 300 197, 250 170 S160 214, 115 224 S80 205, 20 244 Z"
                    fill="url(#cloud)"
                  />
                  {[72, 118, 178, 245, 312, 370, 425].map((x, index) => (
                    <g key={x}>
                      <line
                        x1={x}
                        y1={index % 2 ? 74 : 108}
                        x2={x}
                        y2={index % 2 ? 206 : 228}
                        stroke={index % 3 === 0 ? "#a3a3a3" : "#ff1a1a"}
                        strokeWidth="2"
                      />
                      <rect
                        x={x - 10}
                        y={index % 2 ? 100 : 135}
                        width="20"
                        height={index % 2 ? 58 : 48}
                        fill={index % 3 === 0 ? "#2f3338" : "#c90000"}
                        stroke={index % 3 === 0 ? "#c7c7c7" : "#ff4a4a"}
                      />
                    </g>
                  ))}
                  <line x1="55" x2="455" y1="92" y2="92" stroke="#ff1a1a" strokeDasharray="8 8" opacity="0.75" />
                  <line x1="55" x2="455" y1="206" y2="206" stroke="#ffffff" strokeDasharray="8 8" opacity="0.32" />
                </svg>
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3">
                  {["ENTRY", "STOP", "TARGET"].map((label) => (
                    <div key={label} className="rounded-md border border-white/10 bg-black/75 p-3 backdrop-blur">
                      <p className="text-[10px] font-bold text-zinc-500">{label}</p>
                      <p className="mt-1 font-display text-lg font-bold text-white">
                        {label === "STOP" ? "LOCKED" : "ACTIVE"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 py-20 sm:py-24">
        <div className="section-shell">
          <SectionHeading
            eyebrow="Feature Suite"
            title="Everything a focused trader expects on the chart."
            copy="Darth Algo brings signal clarity, level planning, and trend confirmation into one premium TradingView workflow."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="panel-border group rounded-md p-6 transition duration-300 hover:-translate-y-1 hover:border-ember/50 hover:bg-ember/[0.06] hover:shadow-glow"
              >
                <feature.icon className="h-7 w-7 text-ember" />
                <h3 className="mt-5 font-display text-xl font-bold text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{feature.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 border-y border-white/10 bg-black/50 py-20 backdrop-blur-sm sm:py-24">
        <div className="section-shell">
          <SectionHeading
            eyebrow="Activation"
            title="From checkout to chart in five clean steps."
            copy="The access flow is simple, private, and built around TradingView's invite-only script system."
          />
          <div className="mt-12 grid gap-4 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="panel-border relative rounded-md p-6">
                <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-md bg-ember text-sm font-black shadow-glow">
                  {index + 1}
                </div>
                <p className="font-display text-xl font-bold text-white">{step}</p>
                {index < steps.length - 1 && (
                  <ChevronRight className="absolute right-5 top-8 hidden h-5 w-5 text-ember/70 lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 py-20 sm:py-24">
        <div className="section-shell">
          <SectionHeading
            eyebrow="Pricing"
            title="Choose monthly access or own the full system."
            copy="Start with the invite-only tool, or lock in lifetime access with source code and commercial use rights."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`relative rounded-md p-7 transition duration-300 hover:-translate-y-1 ${
                  plan.featured
                    ? "border border-ember/70 bg-ember/[0.08] shadow-glow-lg"
                    : "panel-border hover:border-ember/40 hover:shadow-glow"
                }`}
              >
                {plan.badge && (
                  <div className="absolute right-5 top-5 rounded-md bg-ember px-3 py-1 text-xs font-black uppercase text-white shadow-glow">
                    {plan.badge}
                  </div>
                )}
                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-ember/40 bg-black">
                  {plan.featured ? (
                    <Crown className="h-6 w-6 text-ember" />
                  ) : (
                    <ShieldCheck className="h-6 w-6 text-ember" />
                  )}
                </div>
                <h3 className="mt-7 font-display text-3xl font-bold text-white">
                  {plan.name}
                </h3>
                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <span className="font-display text-6xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="mb-3 text-sm font-semibold text-zinc-400">
                    {plan.cadence}
                  </span>
                </div>
                <ul className="mt-7 space-y-4">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-300">
                      <Check className="mt-0.5 h-5 w-5 flex-none text-ember" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href={checkoutLinks[plan.id as keyof typeof checkoutLinks]}
                  className={`mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-6 text-sm font-bold transition ${
                    plan.featured
                      ? "bg-ember text-white shadow-glow hover:bg-red-500"
                      : "border border-white/15 bg-white/[0.04] text-white hover:border-ember hover:bg-ember/10"
                  }`}
                >
                  {plan.button}
                  <ArrowRight className="h-4 w-4" />
                </a>
                <p className="mt-3 text-center text-xs text-zinc-500">
                  Secure Stripe checkout with TradingView username collection.
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-md border border-ember/25 bg-black/55 p-6 shadow-glow">
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="font-display text-sm font-bold uppercase text-ember">
                  After Checkout
                </p>
                <h3 className="mt-2 font-display text-3xl font-bold text-white">
                  Purchase through Stripe, enter your TradingView username, then get invited.
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Pay securely through Stripe",
                  "Enter your TradingView username at checkout",
                  "Receive manually activated script access",
                ].map((item, index) => (
                  <div key={item} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-ember text-sm font-black text-white shadow-glow">
                      {index + 1}
                    </div>
                    <p className="text-sm font-semibold leading-6 text-zinc-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="performance" className="relative z-10 border-y border-white/10 bg-black/50 py-20 backdrop-blur-sm sm:py-24">
        <div className="section-shell">
          <SectionHeading
            eyebrow="Performance"
            title="Top-tier statistics for a precision trading workflow."
            copy="A polished 100-trade performance snapshot for the Darth Algo Buy/Sell Tool."
          />
          <div className="mt-12 flex flex-wrap items-center gap-3">
            {["100 Trade Sample", "87 Winners", "3.8% Max Drawdown"].map((item) => (
              <div
                key={item}
                className="rounded-md border border-ember/25 bg-ember/[0.07] px-4 py-2 text-xs font-bold uppercase text-red-100 shadow-glow"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {featuredPerformance.map((metric) => (
              <article
                key={metric.label}
                className="relative overflow-hidden rounded-md border border-ember/45 bg-[linear-gradient(145deg,rgba(255,26,26,0.16),rgba(255,255,255,0.035)_46%,rgba(0,0,0,0.72))] p-6 shadow-glow transition duration-300 hover:-translate-y-1 hover:border-ember/80 hover:shadow-glow-lg"
              >
                <div className="absolute inset-x-0 top-0 h-px red-line" />
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-ember/20 blur-3xl" />
                <Activity className="h-6 w-6 text-ember" />
                <p className="mt-6 text-sm font-semibold uppercase text-zinc-400">
                  {metric.label}
                </p>
                <p className="mt-2 font-display text-6xl font-bold text-white drop-shadow-[0_0_22px_rgba(255,26,26,0.45)]">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{metric.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="panel-border rounded-md p-5 sm:p-6">
              <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-display text-2xl font-bold text-white">
                    Performance Matrix
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Trade outcomes, R-multiple profile, and risk control.
                  </p>
                </div>
                <p className="rounded-md border border-ember/30 bg-ember/10 px-3 py-1 text-xs font-bold uppercase text-ember">
                  Backtest Snapshot
                </p>
              </div>
              <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-2">
                {performanceMetrics.map((metric) => (
                  <div key={metric.label} className="bg-black/70 p-4">
                    <p className="text-xs font-bold uppercase text-zinc-500">
                      {metric.label}
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold text-white">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="panel-border relative overflow-hidden rounded-md p-5 sm:p-6">
              <div className="absolute inset-x-0 top-0 h-px red-line" />
              <p className="font-display text-2xl font-bold text-white">Trade Quality</p>
              <p className="mt-1 text-sm text-zinc-500">
                High-level view of winners, losses, and drawdown discipline.
              </p>

              <div className="mt-7 space-y-6">
                {performanceBars.map((bar) => (
                  <div key={bar.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-zinc-300">{bar.label}</span>
                      <span className="font-display text-lg font-bold text-white">
                        {bar.value}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-ember shadow-[0_0_18px_rgba(255,26,26,0.65)]"
                        style={{ width: bar.percent }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-md border border-white/10 bg-black/55 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase text-zinc-500">Equity Curve</p>
                  <p className="font-display text-lg font-bold text-ember">+112R Avg Profile</p>
                </div>
                <svg viewBox="0 0 360 120" className="h-28 w-full" aria-hidden="true">
                  <path
                    d="M8 98 C42 86, 52 94, 76 74 S124 58, 148 70 S196 92, 224 52 S284 34, 352 18"
                    fill="none"
                    stroke="#ff1a1a"
                    strokeLinecap="round"
                    strokeWidth="5"
                  />
                  <path
                    d="M8 102 C42 90, 52 98, 76 78 S124 62, 148 74 S196 96, 224 56 S284 38, 352 22 L352 120 L8 120 Z"
                    fill="rgba(255,26,26,0.14)"
                  />
                  <line
                    x1="8"
                    x2="352"
                    y1="100"
                    y2="100"
                    stroke="#ffffff"
                    strokeDasharray="6 8"
                    strokeOpacity="0.16"
                  />
                </svg>
              </div>
            </aside>
          </div>

          <p className="mt-6 max-w-3xl text-xs leading-6 text-zinc-500">
            Results are presented for educational and analytical purposes only. Past
            performance does not guarantee future results.
          </p>

          <div className="mt-14 border-t border-white/10 pt-12">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-display text-sm font-bold uppercase text-ember">
                  Indicator Feature Gallery
                </p>
                <h3 className="mt-3 font-display text-4xl font-bold leading-tight text-white">
                  Touched-up chart examples that explain the tool at a glance.
                </h3>
              </div>
              <p className="max-w-xl text-sm leading-6 text-zinc-400">
                These annotated examples highlight the main Darth Algo components:
                signal markers, trend cloud, dashboard confirmation, and planned
                entry/SL/TP levels.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {indicatorExamples.map((example, index) => (
                <article
                  key={example.title}
                  className={`panel-border overflow-hidden rounded-md transition duration-300 hover:-translate-y-1 hover:border-ember/50 hover:shadow-glow ${
                    index === 0 ? "lg:col-span-2" : ""
                  }`}
                >
                  <div className="relative border-b border-white/10 bg-black">
                    <Image
                      src={example.image}
                      alt={`${example.title} annotated Darth Algo indicator screenshot`}
                      width={1805}
                      height={example.height}
                      className="h-auto w-full"
                      sizes={index === 0 ? "100vw" : "(min-width: 1024px) 50vw, 100vw"}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                  </div>
                  <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-display text-2xl font-bold text-white">
                        {example.title}
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">{example.copy}</p>
                    </div>
                    <span className="w-fit rounded-md border border-ember/30 bg-ember/10 px-3 py-1 text-xs font-bold uppercase text-ember">
                      Example {index + 1}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 sm:py-24">
        <div className="section-shell">
          <SectionHeading
            eyebrow="Testimonials"
            title="Trusted by traders building sharper chart routines."
            copy="Placeholder feedback areas are ready for verified member results and quotes."
          />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.name} className="panel-border rounded-md p-6">
                <BadgeCheck className="h-7 w-7 text-ember" />
                <blockquote className="mt-6 text-base leading-7 text-zinc-200">
                  &quot;{testimonial.quote}&quot;
                </blockquote>
                <figcaption className="mt-7 border-t border-white/10 pt-5">
                  <p className="font-display text-lg font-bold text-white">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-zinc-500">{testimonial.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative z-10 border-y border-white/10 bg-black/50 py-20 backdrop-blur-sm sm:py-24">
        <div className="section-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow="FAQ"
            title="Answers before you join."
            copy="A quick overview of access, markets, TradingView requirements, source code, and purchase flow."
          />
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="panel-border group rounded-md p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-bold text-white">
                  {faq.question}
                  <Zap className="h-5 w-5 flex-none text-ember transition group-open:rotate-45" />
                </summary>
                <p className="mt-4 text-sm leading-7 text-zinc-400">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16">
        <div className="section-shell">
          <div className="rounded-md border border-ember/30 bg-ember/[0.06] p-6 shadow-glow">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <Code2 className="h-7 w-7 flex-none text-ember" />
              <p className="text-sm leading-7 text-zinc-300">
                &quot;Darth Algo is an educational and analytical tool only. It does not
                provide financial advice. Trading futures, stocks, forex, and
                cryptocurrencies involves substantial risk. Past performance does not
                guarantee future results.&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-black py-10">
        <div className="section-shell flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <LogoMark compact />
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-400">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-ember">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex gap-3">
            {["X", "TV", "YT"].map((social) => (
              <a
                key={social}
                href="#"
                aria-label={`${social} social link`}
                className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-xs font-bold text-zinc-300 transition hover:border-ember hover:text-ember"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
        <div className="section-shell mt-8 border-t border-white/10 pt-6">
          <p className="text-sm text-zinc-500">
            © 2026 Darth Algo. All Rights Reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="font-display text-sm font-bold uppercase text-ember">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-zinc-400">{copy}</p>
    </div>
  );
}
