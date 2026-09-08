import { productList, getCheckoutLink } from "../products";
import type { Evidence } from "./sources";

// Catalog values are shared with the storefront. Policy summaries are explicitly
// repository snapshots, never a claim about a customer's live billing/access.
export function businessKnowledge(): Evidence {
  return {
    id: "business_knowledge",
    status: "verified",
    checkedAt: new Date().toISOString(),
    scope: "Facts read from this deployment's website source. Not a live checkout, legal interpretation, customer entitlement, or fulfillment verification. Checkout terms must be checked before an external offer. Policy summaries reviewed 2026-09-08; re-review when their source pages change.",
    data: {
      products: productList.map(product => ({
        name: product.name, slug: product.slug, advertisedPrice: product.price,
        advertisedCadence: product.cadence, description: product.description,
        features: product.features, workflow: product.workflow,
        sourcePath: "app/lib/products.ts", page: `/products/${product.slug}`,
        checkoutUrl: getCheckoutLink(product.slug),
      })),
      onboarding: {
        sourcePaths: ["app/start/page.tsx", "app/support/page.tsx"],
        steps: [
          "Confirm the TradingView username submitted during Stripe checkout.",
          "Payment is verified and invite-only TradingView access is activated manually; the website says usually within 24 hours, not a guarantee.",
          "Open a TradingView chart, choose Indicators, then Invite-only scripts.",
          "Add the purchased Darth Algo tool, review settings, and configure alerts for the intended workflow.",
          "For missing access, verify the purchase and username through support; do not claim access is activated without fulfillment evidence.",
        ],
        trial: "Swing advertises a two-day trial starting at checkout; applicable only if checkout explicitly displays it. Manual activation may consume part of the trial. Do not promise an extension.",
        supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "darthalgo67@gmail.com",
        supportPage: "/support",
      },
      acquisition: {
        sourcePath: "app/start/page.tsx", page: "/start",
        offer: "Free interactive chart walkthrough, no signup required, followed by the free customer Telegram community at /community.",
        lesson: "Context, invalidation and targets; selected historical screenshots do not establish typical or future performance.",
        measurement: "Existing community tracking measures events. Do not infer unique visitors, customer conversions or revenue from clicks.",
      },
      affiliates: {
        sourcePath: "app/affiliates/page.tsx", page: "/affiliates",
        terms: "Approved creators earn 25% on each new customer's first qualified paid purchase, based on collected revenue after discounts, refunds, disputes and taxes. No renewal commission. A 30-day hold precedes monthly payouts by Cash App or Bitcoin. Self-referrals, spam, false claims and code abuse are ineligible.",
        onboarding: "Application review, approved Stripe promo code/dashboard, TradingView creator access, then first content within 72 hours; weekend approvals have until Wednesday.",
        content: "Disclose the affiliate relationship, explain actual features and never promise profits.",
        boundary: "Published program terms do not prove any creator's approval, code creation, access or payout eligibility. Those require account evidence and exact approval before changes.",
      },
      billing: {
        sourcePath: "app/refund-policy/page.tsx", page: "/refund-policy",
        summary: "Cancellation stops future renewals; paid access may continue through the period shown by Stripe. Delivered digital-product refund requests are reviewed individually. Approved refunds return through Stripe to the original method. Do not promise or execute a refund or decide statutory entitlement.",
        investigation: "Support requests can identify purchase email, plan and Stripe receipt identifier. Never request full card details, passwords or API keys. Customer-sensitive records are not included in this knowledge snapshot.",
      },
      limitations: [
        "This catalog covers Scalper, Swing and Pro only; do not invent prices or availability for other offers.",
        "Product descriptions are published claims, not independent evidence of trading outcomes.",
        "Customer community is separate from the private owner command bot.",
        "No connected fulfillment or support-case adapter; do not turn documented procedures into claims that work has been performed.",
      ],
    },
  };
}
