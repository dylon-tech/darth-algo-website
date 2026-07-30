"use client";

import Image from "next/image";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  Check,
  ChevronRight,
  CircleCheck,
  CloudLightning,
  Code2,
  Crown,
  Gauge,
  Layers3,
  LineChart,
  LockKeyhole,
  Maximize2,
  Menu,
  Radio,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import NewsletterSignup from "./newsletter-signup";
import SiteFooter from "./components/site-footer";
import TradingViewUsernameHelp from "./components/tradingview-username-help";

const navLinks = [
  { label: "The System", href: "#system" },
  { label: "Results", href: "#performance" },
  { label: "Products", href: "#examples" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const journeySections = [
  { label: "Home", href: "#top", id: "top" },
  { label: "System", href: "#system", id: "system" },
  { label: "Products", href: "#examples", id: "examples" },
  { label: "Results", href: "#performance", id: "performance" },
  { label: "Access", href: "#pricing", id: "pricing" },
] as const;

const systemModules = [
  {
    icon: TrendingUp,
    number: "01",
    title: "Signal Engine",
    copy: "Trend-following buy and sell signals built to make market direction easier to act on.",
  },
  {
    icon: CloudLightning,
    number: "02",
    title: "Trend Intelligence",
    copy: "A responsive cloud and market-bias dashboard confirm the environment behind each setup.",
  },
  {
    icon: Target,
    number: "03",
    title: "Trade Planning",
    copy: "Entry, stop-loss, TP1, and TP2 zones map the trade before risk enters the equation.",
  },
  {
    icon: BellRing,
    number: "04",
    title: "Real-Time Alerts",
    copy: "TradingView alerts keep the system working even when you are away from the chart.",
  },
];

const indicatorProducts = [
  {
    id: "scalper",
    icon: Zap,
    category: "Intraday engine",
    name: "Darth Algo Buy/Sell Scalper Tool",
    price: "$18.99",
    copy: "Fast, focused signal logic for traders working short-term market moves and active sessions.",
    features: ["Short-term signal focus", "Real-time alerts", "Structured trade levels"],
    href: "/products/scalper",
  },
  {
    id: "swing",
    icon: TrendingUp,
    category: "Swing engine",
    name: "Darth Algo Buy/Sell Swing Tool",
    price: "$14.99",
    copy: "A broader trend-following view built for traders holding through larger directional moves.",
    features: ["Swing-focused signals", "Trend confirmation", "Real-time alerts"],
    href: "/products/swing",
  },
  {
    id: "pro",
    icon: Layers3,
    category: "Complete bundle",
    name: "Darth Algo Buy and Sell Pro Tool",
    price: "$29",
    copy: "The Scalper and Swing tools combined into one complete monthly trading system.",
    features: ["Scalper Tool included", "Swing Tool included", "One complete workflow"],
    featured: true,
    href: "/products/pro",
  },
];

const indicatorWalkthroughs = {
  scalper: {
    label: "Scalper Tool",
    mode: "Intraday engine",
    name: "Darth Algo Buy/Sell Scalper Tool",
    price: "$18.99 / month",
    copy: "A fast decision layer for active sessions, with directional signals, trend context, and a complete trade plan mapped directly on the chart.",
    overview: "/indicators/scalper-overview.png",
    overviewAlt: "Darth Algo Scalper Tool showing a short trade setup on Micro Silver Futures",
    dashboard: "/indicators/scalper-dashboard.png",
    dashboardAlt: "Scalper dashboard showing downtrend guidance and risk reward",
    bullets: ["Short-term buy and sell signals", "Live market guidance", "Entry, stop, Target 1 and Target 2"],
    profile: [
      { label: "Reaction speed", level: 5 },
      { label: "Signal frequency", level: 5 },
      { label: "Trend horizon", level: 2 },
      { label: "Trade structure", level: 4 },
      { label: "Alert ready", level: 5 },
    ],
    hotspots: [
      { label: "Live market bias", top: "13%", left: "82%" },
      { label: "Signal trigger", top: "39%", left: "61%" },
      { label: "Risk map", top: "57%", left: "70%" },
    ],
    features: [
      {
        tag: "Risk mapping",
        title: "Plan the trade before the move.",
        copy: "Entry, stop, and two profit targets are projected together, keeping reward and invalidation visible at a glance.",
        image: "/indicators/scalper-risk-plan.png",
        alt: "Scalper short trade plan with entry, stop and two targets",
      },
      {
        tag: "Signal context",
        title: "Follow momentum without losing structure.",
        copy: "Buy and sell markers work with the responsive trend cloud to show when direction changes across an active session.",
        image: "/indicators/signal-context-alt.png",
        alt: "Scalper signals and trend cloud across changing market conditions",
      },
      {
        tag: "Execution view",
        title: "See the setup play out on chart.",
        copy: "The active position view keeps the planned entry, downside targets, and market follow-through in the same workspace.",
        image: "/indicators/scalper-execution.png",
        alt: "Scalper short setup progressing through its profit targets",
      },
    ],
  },
  swing: {
    label: "Swing Tool",
    mode: "Swing engine",
    name: "Darth Algo Buy/Sell Swing Tool",
    price: "$14.99 / month",
    copy: "A broader trend-following view for larger directional moves, combining market bias, structured levels, and trade-status feedback.",
    overview: "/indicators/swing-overview.png",
    overviewAlt: "Darth Algo Swing Tool showing an active long trade on Micro Gold Futures",
    dashboard: "/indicators/swing-dashboard.png",
    dashboardAlt: "Swing dashboard showing uptrend guidance and target status",
    bullets: ["Swing-focused trend signals", "Market bias confirmation", "Trade-plan status and target tracking"],
    profile: [
      { label: "Reaction speed", level: 3 },
      { label: "Signal frequency", level: 3 },
      { label: "Trend horizon", level: 5 },
      { label: "Trade structure", level: 5 },
      { label: "Alert ready", level: 5 },
    ],
    hotspots: [
      { label: "Swing guidance", top: "13%", left: "82%" },
      { label: "Trend shift", top: "51%", left: "59%" },
      { label: "Target tracking", top: "54%", left: "70%" },
    ],
    features: [
      {
        tag: "Trade planning",
        title: "Define the full long setup.",
        copy: "The projected risk box establishes entry, invalidation, Target 1, and Target 2 before the trade develops.",
        image: "/indicators/swing-risk-plan.png",
        alt: "Swing long trade plan with entry, stop and two targets",
      },
      {
        tag: "Trend cloud",
        title: "Read the broader directional shift.",
        copy: "The adaptive cloud changes with market direction, helping traders see bullish and bearish regimes without adding chart clutter.",
        image: "/indicators/swing-trend-cloud.png",
        alt: "Swing trend cloud transitioning between bullish and bearish conditions",
      },
      {
        tag: "Signal engine",
        title: "Keep signals inside market context.",
        copy: "Buy and sell labels pair with the cloud so each signal can be evaluated against the active directional environment.",
        image: "/indicators/signal-context.png",
        alt: "Swing buy and sell signals shown with directional trend context",
      },
    ],
  },
};

const steps = [
  ["01", "Choose access", "Select Scalper, Swing, Pro, or Lifetime access."],
  ["02", "Enter username", "Add your TradingView username at checkout."],
  ["03", "Get invited", "We activate your private script access."],
  ["04", "Add to chart", "Open TradingView and load Darth Algo."],
  ["05", "Trade with structure", "Build your process around clearer signals."],
];

const pricingPlans = [
  {
    id: "scalper",
    icon: Zap,
    name: "Darth Algo Buy/Sell Scalper Tool",
    eyebrow: "Built for active sessions",
    price: "$18.99",
    cadence: "/ month",
    button: "Get Scalper Access",
    featured: false,
    trial: false,
    badge: null,
    includes: [
      "Darth Algo Scalper indicator",
      "Short-term buy and sell signals",
      "Real-time TradingView alerts",
      "Entry, stop-loss and take-profit levels",
      "Risk and trend dashboard",
      "Invite-only TradingView access",
    ],
  },
  {
    id: "swing",
    icon: TrendingUp,
    name: "Darth Algo Buy/Sell Swing Tool",
    eyebrow: "Try it free for 2 days",
    price: "$14.99",
    cadence: "/ month after trial",
    button: "Start 2-Day Free Trial",
    featured: false,
    trial: true,
    badge: "2 days free",
    includes: [
      "2-day free trial",
      "Darth Algo Swing indicator",
      "Swing-focused buy and sell signals",
      "Market trend confirmation",
      "Real-time TradingView alerts",
      "Structured trade levels",
      "Invite-only TradingView access",
    ],
  },
  {
    id: "pro",
    icon: Layers3,
    name: "Darth Algo Buy and Sell Pro Tool",
    eyebrow: "The complete monthly bundle",
    price: "$29",
    cadence: "/ month",
    button: "Get Pro Access",
    featured: false,
    trial: false,
    badge: "Scalper + Swing",
    includes: [
      "Darth Algo Scalper Tool",
      "Darth Algo Swing Tool",
      "Real-time TradingView alerts",
      "Entry, stop-loss, TP1 and TP2 levels",
      "Trend and risk dashboard",
      "Future indicator updates",
      "Invite-only TradingView access",
    ],
  },
  {
    id: "lifetime",
    icon: Crown,
    name: "Darth Algo Lifetime",
    eyebrow: "Own the system",
    price: "$134.99",
    cadence: "one-time",
    button: "Buy Lifetime Access",
    featured: true,
    trial: false,
    badge: "Best value",
    includes: [
      "Lifetime Scalper Tool access",
      "Lifetime Swing Tool access",
      "Lifetime Buy and Sell Pro Tool access",
      "All future updates",
      "Full ownership license",
      "Complete Pine Script source codes",
      "Commercial use rights",
      "No monthly fees ever",
    ],
  },
];

const checkoutLinks = {
  scalper: "https://buy.stripe.com/14AfZi4T5fRidqS2oc6kg03",
  swing: "https://buy.stripe.com/28EcN699l8oQ9aC5Ao6kg02",
  swingTrial: "https://buy.stripe.com/28EcN699l8oQ9aC5Ao6kg02",
  pro: "https://buy.stripe.com/4gM8wQfxJ6gI1IabYM6kg05",
  lifetime: "https://buy.stripe.com/6oUcN62KX0WoeuW1k86kg04",
};

const performanceMetrics = [
  { label: "Total trades", value: "100" },
  { label: "Winning trades", value: "87" },
  { label: "Losing trades", value: "13" },
  { label: "Largest win", value: "+5.2R" },
  { label: "Largest loss", value: "-1R" },
  { label: "Average trade", value: "+1.12R" },
  { label: "Max drawdown", value: "3.8%" },
  { label: "Trades / week", value: "20" },
];

const indicatorExamples = [
  {
    title: "Clean Market Structure",
    tag: "Pro view",
    copy: "A distraction-free price view for reading directional structure before signals and trade planning are layered in.",
    image: "/indicators/clean-price-action.png",
    height: 767,
  },
  {
    title: "Complete System View",
    tag: "Full feature map",
    copy: "Signals, live trend dashboard, entry, stop, and take-profit zones working together.",
    image: "/indicator-examples/darth-algo-feature-map-01.png",
    height: 767,
  },
  {
    title: "Precision Risk Mapping",
    tag: "Risk engine",
    copy: "A structured entry with defined invalidation and two measured profit targets.",
    image: "/indicator-examples/darth-algo-feature-map-03.png",
    height: 767,
  },
];

const faqs = [
  {
    question: "How do I receive access?",
    answer: "Enter your TradingView username during Stripe checkout. After purchase, access is manually granted through TradingView's invite-only script system.",
  },
  {
    question: "Which markets does Darth Algo support?",
    answer: "Darth Algo is built with futures traders in mind, but it can be applied to futures, stocks, forex, crypto, and other TradingView-supported markets.",
  },
  {
    question: "Do I need TradingView Premium?",
    answer: "No. You need a TradingView account that supports invite-only scripts and the alert usage required by your workflow.",
  },
  {
    question: "How does the 2-day Swing trial work?",
    answer: "The trial begins when you complete the Swing Tool checkout. Unless you cancel before the trial ends, the subscription continues at $14.99 per month. You can cancel the subscription at any time.",
  },
  {
    question: "Is the source code included?",
    answer: "Complete Pine Script source codes for the Scalper, Swing, and combined Pro tools are included with the Darth Algo Lifetime plan only.",
  },
  {
    question: "What happens after I purchase?",
    answer: "Your payment and TradingView username are received through Stripe. Once the order is verified, invite-only access is manually activated and you receive confirmation.",
  },
];

const tickerTape = [
  ["ES", "6,447.25", "+0.38%"],
  ["NQ", "23,518.50", "+0.62%"],
  ["YM", "45,122", "+0.21%"],
  ["RTY", "2,314.8", "-0.14%"],
  ["GC", "4,566.0", "+0.06%"],
  ["CL", "66.21", "+0.44%"],
];

const animatedCandles = [
  [55, 520, 486, 462, 548], [112, 482, 505, 468, 532], [169, 502, 456, 438, 521],
  [226, 452, 418, 394, 474], [283, 416, 438, 397, 458], [340, 436, 386, 365, 452],
  [397, 382, 350, 326, 410], [454, 348, 372, 329, 396], [511, 370, 318, 296, 390],
  [568, 316, 286, 262, 342], [625, 284, 306, 267, 330], [682, 304, 258, 238, 323],
  [739, 256, 222, 198, 280], [796, 220, 248, 204, 268], [853, 246, 194, 172, 261],
  [910, 192, 166, 144, 218], [967, 164, 188, 147, 210], [1024, 186, 142, 120, 202],
  [1081, 140, 112, 90, 168], [1138, 110, 136, 94, 158], [1195, 134, 92, 70, 150],
  [1252, 90, 64, 42, 118], [1309, 62, 84, 48, 102], [1366, 82, 48, 28, 98],
] as const;

const landingIntroKey = "darth-algo-intro-seen";

function AnimatedCandles({ ambient = false }: { ambient?: boolean }) {
  return (
    <svg className={ambient ? "ambient-market-chart" : "landing-market-chart"} viewBox="0 0 1440 620" preserveAspectRatio="none">
      <defs>
        <linearGradient id={ambient ? "ambientArea" : "introArea"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff2424" stopOpacity={ambient ? "0.12" : "0.28"} />
          <stop offset="100%" stopColor="#ff2424" stopOpacity="0" />
        </linearGradient>
        <filter id={ambient ? "ambientGlow" : "introGlow"} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={ambient ? "3" : "5"} result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path className="market-area" d="M0 555 C130 510 205 540 300 444 S470 456 555 352 S720 370 810 268 S980 286 1070 184 S1240 180 1440 60 L1440 620 L0 620 Z" fill={`url(#${ambient ? "ambientArea" : "introArea"})`} />
      <path className="market-equity-line" d="M0 555 C130 510 205 540 300 444 S470 456 555 352 S720 370 810 268 S980 286 1070 184 S1240 180 1440 60" fill="none" stroke="#ff2424" strokeWidth={ambient ? "2" : "3"} filter={`url(#${ambient ? "ambientGlow" : "introGlow"})`} />
      <g className="market-candle-field">
        {animatedCandles.map(([x, open, close, high, low], index) => {
          const rising = close < open;
          const color = rising ? "#34d399" : "#ff364d";
          const bodyY = Math.min(open, close);
          const bodyHeight = Math.max(Math.abs(open - close), 5);
          return (
            <g key={x} className="market-candle" style={{ animationDelay: `${index * 48}ms` }}>
              <line x1={x} x2={x} y1={high} y2={low} stroke={color} strokeWidth="2" />
              <rect x={x - 9} y={bodyY} width="18" height={bodyHeight} fill={color} fillOpacity={ambient ? "0.24" : "0.72"} stroke={color} strokeWidth="1" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 leading-none">
      <span className={`${small ? "h-10 w-10" : "h-12 w-12"} brand-crest relative grid shrink-0 place-items-center`} aria-hidden="true">
        <span className="brand-crest-orbit absolute inset-0" />
        <span className="brand-crest-orbit brand-crest-orbit-inner absolute" />
        <span className="brand-crest-core absolute grid place-items-center">
          <Shield className={`${small ? "h-6 w-6" : "h-7 w-7"} brand-crest-shield text-ember`} strokeWidth={1.75} />
          <TrendingUp className={`${small ? "h-3 w-3" : "h-3.5 w-3.5"} brand-crest-signal absolute text-white`} strokeWidth={2.6} />
          <span className="brand-crest-bars absolute"><i /><i /><i /></span>
        </span>
        <span className="brand-crest-beam absolute" />
      </span>
      <span className="brand-wordmark font-display text-xl font-black uppercase tracking-[0.08em] sm:text-2xl">
        <span className="brand-wordmark-darth text-ember">Darth</span> <span className="text-white">Algo</span>
      </span>
    </span>
  );
}

function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "trial";
}) {
  return (
    <a
      href={href}
      className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 text-sm font-extrabold transition duration-300 ${
        variant === "primary"
          ? "bg-ember text-white shadow-glow hover:bg-red-500 hover:shadow-glow-lg"
          : variant === "trial"
            ? "bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.18)] hover:bg-emerald-300 hover:shadow-[0_0_34px_rgba(110,231,183,0.28)]"
            : "border border-white/15 bg-black/45 text-white backdrop-blur hover:border-ember/70 hover:bg-ember/10"
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </a>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="inline-flex items-center gap-2 font-display text-xs font-black uppercase text-ember">
        <span className="h-px w-6 bg-ember" />
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance font-display text-4xl font-black leading-[1.02] text-white sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-zinc-400 sm:text-lg">{copy}</p>
    </div>
  );
}

function MarketBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid bg-[size:52px_52px] opacity-[0.11]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,4,0.3),#030304_66%)]" />
      <AnimatedCandles ambient />
      <div className="ambient-market-scan absolute inset-x-0 h-px" />
      <div className="ambient-quote ambient-quote-a absolute right-[5%] top-[24%]"><span>NQ</span><strong>+0.62%</strong></div>
      <div className="ambient-quote ambient-quote-b absolute bottom-[22%] left-[4%]"><span>ES</span><strong>6,447.25</strong></div>
      <div className="ambient-quote ambient-quote-c absolute right-[12%] top-[62%]"><span>GC</span><strong>+0.06%</strong></div>
    </div>
  );
}

export default function Home() {
  const [landingIntro, setLandingIntro] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndicator, setActiveIndicator] = useState<keyof typeof indicatorWalkthroughs>("scalper");
  const [activeZone, setActiveZone] = useState("top");
  const [expandedImage, setExpandedImage] = useState<null | { src: string; alt: string; title: string }>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const walkthrough = indicatorWalkthroughs[activeIndicator];

  const dismissLandingIntro = () => {
    window.sessionStorage.setItem(landingIntroKey, "true");
    setLandingIntro(false);
  };

  useEffect(() => {
    if (window.sessionStorage.getItem(landingIntroKey)) {
      setLandingIntro(false);
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      window.sessionStorage.setItem(landingIntroKey, "true");
      setLandingIntro(false);
      return;
    }

    const introDuration = window.matchMedia("(max-width: 767px)").matches ? 1050 : 2400;
    const introTimer = window.setTimeout(() => {
      window.sessionStorage.setItem(landingIntroKey, "true");
      setLandingIntro(false);
    }, introDuration);
    return () => window.clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  useEffect(() => {
    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>("main > section, .chart-card, .pricing-card, .stat-panel"),
    );
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );

    revealTargets.forEach((target, index) => {
      target.dataset.reveal = "true";
      target.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
      revealObserver.observe(target);
    });

    const zoneObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveZone(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.2, 0.5] },
    );

    journeySections.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) zoneObserver.observe(section);
    });

    return () => {
      revealObserver.disconnect();
      zoneObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!expandedImage) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedImage(null);
      if (event.key === "Tab" && lightboxRef.current) {
        const controls = Array.from(lightboxRef.current.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])"));
        if (controls.length === 0) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => lightboxCloseRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
      restoreFocusRef.current?.focus();
    };
  }, [expandedImage]);

  const selectIndicator = (key: keyof typeof indicatorWalkthroughs) => {
    if (key === activeIndicator) return;
    setActiveIndicator(key);
  };

  return (
    <main id="main-content" className="app-shell relative isolate min-h-screen bg-obsidian text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Darth Algo", applicationCategory: "FinanceApplication", operatingSystem: "TradingView", description: "Invite-only TradingView indicators with buy and sell signals, trend confirmation, alerts, and structured risk levels.", offers: [{ "@type": "Offer", price: "14.99", priceCurrency: "USD" }, { "@type": "Offer", price: "18.99", priceCurrency: "USD" }, { "@type": "Offer", price: "29.00", priceCurrency: "USD" }, { "@type": "Offer", price: "134.99", priceCurrency: "USD" }] }) }} />
      {landingIntro && (
        <div className="landing-intro fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-black">
          <div aria-hidden="true" className="landing-intro-grid absolute inset-0" />
          <div aria-hidden="true" className="landing-market-scene absolute inset-0">
            <AnimatedCandles />
            <div className="landing-market-header absolute inset-x-5 top-5 flex items-center justify-between font-mono text-[9px] font-bold uppercase text-zinc-600 sm:inset-x-8 sm:top-7">
              <span>DA Terminal // Futures Intelligence</span>
              <span className="text-emerald-400">Market feed connected</span>
            </div>
            <div className="landing-market-quotes absolute inset-x-5 bottom-6 flex items-center justify-between font-mono text-[9px] font-bold uppercase sm:inset-x-8">
              <span><b>ES</b> 6,447.25 <i>+0.38%</i></span>
              <span className="hidden sm:inline"><b>NQ</b> 23,518.50 <i>+0.62%</i></span>
              <span><b>GC</b> 4,566.0 <i>+0.06%</i></span>
            </div>
            <div className="landing-price-marker absolute right-0 top-[31%] flex items-center"><span className="h-px w-16 bg-emerald-400/70 sm:w-28" /><strong>4,566.0</strong></div>
          </div>
          <div aria-hidden="true" className="landing-intro-scan absolute inset-y-0 w-px" />
          <div aria-hidden="true" className="landing-intro-mark relative text-center">
            <div className="mb-5 flex items-center justify-center gap-3 font-mono text-[9px] font-black uppercase text-zinc-600">
              <span className="h-px w-10 bg-ember" />
              Initializing market intelligence
              <span className="h-px w-10 bg-ember" />
            </div>
            <p className="font-display text-5xl font-black uppercase leading-none sm:text-7xl">
              <span className="text-ember text-glow">Darth</span> <span className="text-white">Algo</span>
            </p>
            <div className="landing-intro-loader mx-auto mt-7 h-[2px] w-56 overflow-hidden bg-white/10"><span /></div>
          </div>
          <button type="button" onClick={dismissLandingIntro} className="landing-intro-skip absolute right-5 top-16 z-10 inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-black/55 px-3 font-mono text-[9px] font-bold uppercase text-zinc-500 backdrop-blur transition hover:border-ember/50 hover:text-white sm:right-8 sm:top-20" aria-label="Skip website introduction">
            Skip intro <X className="h-3.5 w-3.5" />
          </button>
          <div aria-hidden="true" className="landing-intro-shutter landing-intro-shutter-top absolute inset-x-0 top-0 h-1/2 bg-[#030304]" />
          <div aria-hidden="true" className="landing-intro-shutter landing-intro-shutter-bottom absolute inset-x-0 bottom-0 h-1/2 bg-[#030304]" />
        </div>
      )}
      <MarketBackdrop />

      <header className="site-header sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-xl">
        <span aria-hidden="true" className="scroll-progress" />
        <nav className="section-shell flex h-[72px] items-center justify-between">
          <a href="#top" aria-label="Darth Algo home"><Brand small /></a>
          <div className="hidden items-center gap-7 xl:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-semibold text-zinc-400 transition hover:text-white">{link.label}</a>
            ))}
          </div>
          <div className="hidden items-center gap-2 xl:flex">
            <a href="#swing-trial" className="inline-flex min-h-11 items-center justify-center rounded-md border border-emerald-400/30 bg-emerald-400/[0.08] px-4 text-xs font-extrabold text-emerald-300 transition hover:border-emerald-300 hover:bg-emerald-300 hover:text-black">Try Free</a>
            <a href="#pricing" className="inline-flex min-h-11 items-center justify-center rounded-md bg-ember px-4 text-xs font-extrabold text-white shadow-glow transition hover:bg-red-500">Get Darth Algo Indicators</a>
          </div>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            aria-controls="home-mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/[0.04] xl:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {mobileOpen && (
          <div id="home-mobile-navigation" className="border-t border-white/10 bg-secondary px-5 py-4 xl:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5">{link.label}</a>
              ))}
              <a href="#swing-trial" onClick={() => setMobileOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-5 text-sm font-extrabold text-black">Start 2-Day Free Trial</a>
              <a href="#pricing" onClick={() => setMobileOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-md bg-ember px-5 text-sm font-extrabold text-white shadow-glow">View All Plans</a>
            </div>
          </div>
        )}
      </header>

      <nav className="journey-rail fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 xl:flex" aria-label="Page progress">
        {journeySections.map((section, index) => (
          <a
            key={section.id}
            href={section.href}
            className={activeZone === section.id ? "is-active" : ""}
            aria-label={`Go to ${section.label}`}
          >
            <span className="journey-label">{section.label}</span>
            <span className="journey-bar" />
            <span className="journey-index">0{index + 1}</span>
          </a>
        ))}
      </nav>

      <section id="top" className="relative z-10 border-b border-white/10">
        <Image
          src="/hero/darth-algo-before-after.jpg"
          alt="Darth Algo before and after trading chart comparison"
          fill
          priority
          className="object-cover object-center opacity-55 lg:object-[76%_50%] lg:opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 hero-shade" />
        <div className="absolute inset-0 bg-grid bg-[size:44px_44px] opacity-[0.09]" />
        <div aria-hidden="true" className="hero-orbit">
          <span className="hero-orbit-core" />
        </div>
        <div aria-hidden="true" className="hero-scanline" />
        <div aria-hidden="true" className="hero-readout hero-readout-top hidden xl:block">
          <span>Market state</span>
          <strong><i /> Trend active</strong>
        </div>
        <div aria-hidden="true" className="hero-readout hero-readout-bottom hidden xl:block">
          <span>Risk engine</span>
          <strong>Entry / SL / TP</strong>
        </div>

        <div className="section-shell relative flex min-h-[calc(100svh-264px)] flex-col justify-center py-12 lg:min-h-[calc(100svh-168px)]">
          <div className="max-w-3xl">
            <div className="hero-enter inline-flex items-center gap-2 rounded-md border border-ember/35 bg-black/55 px-3 py-2 text-xs font-extrabold uppercase text-red-100 backdrop-blur">
              <Radio className="h-3.5 w-3.5 text-ember" />
              Invite-only on TradingView
            </div>
            <h1 aria-label="Darth Algo" className="hero-wordmark hero-enter hero-delay-1 mt-7 text-balance font-display text-6xl font-extrabold uppercase leading-[0.88] sm:text-7xl lg:text-[7.4rem]">
              <span className="block text-ember text-glow">Darth</span>
              <span className="block text-white">Algo</span>
            </h1>
            <p className="hero-enter hero-delay-2 mt-7 max-w-2xl font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
              Built for <span className="text-ember">Precision.</span>{" "}
              <span className="font-normal italic text-zinc-200">Designed for Traders.</span>
            </p>
            <p className="hero-enter hero-delay-2 mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              Real-time buy and sell signals, trend confirmation, and a complete risk plan in one professional futures-trading system.
            </p>
            <div className="ai-powered-badge hero-enter hero-delay-3 mt-6 inline-flex items-center gap-3 border border-white/10 bg-black/65 px-3 py-2.5 backdrop-blur-xl" aria-label="Developed with ChatGPT through continuous AI-assisted product updates">
              <span className="ai-powered-mark grid h-9 w-9 shrink-0 place-items-center border border-white/15 bg-white/[0.05]">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <span className="text-left leading-tight">
                <span className="block font-mono text-[9px] font-bold uppercase text-zinc-500">Developed with</span>
                <strong className="mt-0.5 block font-display text-sm font-black text-white">ChatGPT <span className="text-ember">AI</span></strong>
              </span>
              <span className="hidden h-8 w-px bg-white/10 sm:block" />
              <span className="hidden items-center gap-2 font-mono text-[9px] font-bold uppercase text-zinc-500 sm:inline-flex">
                <i className="ai-update-dot" />
                Continuous AI-assisted development
              </span>
            </div>
            <div className="hero-enter hero-delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#swing-trial" variant="trial">Try Swing Free</ButtonLink>
              <ButtonLink href="#pricing">Get Darth Algo Indicators</ButtonLink>
              <ButtonLink href="#examples" variant="secondary">See It On Chart</ButtonLink>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-black/70 backdrop-blur-md">
          <div className="section-shell grid grid-cols-2 divide-x divide-white/10 sm:grid-cols-4">
            {[
              [ScanLine, "Real-time", "Signal detection"],
              [ShieldCheck, "Defined", "Risk structure"],
              [BarChart3, "Multi-market", "TradingView ready"],
              [LockKeyhole, "Private", "Invite-only access"],
            ].map(([Icon, value, label]) => {
              const IconComponent = Icon as typeof Activity;
              return (
                <div key={String(label)} className="flex min-h-24 items-center gap-3 px-4 py-5 sm:px-6">
                  <IconComponent className="h-5 w-5 shrink-0 text-ember" />
                  <div>
                    <p className="font-display text-lg font-black text-white">{String(value)}</p>
                    <p className="text-xs text-zinc-500">{String(label)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div aria-label="Illustrative market interface" className="relative z-10 overflow-hidden border-b border-white/10 bg-secondary py-3">
        <div className="market-tape">
          <div className="market-tape-track flex w-max gap-10 whitespace-nowrap px-5 text-xs">
            {[...tickerTape, ...tickerTape, ...tickerTape].map(([symbol, price, move], index) => (
              <span key={`${symbol}-${index}`} className="inline-flex items-center gap-3">
                <span className="font-black text-zinc-200">{symbol}</span>
                <span className="font-mono text-zinc-500">{price}</span>
                <span className={move.startsWith("+") ? "text-emerald-400" : "text-ember"}>{move}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <section id="system" className="immersive-section relative z-10 py-24 sm:py-32">
        <div className="section-shell">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <SectionHeading
              eyebrow="The Darth Algo System"
              title="One chart. Every decision layer."
              copy="Built to replace indicator clutter with a focused workflow: identify the trend, validate the setup, define the risk, and execute with structure."
            />
            <div className="grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-2">
              {["Buy + sell signals", "Trend cloud", "Entry / SL / TP levels", "Live dashboard"].map((item) => (
                <div key={item} className="flex items-center gap-3 bg-black/80 px-5 py-4 text-sm font-semibold text-zinc-300">
                  <CircleCheck className="h-4 w-4 shrink-0 text-ember" />{item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 grid overflow-hidden rounded-md border border-white/10 bg-[#080809] lg:grid-cols-[1.32fr_0.68fr]">
            <div className="relative min-h-[320px] border-b border-white/10 lg:min-h-[640px] lg:border-b-0 lg:border-r">
              <Image
                src="/indicator-examples/darth-algo-feature-map-01.png"
                alt="Darth Algo live indicator system on Micro Gold Futures"
                fill
                className="object-cover object-left"
                sizes="(min-width: 1024px) 66vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-ember">Live chart environment</p>
                  <p className="mt-2 font-display text-2xl font-black text-white sm:text-3xl">Built into your TradingView workflow.</p>
                </div>
                <span className="hidden rounded-md border border-white/15 bg-black/70 px-3 py-2 text-xs font-bold text-zinc-300 backdrop-blur sm:block">MGC / 30M</span>
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {systemModules.map((module) => (
                <article key={module.number} className="group relative min-h-40 p-6 transition hover:bg-ember/[0.05] lg:min-h-40">
                  <div className="flex items-start justify-between gap-6">
                    <module.icon className="h-6 w-6 text-ember" />
                    <span className="font-mono text-xs text-zinc-600">{module.number}</span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-black text-white">{module.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{module.copy}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-16 border-t border-white/10 pt-12">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase text-ember">Choose your trading style</p>
                <h3 className="mt-3 font-display text-4xl font-black leading-tight text-white sm:text-5xl">Three tools. One Darth Algo system.</h3>
              </div>
              <p className="max-w-lg text-sm leading-7 text-zinc-500">Trade the short-term engine, follow broader moves, or combine both approaches with the complete Pro Tool.</p>
            </div>

            <div className="mt-9 grid gap-4 lg:grid-cols-3">
              {indicatorProducts.map((product) => {
                const accent = product.id === "scalper" ? "text-scalp" : product.id === "swing" ? "text-swing" : "text-pro";
                const border = product.id === "scalper" ? "border-scalp/45" : product.id === "swing" ? "border-swing/45" : "border-pro/45";
                const background = product.id === "scalper" ? "bg-scalp/[0.055]" : product.id === "swing" ? "bg-swing/[0.055]" : "bg-pro/[0.07]";
                return (
                  <article key={product.id} className={`pricing-card relative overflow-hidden rounded-md border p-6 ${border} ${background}`}>
                    {product.featured && <span className="absolute right-5 top-5 rounded-md bg-pro px-3 py-1.5 text-[10px] font-black uppercase text-white">Complete bundle</span>}
                    <div className={`grid h-11 w-11 place-items-center rounded-md border bg-card ${border}`}><product.icon className={`h-5 w-5 ${accent}`} /></div>
                    <p className={`mt-7 text-xs font-black uppercase ${accent}`}>{product.category}</p>
                    <h4 className="mt-2 min-h-[4.5rem] font-display text-2xl font-black leading-tight text-white">{product.name}</h4>
                    <p className="mt-4 text-sm leading-6 text-zinc-500">{product.copy}</p>
                    <div className="mt-6 flex items-end gap-2"><span className="font-display text-4xl font-black text-white">{product.price}</span><span className="mb-1 text-xs font-bold text-zinc-600">/ month</span></div>
                    <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                      {product.features.map((feature) => <li key={feature} className="flex items-center gap-2 text-xs font-semibold text-zinc-400"><Check className={`h-3.5 w-3.5 shrink-0 ${accent}`} />{feature}</li>)}
                    </ul>
                    <div className="mt-7 flex items-center gap-5"><a href={product.href} className={`inline-flex items-center gap-2 text-sm font-extrabold transition hover:text-white ${accent}`}>Explore tool <ArrowRight className="h-4 w-4" /></a><a href="#pricing" className="text-xs font-bold text-zinc-500 hover:text-white">View plan</a></div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="examples" className="immersive-section immersive-section-reverse relative z-10 border-y border-white/10 bg-[#080809] py-24 sm:py-32">
        <div className="section-shell">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Inside The Indicators"
              title="Built to be read in seconds."
              copy="Explore the actual Scalper and Swing interfaces, from live market guidance to structured entries, stops, and profit targets."
            />
            <div className="indicator-switch inline-grid grid-cols-2 rounded-md border border-white/10 bg-black/70 p-1" role="group" aria-label="Select an indicator preview">
              {(Object.keys(indicatorWalkthroughs) as Array<keyof typeof indicatorWalkthroughs>).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectIndicator(key)}
                  aria-pressed={activeIndicator === key}
                  className={`min-h-11 rounded px-5 text-sm font-black transition ${activeIndicator === key ? "bg-ember text-white shadow-glow" : "text-zinc-500 hover:text-white"}`}
                >
                  {indicatorWalkthroughs[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="indicator-console mt-12 overflow-hidden rounded-md border border-white/10 bg-black/60 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                <span className="font-mono text-[10px] font-bold uppercase text-zinc-500">Live TradingView environment</span>
              </div>
              <span className="rounded border border-white/10 bg-black px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-zinc-500">{walkthrough.mode}</span>
            </div>

            <div key={activeIndicator} className="indicator-scene grid lg:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.45fr)]">
              <div className="chart-viewport relative aspect-[2.28/1] min-h-[260px] overflow-hidden border-b border-white/10 bg-[#111827] lg:min-h-[570px] lg:border-b-0 lg:border-r">
                <Image
                  key={walkthrough.overview}
                  src={walkthrough.overview}
                  alt={walkthrough.overviewAlt}
                  fill
                  className="object-contain"
                  sizes="(min-width: 1024px) 72vw, 100vw"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                {walkthrough.hotspots.map((hotspot, index) => (
                  <div
                    key={hotspot.label}
                    className="chart-hotspot hidden sm:flex"
                    style={{ top: hotspot.top, left: hotspot.left, animationDelay: `${index * 420}ms` }}
                  >
                    <span className="chart-hotspot-dot" />
                    <span className="chart-hotspot-label">{hotspot.label}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExpandedImage({ src: walkthrough.overview, alt: walkthrough.overviewAlt, title: walkthrough.name })}
                  className="absolute bottom-4 right-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/15 bg-black/75 text-white backdrop-blur transition hover:border-ember hover:bg-ember"
                  aria-label={`Expand ${walkthrough.label} chart`}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>

              <aside className="flex flex-col p-5 sm:p-7">
                <p className="text-xs font-black uppercase text-ember">{walkthrough.mode}</p>
                <h3 className="mt-3 font-display text-3xl font-black leading-tight text-white">{walkthrough.name}</h3>
                <p className="mt-4 text-sm leading-7 text-zinc-400">{walkthrough.copy}</p>

                <div className="mt-7 overflow-hidden rounded-md border border-white/10 bg-[#11141a]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="font-mono text-[10px] font-bold uppercase text-zinc-600">Market intelligence panel</p>
                  </div>
                  <div className="relative mx-auto aspect-[1.35/1] min-h-32 w-full max-w-sm">
                    <Image
                      key={walkthrough.dashboard}
                      src={walkthrough.dashboard}
                      alt={walkthrough.dashboardAlt}
                      fill
                      className="object-contain p-4"
                      sizes="320px"
                    />
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <p className="font-mono text-[10px] font-bold uppercase text-zinc-600">Trading profile</p>
                    <span className="font-mono text-[9px] font-bold uppercase text-ember">5-point scan</span>
                  </div>
                  <div className="space-y-3">
                    {walkthrough.profile.map((item) => (
                      <div key={item.label} className="grid grid-cols-[7.25rem_1fr] items-center gap-3">
                        <span className="text-[11px] font-semibold text-zinc-500">{item.label}</span>
                        <span className="grid grid-cols-5 gap-1" aria-label={`${item.label}: ${item.level} of 5`}>
                          {[1, 2, 3, 4, 5].map((bar) => (
                            <i key={bar} className={`profile-bar ${bar <= item.level ? "is-filled" : ""}`} />
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <ul className="mt-7 space-y-3">
                  {walkthrough.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm text-zinc-300">
                      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {bullet}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-zinc-600">Access from</p>
                      <p className="mt-1 font-display text-2xl font-black text-white">{walkthrough.price}</p>
                    </div>
                    <a href="#pricing" className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-ember text-white shadow-glow transition hover:bg-red-500" aria-label={`View ${walkthrough.label} pricing`}>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div key={`${activeIndicator}-features`} className="indicator-feature-grid mt-5 grid gap-5 lg:grid-cols-3">
            {walkthrough.features.map((feature, index) => (
              <article key={`${activeIndicator}-${feature.title}`} className="chart-card group overflow-hidden rounded-md border border-white/10 bg-black/55">
                <div className="relative aspect-[1.8/1] overflow-hidden bg-[#111827]">
                  <Image
                    src={feature.image}
                    alt={feature.alt}
                    fill
                    className="object-contain transition duration-700 group-hover:scale-[1.025]"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 rounded border border-white/10 bg-black/75 px-2.5 py-1 text-[10px] font-black uppercase text-ember backdrop-blur">0{index + 1} / {feature.tag}</span>
                  <button
                    type="button"
                    onClick={() => setExpandedImage({ src: feature.image, alt: feature.alt, title: feature.title })}
                    className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/75 text-white opacity-100 backdrop-blur transition hover:border-ember hover:bg-ember lg:opacity-0 lg:group-hover:opacity-100"
                    aria-label={`Expand ${feature.title}`}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="font-display text-2xl font-black leading-tight text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">{feature.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="performance" className="immersive-section immersive-section-reverse relative z-10 border-y border-white/10 bg-[#080809] py-24 sm:py-32">
        <div className="section-shell">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <SectionHeading
              eyebrow="Performance Snapshot"
              title="The numbers, without the noise."
              copy="A 100-trade sample presented as a transparent, at-a-glance review of outcome quality and risk control."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["87%", "Win rate", "87 of 100 trades"],
                ["1:2.3", "Avg. risk / reward", "Positive reward profile"],
                ["3.4", "Profit factor", "Gross profit / loss"],
              ].map(([value, label, detail], index) => (
                <article key={label} className={`stat-panel relative overflow-hidden rounded-md border p-5 ${index === 0 ? "border-ember/60 bg-ember/[0.09]" : "border-white/10 bg-black/45"}`}>
                  <div className="absolute inset-x-0 top-0 h-px red-line" />
                  <p className="font-display text-5xl font-black text-white">{value}</p>
                  <p className="mt-3 text-sm font-extrabold text-zinc-200">{label}</p>
                  <p className="mt-1 text-xs text-zinc-600">{detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-md border border-white/10 bg-black/50 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="font-display text-2xl font-black text-white">Performance matrix</p>
                  <p className="mt-1 text-sm text-zinc-500">100-trade backtest snapshot</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400">
                  <Activity className="h-3.5 w-3.5" /> Sample complete
                </span>
              </div>
              <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
                {performanceMetrics.map((metric) => (
                  <div key={metric.label} className="bg-[#09090a] p-4">
                    <p className="text-[11px] font-bold uppercase text-zinc-600">{metric.label}</p>
                    <p className="mt-2 font-display text-3xl font-black text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-md border border-white/10 bg-card p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-black text-white">Outcome profile</p>
                  <p className="mt-1 text-sm text-zinc-500">Wins versus losses</p>
                </div>
                <Gauge className="h-7 w-7 text-ember" />
              </div>
              <div className="mt-9 flex items-center gap-6">
                <div className="stat-ring grid h-36 w-36 shrink-0 place-items-center rounded-full">
                  <div className="grid h-[108px] w-[108px] place-items-center rounded-full bg-[#080809] text-center">
                    <div><p className="font-display text-4xl font-black text-white">87%</p><p className="text-[10px] uppercase text-zinc-500">win rate</p></div>
                  </div>
                </div>
                <div className="w-full space-y-5">
                  <div><div className="mb-2 flex justify-between text-xs"><span className="text-zinc-400">Winning</span><span className="font-bold text-emerald-400">87</span></div><div className="h-1.5 bg-white/10"><div className="h-full w-[87%] bg-emerald-500" /></div></div>
                  <div><div className="mb-2 flex justify-between text-xs"><span className="text-zinc-400">Losing</span><span className="font-bold text-ember">13</span></div><div className="h-1.5 bg-white/10"><div className="h-full w-[13%] bg-ember" /></div></div>
                </div>
              </div>
              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="font-mono text-[9px] font-bold uppercase text-ember">How to read this sample</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {["100 recorded trades", "Results measured in R", "Largest loss: -1R", "No guarantee of future results"].map((item) => <div key={item} className="flex items-center gap-2 text-xs text-zinc-400"><CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{item}</div>)}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-4xl text-xs leading-6 text-zinc-600">Performance figures are a supplied 100-trade analytical sample. Instrument, timeframe, date range, fees, slippage, and independent verification should be reviewed before treating the sample as representative. Past performance does not guarantee future results.</p>
        </div>
      </section>

      <section id="pro-workflow" className="immersive-section relative z-10 py-24 sm:py-32">
        <div className="section-shell">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="The Combined Pro Tool"
              title="Both trading modes. One complete workflow."
              copy="The Pro Tool brings Scalper and Swing logic together with a clean chart foundation, full feature visibility, and structured risk mapping."
            />
            <ButtonLink href="#pricing" variant="secondary">Get Access</ButtonLink>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {indicatorExamples.map((example, index) => (
              <article key={example.title} className={`chart-card group overflow-hidden rounded-md border border-white/10 bg-[#080809] ${index === 0 ? "lg:col-span-2" : ""}`}>
                <div className={`relative overflow-hidden ${index === 0 ? "aspect-[2.1/1]" : "aspect-[1.72/1]"}`}>
                  <Image
                    src={example.image}
                    alt={`${example.title} Darth Algo indicator screenshot`}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.015]"
                    sizes={index === 0 ? "100vw" : "(min-width: 1024px) 50vw, 100vw"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                    <span className="rounded-md border border-ember/30 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase text-ember backdrop-blur">{example.tag}</span>
                    <h3 className="mt-4 font-display text-2xl font-black text-white sm:text-3xl">{example.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">{example.copy}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 border-y border-white/10 bg-[#080809] py-24 sm:py-32">
        <div className="section-shell">
          <SectionHeading centered eyebrow="Fast Activation" title="From checkout to chart." copy="Your TradingView username is collected securely during Stripe checkout, then your invite-only access is activated manually." />
          <div className="mt-14 grid gap-3 lg:grid-cols-5">
            {steps.map(([number, title, copy], index) => (
              <article key={number} className="relative rounded-md border border-white/10 bg-black/45 p-5">
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-ember">{number}</span>{index < steps.length - 1 && <ChevronRight className="hidden h-4 w-4 text-zinc-700 lg:block" />}</div>
                <h3 className="mt-8 font-display text-xl font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 py-24 sm:py-32">
        <div className="section-shell">
          <SectionHeading centered eyebrow="Simple Pricing" title="Choose the tool that fits your trading." copy="Trade with Scalper, Swing, the combined Pro Tool, or own the complete Darth Algo suite for life." />
          <nav aria-label="Jump to a pricing plan" className="mobile-plan-strip -mx-5 mt-8 overflow-x-auto px-5 pb-2 lg:hidden">
            <div className="flex w-max gap-2">
              {[
                ["Scalper", "#scalper-plan", "$18.99"],
                ["Swing Trial", "#swing-trial", "2 days free"],
                ["Pro", "#pro-plan", "$29"],
                ["Lifetime", "#lifetime-plan", "$134.99"],
              ].map(([label, href, price]) => (
                <a key={href} href={href} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm font-extrabold text-white transition active:border-ember active:bg-ember/10">
                  {label}<span className="font-mono text-[9px] font-bold text-ember">{price}</span>
                </a>
              ))}
            </div>
          </nav>
          <div className="mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-2">
            {pricingPlans.map((plan) => {
              const planAnchor = plan.id === "swing" ? "swing-trial" : `${plan.id}-plan`;
              const checkoutHref = plan.id === "swing"
                ? checkoutLinks.swingTrial
                : checkoutLinks[plan.id as "scalper" | "pro" | "lifetime"];
              const isSwing = plan.id === "swing";
              const isPro = plan.id === "pro";
              const cardTheme = plan.featured
                ? "border-ember/70 bg-[linear-gradient(145deg,rgba(220,55,65,0.13),rgba(13,17,23,0.97)_45%)] shadow-glow-lg"
                : isPro
                  ? "border-pro/55 bg-pro/[0.07] shadow-[0_0_60px_rgba(139,92,246,0.1)]"
                  : isSwing
                    ? "border-swing/50 bg-swing/[0.055] shadow-[0_0_55px_rgba(30,125,220,0.08)]"
                    : "border-scalp/45 bg-scalp/[0.045]";
              const accent = plan.featured ? "text-ember" : isPro ? "text-pro" : isSwing ? "text-swing" : "text-scalp";
              return (
                <article id={planAnchor} key={plan.name} className={`pricing-card relative flex h-full flex-col rounded-md border p-6 sm:p-8 ${cardTheme}`}>
                  {plan.badge && <span className={`absolute right-5 top-5 rounded-md px-3 py-1.5 text-[10px] font-black uppercase text-white ${plan.featured ? "bg-ember shadow-glow" : isPro ? "bg-pro" : isSwing ? "bg-swing" : "bg-scalp"}`}>{plan.badge}</span>}
                  <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-black/45"><plan.icon className={`h-5 w-5 ${accent}`} /></div>
                  <p className={`mt-7 text-xs font-black uppercase ${accent}`}>{plan.eyebrow}</p>
                  <h3 className="mt-2 min-h-[4.5rem] font-display text-3xl font-black leading-tight text-white">{plan.name}</h3>
                  <div className="mt-6 flex items-end gap-3"><span className="font-display text-6xl font-black text-white">{plan.price}</span><span className="mb-2 text-sm font-semibold text-zinc-500">{plan.cadence}</span></div>
                  <div className="my-7 h-px bg-white/10" />
                  <ul className="flex-1 space-y-3.5">
                    {plan.includes.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-300"><Check className={`mt-1 h-4 w-4 shrink-0 ${accent}`} />{item}</li>)}
                  </ul>
                  {checkoutHref ? (
                    <a href={checkoutHref} className={`mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-extrabold text-white transition ${plan.featured ? "bg-ember shadow-glow hover:bg-red-500" : isPro ? "bg-pro hover:bg-violet-500" : isSwing ? "bg-swing hover:bg-blue-500" : "bg-scalp hover:bg-orange-400"}`}>{plan.button}<ArrowRight className="h-4 w-4" /></a>
                  ) : (
                    <span aria-disabled="true" className={`mt-8 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-md border px-5 text-sm font-extrabold ${plan.trial ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/60" : "border-white/10 bg-white/[0.025] text-zinc-500"}`}>{plan.trial ? "Trial enrollment opening soon" : "Checkout opening soon"}</span>
                  )}
                  <p className="mt-3 text-center text-xs text-zinc-600">{checkoutHref ? (plan.trial ? "2 days free, then $14.99/month. Cancel anytime." : "Secure checkout powered by Stripe") : (plan.trial ? "Stripe trial checkout is being connected" : "Individual Stripe checkout is being connected")}</p>
                  {checkoutHref && <TradingViewUsernameHelp className="mt-2 w-full" />}
                  {plan.id !== "lifetime" && <a href={`/products/${plan.id}`} className={`mt-4 text-center text-xs font-bold transition hover:text-white ${accent}`}>Explore {isPro ? "the Pro system" : `the ${plan.id} tool`}</a>}
                </article>
              );
            })}
          </div>
          <div className="mx-auto mt-8 grid max-w-6xl gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              [LockKeyhole, "Secure checkout", "Payments processed by Stripe"],
              [Radio, "TradingView delivery", "Username collected at checkout"],
              [CircleCheck, "Flexible access", "Cancel subscriptions anytime"],
            ].map(([Icon, title, copy]) => {
              const TrustIcon = Icon as typeof Activity;
              return (
                <div key={String(title)} className="flex min-h-24 items-center gap-4 bg-[#080809] p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-ember/25 bg-ember/[0.07]"><TrustIcon className="h-4 w-4 text-ember" /></span>
                  <div><p className="font-display text-base font-black text-white">{String(title)}</p><p className="mt-1 text-xs leading-5 text-zinc-600">{String(copy)}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/10 bg-secondary py-24 sm:py-28">
        <div className="section-shell">
          <SectionHeading eyebrow="Evidence Over Hype" title="Judge the tool by what you can inspect." copy="Darth Algo is presented with real chart captures, defined product terms, and clear risk language instead of anonymous claims or guaranteed outcomes." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 lg:grid-cols-3">
            {[
              [Maximize2, "Actual chart captures", "Inspect real interface screenshots showing signals, trend context, dashboards, and risk levels."],
              [ShieldCheck, "Clear product terms", "Know which indicators, updates, licenses, and access rights are included before checkout."],
              [Code2, "Risk-first disclosure", "Trading remains risky. Examples and historical samples are never presented as guaranteed results."],
            ].map(([Icon, title, copy]) => {
              const ProofIcon = Icon as typeof ShieldCheck;
              return <article key={String(title)} className="bg-card p-7 sm:p-8"><ProofIcon className="h-5 w-5 text-ember" /><h3 className="mt-6 font-display text-2xl font-black">{String(title)}</h3><p className="mt-3 text-sm leading-7 text-zinc-500">{String(copy)}</p></article>;
            })}
          </div>
        </div>
      </section>

      <NewsletterSignup />

      <section id="faq" className="relative z-10 py-24 sm:py-32">
        <div className="section-shell grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <SectionHeading eyebrow="FAQ" title="Know exactly what you are getting." copy="Straight answers about TradingView access, market coverage, source code, and the purchase process." />
            <div className="mt-8"><ButtonLink href="#pricing">Choose Access</ButtonLink></div>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-xl font-black text-white">
                  {faq.question}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 text-ember transition group-open:rotate-45 group-open:border-ember/50"><Zap className="h-4 w-4" /></span>
                </summary>
                <p className="max-w-2xl pt-4 text-sm leading-7 text-zinc-500">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-24 sm:pb-32">
        <div className="section-shell">
          <div className="cta-panel relative overflow-hidden rounded-md border border-ember/40 bg-[#09090a] px-6 py-14 text-center shadow-glow sm:px-10 sm:py-20">
            <div className="absolute inset-x-0 top-0 h-px red-line" />
            <LineChart className="mx-auto h-8 w-8 text-ember" />
            <h2 className="mx-auto mt-6 max-w-4xl text-balance font-display text-4xl font-black leading-tight text-white sm:text-6xl">Stop guessing. Start trading with structure.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">Bring signals, trend context, and risk planning into one focused TradingView workflow.</p>
            <div className="mt-8 flex justify-center"><ButtonLink href="#pricing">Get Darth Algo</ButtonLink></div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-black py-8">
        <div className="section-shell flex gap-4">
          <Code2 className="mt-1 h-5 w-5 shrink-0 text-zinc-600" />
          <p className="text-xs leading-6 text-zinc-600">Darth Algo is an educational and analytical tool only. It does not provide financial advice. Trading futures, stocks, forex, and cryptocurrencies involves substantial risk. Past performance does not guarantee future results.</p>
        </div>
      </section>

      {expandedImage && (
        <div
          className="chart-lightbox fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4 backdrop-blur-xl sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${expandedImage.title} chart preview`}
          onClick={() => setExpandedImage(null)}
        >
          <div ref={lightboxRef} className="relative w-full max-w-[1500px] overflow-hidden rounded-md border border-white/15 bg-[#070708] shadow-[0_0_120px_rgba(255,26,26,0.2)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-5 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="font-mono text-[9px] font-bold uppercase text-ember">Chart intelligence // expanded</p>
                <p className="mt-1 truncate font-display text-lg font-black text-white">{expandedImage.title}</p>
              </div>
              <button
                ref={lightboxCloseRef}
                type="button"
                onClick={() => setExpandedImage(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-ember hover:bg-ember hover:text-white"
                aria-label="Close expanded chart"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="chart-lightbox-frame relative h-[min(76vh,900px)] min-h-[280px] w-full">
              <Image src={expandedImage.src} alt={expandedImage.alt} fill className="object-contain p-2 sm:p-5" sizes="100vw" priority />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 font-mono text-[9px] font-bold uppercase text-zinc-600 sm:px-5">
              <span>Use the full chart to inspect signals, context, and trade structure</span>
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-buy-bar fixed inset-x-0 bottom-0 z-[65] border-t border-white/10 bg-black/90 px-3 py-2 backdrop-blur-xl lg:hidden" aria-label="Quick purchase actions">
        <div className="mx-auto flex max-w-md gap-2">
          <a href="#swing-trial" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-extrabold text-black">
            Try Swing Free <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#pricing" className="inline-flex min-h-12 items-center justify-center rounded-md bg-ember px-5 text-sm font-extrabold text-white shadow-glow">
            Plans
          </a>
        </div>
      </nav>

      <SiteFooter />
    </main>
  );
}
