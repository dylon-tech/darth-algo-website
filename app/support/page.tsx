import { ArrowRight, BadgeCheck, CircleHelp, Clock3, CreditCard, KeyRound, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

export const metadata: Metadata = { title: "Support | Darth Algo", description: "Help with Darth Algo purchases, TradingView invite-only access, billing, and indicator setup.", alternates: { canonical: "/support" } };

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "darthalgo67@gmail.com";

const helpTopics = [
  [UserRound, "TradingView username", "Confirm the username submitted in the custom field during Stripe checkout."],
  [KeyRound, "Invite-only access", "Look under TradingView Indicators, then Invite-only scripts after activation."],
  [CreditCard, "Billing and plans", "Use your Stripe receipt or billing portal link for subscription details and cancellation."],
  [CircleHelp, "Indicator setup", "Add the script to a chart, review its settings, then configure alerts for your workflow."],
];

export default function SupportPage() {
  return (
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/10 py-16 sm:py-24">
        <div aria-hidden="true" className="absolute inset-0 bg-grid bg-[size:48px_48px] opacity-[0.12]" />
        <div className="section-shell relative"><p className="font-mono text-[10px] font-bold uppercase text-emerald-400">Customer support</p><h1 className="mt-5 max-w-4xl text-balance font-display text-5xl font-black leading-[0.98] sm:text-7xl">Get from checkout to chart.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400">Fast answers for access, TradingView setup, billing, and plan questions.</p></div>
      </section>
      <section className="py-16 sm:py-24">
        <div className="section-shell">
          <div className="grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 md:grid-cols-2">
            {helpTopics.map(([Icon, title, copy]) => { const TopicIcon = Icon as typeof CircleHelp; return <article key={String(title)} className="bg-card p-7 sm:p-9"><TopicIcon className="h-5 w-5 text-ember" /><h2 className="mt-5 font-display text-2xl font-black">{String(title)}</h2><p className="mt-3 text-sm leading-7 text-zinc-500">{String(copy)}</p></article>; })}
          </div>
          <div className="mt-10 grid gap-8 rounded-md border border-emerald-500/25 bg-emerald-500/[0.055] p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><div className="flex items-center gap-3"><BadgeCheck className="h-5 w-5 text-emerald-400" /><h2 className="font-display text-2xl font-black">Access is activated manually.</h2></div><p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">After payment verification, the submitted TradingView username is added to the private script. Access is usually completed within 24 hours.</p></div>
            {supportEmail ? <a href={`mailto:${supportEmail}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-extrabold text-black">Email support<ArrowRight className="h-4 w-4" /></a> : <p className="flex items-center gap-2 text-sm font-bold text-zinc-300"><Clock3 className="h-4 w-4 text-emerald-400" />Reply to your Stripe receipt for purchase help</p>}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row"><Link href="/#faq" className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/10 bg-card px-6 text-sm font-bold">Read common questions</Link><Link href="/refund-policy" className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/10 bg-card px-6 text-sm font-bold">Refund and cancellation policy</Link></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
