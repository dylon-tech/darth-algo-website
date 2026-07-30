export type ProductSlug = "scalper" | "swing" | "pro";

export type DarthProduct = {
  slug: ProductSlug;
  shortName: string;
  name: string;
  mode: string;
  price: string;
  cadence: string;
  summary: string;
  description: string;
  color: "scalp" | "swing" | "pro";
  overview: string;
  overviewAlt: string;
  dashboard?: string;
  dashboardAlt?: string;
  features: string[];
  idealFor: string[];
  workflow: Array<{ title: string; copy: string }>;
  gallery: Array<{ src: string; alt: string; label: string }>;
};

export const products: Record<ProductSlug, DarthProduct> = {
  scalper: {
    slug: "scalper",
    shortName: "Scalper",
    name: "Darth Algo Buy/Sell Scalper Tool",
    mode: "Intraday engine",
    price: "$18.99",
    cadence: "per month",
    summary: "Fast signal logic for active sessions and short-term market moves.",
    description:
      "A focused decision layer for active traders, combining directional signals, responsive trend context, alerts, and a complete risk plan directly on the chart.",
    color: "scalp",
    overview: "/indicators/scalper-overview.png",
    overviewAlt: "Darth Algo Scalper Tool showing a short setup on Micro Silver Futures",
    dashboard: "/indicators/scalper-dashboard.png",
    dashboardAlt: "Scalper dashboard showing downtrend guidance and risk reward",
    features: [
      "Short-term buy and sell signals",
      "Responsive bullish and bearish trend cloud",
      "Entry, stop, Target 1 and Target 2 planning",
      "Real-time TradingView alerts",
      "Live market guidance dashboard",
      "Invite-only TradingView access",
    ],
    idealFor: ["Active intraday sessions", "Faster chart timeframes", "Traders who value frequent structure updates"],
    workflow: [
      { title: "Read the bias", copy: "Use the cloud and dashboard to identify the active directional environment." },
      { title: "Wait for structure", copy: "Evaluate the buy or sell signal against the current trend instead of reacting to price alone." },
      { title: "Map the trade", copy: "Review entry, invalidation, and both targets before deciding whether the setup fits your plan." },
    ],
    gallery: [
      { src: "/indicators/scalper-risk-plan.png", alt: "Scalper short trade plan with entry, stop and two targets", label: "Risk mapping" },
      { src: "/indicators/signal-context-alt.png", alt: "Scalper signals and trend cloud across changing conditions", label: "Signal context" },
      { src: "/indicators/scalper-execution.png", alt: "Scalper short setup progressing through its profit targets", label: "Execution view" },
    ],
  },
  swing: {
    slug: "swing",
    shortName: "Swing",
    name: "Darth Algo Buy/Sell Swing Tool",
    mode: "Swing engine",
    price: "$14.99",
    cadence: "per month after a 2-day free trial",
    summary: "Broader trend confirmation for larger directional moves.",
    description:
      "A patient trend-following view for traders holding through broader market moves, with structured levels, market-bias confirmation, alerts, and trade-status feedback.",
    color: "swing",
    overview: "/indicators/swing-overview.png",
    overviewAlt: "Darth Algo Swing Tool showing an active long trade on Micro Gold Futures",
    dashboard: "/indicators/swing-dashboard.png",
    dashboardAlt: "Swing dashboard showing uptrend guidance and target status",
    features: [
      "Swing-focused buy and sell signals",
      "Broader market trend confirmation",
      "Entry, stop, Target 1 and Target 2 planning",
      "Real-time TradingView alerts",
      "Trade-plan and target-status dashboard",
      "2-day free trial and invite-only access",
    ],
    idealFor: ["Larger directional moves", "More selective signal frequency", "Traders who prefer broader trend context"],
    workflow: [
      { title: "Confirm the regime", copy: "Start with the broader trend cloud and dashboard guidance." },
      { title: "Evaluate the signal", copy: "Use the buy or sell marker as one part of a complete directional setup." },
      { title: "Track the plan", copy: "Keep entry, invalidation, and target progress visible as the move develops." },
    ],
    gallery: [
      { src: "/indicators/swing-risk-plan.png", alt: "Swing long trade plan with entry, stop and two targets", label: "Trade planning" },
      { src: "/indicators/swing-trend-cloud.png", alt: "Swing trend cloud transitioning between bullish and bearish conditions", label: "Trend cloud" },
      { src: "/indicators/signal-context.png", alt: "Swing buy and sell signals with directional trend context", label: "Signal engine" },
    ],
  },
  pro: {
    slug: "pro",
    shortName: "Pro",
    name: "Darth Algo Buy and Sell Pro Tool",
    mode: "Complete trading system",
    price: "$29",
    cadence: "per month",
    summary: "Scalper and Swing intelligence combined in one complete workflow.",
    description:
      "The full Darth Algo monthly system for traders who want both fast intraday structure and broader swing confirmation without switching between separate subscriptions.",
    color: "pro",
    overview: "/indicator-examples/darth-algo-feature-map-01.png",
    overviewAlt: "Complete Darth Algo Pro indicator system on Micro Gold Futures",
    features: [
      "Darth Algo Scalper Tool",
      "Darth Algo Swing Tool",
      "Real-time TradingView alerts",
      "Entry, stop, TP1 and TP2 levels",
      "Trend and risk dashboard",
      "Continuous AI-assisted product updates",
    ],
    idealFor: ["Traders using multiple time horizons", "One unified monthly subscription", "Complete access without the lifetime license"],
    workflow: [
      { title: "Choose the horizon", copy: "Use Scalper logic for active sessions or Swing logic for broader moves." },
      { title: "Confirm the environment", copy: "Align signals with the trend cloud, dashboard, and your own trading plan." },
      { title: "Execute with defined risk", copy: "Use the projected levels to evaluate risk before entering a position." },
    ],
    gallery: [
      { src: "/indicators/clean-price-action.png", alt: "Clean market structure view", label: "Clean structure" },
      { src: "/indicator-examples/darth-algo-feature-map-03.png", alt: "Darth Algo risk plan with entry stop and profit targets", label: "Risk engine" },
      { src: "/indicator-examples/darth-algo-feature-map-04.png", alt: "Darth Algo trend-following signals and cloud", label: "System view" },
    ],
  },
};

export const productList = Object.values(products);

export function getCheckoutLink(slug: ProductSlug) {
  if (slug === "scalper") {
    return process.env.NEXT_PUBLIC_STRIPE_SCALPER_LINK || "https://buy.stripe.com/14AfZi4T5fRidqS2oc6kg03";
  }
  if (slug === "swing") {
    return process.env.NEXT_PUBLIC_STRIPE_SWING_TRIAL_LINK || process.env.NEXT_PUBLIC_STRIPE_SWING_LINK || "https://buy.stripe.com/28EcN699l8oQ9aC5Ao6kg02";
  }
  return process.env.NEXT_PUBLIC_STRIPE_MONTHLY_LINK || "https://buy.stripe.com/4gM8wQfxJ6gI1IabYM6kg05";
}
