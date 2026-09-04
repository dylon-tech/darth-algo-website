"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import SiteBrand from "./site-brand";

const links = [
  ["Products", "/#examples"],
  ["Results", "/#performance"],
  ["Education", "/education"],
  ["Community", "/community"],
  ["Pricing", "/#pricing"],
  ["Affiliates", "/affiliates"],
  ["Support", "/support"],
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <header className="site-header sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/90 backdrop-blur-xl">
      <nav className="section-shell flex h-[72px] items-center justify-between" aria-label="Primary navigation">
        <Link href="/#top" aria-label="Darth Algo home"><SiteBrand compact /></Link>
        <div className="hidden items-center gap-7 xl:flex">
          {links.map(([label, href]) => <Link key={href} href={href} className="text-sm font-semibold text-zinc-400 transition hover:text-white">{label}</Link>)}
        </div>
        <div className="hidden items-center gap-2 xl:flex">
          <Link href="/#swing-trial" className="inline-flex min-h-11 items-center justify-center rounded-md border border-swing/40 bg-swing/10 px-4 text-xs font-extrabold text-blue-200 transition hover:bg-swing hover:text-white">Try Swing Free</Link>
          <Link href="/#pricing" className="inline-flex min-h-11 items-center justify-center rounded-md bg-ember px-4 text-xs font-extrabold text-white shadow-glow transition hover:bg-red-500">Get Darth Algo Indicators</Link>
        </div>
        <button type="button" aria-label="Toggle navigation" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/[0.04] xl:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open && (
        <div id="mobile-navigation" className="border-t border-white/10 bg-[#0d1117] px-5 py-4 xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5">{label}</Link>)}
            <Link href="/#swing-trial" onClick={() => setOpen(false)} className="mt-2 inline-flex min-h-12 items-center justify-center rounded-md bg-white px-5 text-sm font-extrabold text-black">Start 2-Day Free Trial</Link>
            <Link href="/#pricing" onClick={() => setOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-md bg-ember px-5 text-sm font-extrabold text-white shadow-glow">View All Plans</Link>
          </div>
        </div>
      )}
    </header>
  );
}
