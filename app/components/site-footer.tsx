import { Instagram, LockKeyhole, Mail } from "lucide-react";
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

const instagramUrl = "https://www.instagram.com/darth.algo/";
const supportEmail = "darthalgo67@gmail.com";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#090c11] py-10">
      <div className="section-shell grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Link href="/#top" aria-label="Darth Algo home"><SiteBrand compact /></Link>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">TradingView tools built to help traders read direction, define risk, and trade with a repeatable process.</p>
        </div>
        <div className="flex flex-col gap-5 lg:items-end">
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-zinc-500 lg:justify-end" aria-label="Footer navigation">
            {footerLinks.map(([label, href]) => <Link key={href} href={href} className="transition hover:text-white">{label}</Link>)}
          </nav>
          <div className="flex flex-wrap gap-3" aria-label="Social and contact links">
            <a href={instagramUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-300 transition hover:border-ember/50 hover:bg-ember/10 hover:text-white">
              <Instagram className="h-4 w-4 text-ember" />
              Instagram
            </a>
            <a href={`mailto:${supportEmail}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-300 transition hover:border-ember/50 hover:bg-ember/10 hover:text-white">
              <Mail className="h-4 w-4 text-ember" />
              Email
            </a>
          </div>
        </div>
      </div>
      <div className="section-shell mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Darth Algo. All Rights Reserved.</p>
        <span className="inline-flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-ember" /> Secure checkout powered by Stripe</span>
      </div>
    </footer>
  );
}
