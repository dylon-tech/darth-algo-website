import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, ChartNoAxesCombined, ShieldCheck, Video } from "lucide-react";
import ProductSpotlight from "../components/product-spotlight";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import AffiliateApplication from "./affiliate-application";

export const metadata: Metadata = { title: "Affiliate Creator Program | Darth Algo", description: "Apply to create educational trading content for Darth Algo and earn commission through a trackable Stripe promo code." };

const requirements = [
  [Video, "Create useful trading content", "Show real workflows, explain features clearly, and help traders use the indicators responsibly."],
  [CalendarCheck, "Publish on time", "Post within 72 hours of receiving access. Weekend approvals receive until the following Wednesday."],
  [ShieldCheck, "Be transparent", "Disclose the affiliate relationship, never promise profits, and keep all content educational."],
];

export default function AffiliatesPage() {
  return <div className="min-h-screen bg-[#0d1117] text-white"><SiteHeader /><main id="main-content">
    <ProductSpotlight eyebrow="Darth Algo creator program" title="Show the tool. Teach the setup." description="Create useful indicator demonstrations. Earn on eligible new-customer purchases after approval.">
      <a href="#creator-application" className="product-primary">See the creator program →</a>
      <Link href="/products/pro" className="product-secondary">Explore the product first</Link>
    </ProductSpotlight>
    <section className="section-shell py-12" id="creator-application">
        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-white/[.04] p-6"><p className="text-4xl font-black text-white">25%</p><p className="mt-2 text-sm text-zinc-400">on each new customer&apos;s first paid purchase</p></div><div className="rounded-xl border border-white/10 bg-white/[.04] p-6"><p className="text-4xl font-black text-white">Monthly</p><p className="mt-2 text-sm text-zinc-400">payouts after the 30-day hold</p></div><div className="col-span-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-6"><p className="flex items-center gap-2 font-black text-emerald-300"><ChartNoAxesCombined className="h-5 w-5" /> Live creator dashboard</p><p className="mt-2 text-sm leading-6 text-zinc-400">See new customers, first-purchase revenue, pending commission, payable commission, and completed payouts. Renewals do not earn additional commission.</p></div></div>
    </section>
    <section className="section-shell py-16"><div className="grid gap-5 lg:grid-cols-3">{requirements.map(([Icon,title,copy])=><article key={String(title)} className="rounded-xl border border-white/10 bg-[#111720] p-6"><Icon className="h-7 w-7 text-ember" /><h2 className="mt-5 text-lg font-black">{String(title)}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{String(copy)}</p></article>)}</div>
      <div className="mt-14 grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><div className="lg:sticky lg:top-28"><p className="text-xs font-black uppercase tracking-[.2em] text-ember">Program details</p><h2 className="mt-3 text-3xl font-black">What happens after you apply</h2><ol className="mt-7 space-y-5 text-sm leading-6 text-zinc-400"><li><strong className="text-white">1. Review:</strong> We check content quality, audience fit, and brand safety.</li><li><strong className="text-white">2. Approval:</strong> Your chosen code is created in Stripe and your dashboard activates.</li><li><strong className="text-white">3. Access:</strong> Your TradingView username receives creator access.</li><li><strong className="text-white">4. First content:</strong> Publish within 72 hours; weekend approvals have until Wednesday.</li><li><strong className="text-white">5. Earnings:</strong> Each new customer&apos;s first qualified paid purchase enters a 30-day hold, then becomes payable. Renewals do not earn commission. Payouts are sent monthly by Cash App or Bitcoin.</li></ol><div className="mt-7 rounded-lg border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm leading-6 text-amber-100/80">Commission is based on revenue actually collected from the customer&apos;s first paid purchase after discounts, refunds, disputes, and taxes. Self-referrals, renewals, spam, false claims, and code abuse are not eligible.</div></div><AffiliateApplication /></div>
    </section>
  </main><SiteFooter /></div>;
}
