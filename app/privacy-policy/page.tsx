import Link from "next/link";
import type { Metadata } from "next";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy | Darth Algo",
  description:
    "Privacy Policy for Darth Algo, including payment, TradingView username, and customer access information.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

const policySections = [
  {
    title: "Information We Collect",
    body: [
      "When you purchase Darth Algo, we may collect your name, email address, payment status, selected plan, and TradingView username.",
      "When you complete the optional purchase survey, we may collect your referral source and selected purchase reasons.",
      "Payment details are processed by Stripe. Darth Algo does not store your full credit card number or complete payment credentials.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use your information to process purchases, verify orders, grant invite-only TradingView access, provide support, and communicate important product or account updates.",
      "Your TradingView username is used only to activate or manage access to Darth Algo scripts through TradingView.",
    ],
  },
  {
    title: "Payments",
    body: [
      "Payments are handled through Stripe. Stripe may collect and process payment information according to its own privacy policy and security practices.",
      "We may use Stripe order details to confirm your purchase, plan type, billing status, refunds, disputes, or subscription access.",
    ],
  },
  {
    title: "Cookies And Analytics",
    body: [
      "Our website may use basic cookies, hosting logs, analytics, or similar technologies to understand site performance and improve the customer experience.",
      "When you visit or join our community, we may record the referring platform, campaign label, anonymous browser identifier, Telegram invitation source, and join time. We do not store your Telegram user ID in readable form for growth reporting.",
      "You can control cookies through your browser settings, but some website features may not work as expected if cookies are disabled.",
    ],
  },
  {
    title: "How We Share Information",
    body: [
      "We do not sell your personal information.",
      "We may share limited information with service providers that help operate the website, process payments, deliver access, or provide customer support.",
    ],
  },
  {
    title: "Data Security",
    body: [
      "We use reasonable administrative, technical, and organizational safeguards to protect customer information.",
      "No online system can be guaranteed to be completely secure, but we work to keep customer information limited and protected.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We retain purchase and access information for as long as needed to provide the product, support customers, comply with legal obligations, resolve disputes, and maintain business records.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You may contact us to request access, correction, or deletion of your personal information, subject to reasonable business, legal, and payment-processing requirements.",
      "If you cancel a subscription, we may retain limited records needed for billing, accounting, dispute prevention, and access history.",
    ],
  },
  {
    title: "Children's Privacy",
    body: [
      "Darth Algo is not intended for children under 18. We do not knowingly collect personal information from children through the trading-product checkout flow.",
    ],
  },
  {
    title: "Changes To This Policy",
    body: [
      "We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised effective date.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-grid bg-[size:42px_42px] opacity-[0.12]" />
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(255,26,26,0.24),transparent_58%)]" />
        <div className="section-shell relative py-12 sm:py-16">
          <p className="mt-10 font-display text-sm font-bold uppercase text-ember">
            Darth Algo
          </p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-white sm:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-400">
            This Privacy Policy explains how Darth Algo collects, uses, and
            protects information related to website visits, Stripe purchases,
            support, and TradingView invite-only access.
          </p>
          <p className="mt-4 text-sm text-zinc-500">Effective date: September 4, 2026</p>
        </div>
      </section>

      <section className="section-shell py-12 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="panel-border h-fit rounded-md p-6">
            <p className="font-display text-2xl font-bold text-white">Quick Summary</p>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-400">
              <li>We collect only what is needed to process purchases and grant access.</li>
              <li>Stripe handles payment processing.</li>
              <li>Your TradingView username is used for invite-only script access.</li>
              <li>We do not sell personal information.</li>
            </ul>
          </aside>

          <div className="space-y-4">
            {policySections.map((section) => (
              <article key={section.title} className="panel-border rounded-md p-6">
                <h2 className="font-display text-2xl font-bold text-white">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-zinc-400">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}

            <article className="rounded-md border border-ember/30 bg-ember/[0.06] p-6 shadow-glow">
              <h2 className="font-display text-2xl font-bold text-white">Contact</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-300">
                For privacy questions or data requests, use the support channel on
                your purchase receipt or visit the <Link href="/support" className="font-bold text-white underline underline-offset-4">Darth Algo support page</Link>.
              </p>
            </article>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
