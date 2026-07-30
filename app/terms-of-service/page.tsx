import type { Metadata } from "next";
import LegalPage from "../components/legal-page";

export const metadata: Metadata = { title: "Terms of Service | Darth Algo", description: "Terms governing access to Darth Algo TradingView indicators and digital products.", alternates: { canonical: "/terms-of-service" } };

const sections = [
  { title: "Product Purpose", paragraphs: ["Darth Algo products are educational and analytical charting tools. They do not provide personalized investment advice, brokerage services, managed trading, or guarantees of financial performance.", "You remain responsible for every trading decision, position, and risk-management choice made using information displayed by the tools."] },
  { title: "Account And TradingView Access", paragraphs: ["Invite-only access is granted to the TradingView username submitted during checkout after payment verification. You are responsible for entering the correct username and maintaining access to your TradingView account.", "Access may not be shared, resold, sublicensed, or transferred unless a separate written commercial license expressly allows it."] },
  { title: "Subscriptions And Cancellation", paragraphs: ["Monthly plans renew through Stripe according to the price and billing interval shown at checkout. Swing trial subscriptions continue at the disclosed monthly price unless canceled before the trial ends.", "You may cancel a subscription through the billing options provided with your Stripe purchase. Cancellation prevents future renewal but does not erase prior charges or create a guarantee of refund."] },
  { title: "Lifetime And Source-Code Rights", paragraphs: ["Lifetime access includes the products and rights specifically listed on the lifetime plan at the time of purchase. Commercial-use and source-code rights apply only to the purchasing customer and remain subject to any license delivered with the source files.", "Darth Algo branding, website content, documentation, and marketing assets are not transferred as part of a source-code license."] },
  { title: "Acceptable Use", paragraphs: ["You may not use Darth Algo products to violate laws, compromise TradingView or Stripe systems, misrepresent performance, distribute unauthorized copies, or claim guaranteed results.", "Access may be suspended when payment fails, a charge is reversed, account sharing is detected, or these terms are materially violated."] },
  { title: "Risk And Availability", paragraphs: ["Trading futures, stocks, forex, and cryptocurrencies involves substantial risk. Past performance, examples, and backtests do not guarantee future results.", "Software, market data, TradingView services, alerts, and internet connections may be delayed or unavailable. Darth Algo is provided without a promise of uninterrupted operation or error-free signals."] },
  { title: "Changes And Support", paragraphs: ["Product features and these terms may be updated as the software and business evolve. Material changes will be posted on this page with a revised effective date.", "For account or billing help, use the support details associated with your purchase receipt or visit the Darth Algo support page."] },
];

export default function TermsPage() {
  return <LegalPage eyebrow="Darth Algo Legal" title="Terms of Service" summary="The rules for using Darth Algo indicators, subscriptions, source code, and invite-only TradingView access." effectiveDate="July 29, 2026" sections={sections} />;
}
