import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import SiteBrand from "./site-brand";

const footerLinks = [
  ["Products", "/#examples"],
  ["Education", "/education"],
  ["Pricing", "/#pricing"],
  ["Support", "/support"],
  ["Privacy", "/privacy-policy"],
  ["Terms", "/terms-of-service"],
  ["Refunds", "/refund-policy"],
];

export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#090c11] py-10">
      <div className="section-shell grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Link href="/#top" aria-label="Darth Algo home"><SiteBrand compact /></Link>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">TradingView tools built to help traders read direction, define risk, and trade with a repeatable process.</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-zinc-500" aria-label="Footer navigation">
          {footerLinks.map(([label, href]) => <Link key={href} href={href} className="transition hover:text-white">{label}</Link>)}
        </nav>
      </div>
      <div className="section-shell mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Darth Algo. All Rights Reserved.</p>
        <span className="inline-flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-ember" /> Secure checkout powered by Stripe</span>
      </div>
    </footer>
  );
}
