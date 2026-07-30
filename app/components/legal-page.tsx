import Link from "next/link";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";

export type LegalSection = { title: string; paragraphs: string[] };

export default function LegalPage({ eyebrow, title, summary, effectiveDate, sections }: { eyebrow: string; title: string; summary: string; effectiveDate: string; sections: LegalSection[] }) {
  return (
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/10 py-14 sm:py-20">
        <div aria-hidden="true" className="absolute inset-0 bg-grid bg-[size:46px_46px] opacity-[0.1]" />
        <div className="section-shell relative">
          <p className="font-mono text-[10px] font-bold uppercase text-ember">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-black leading-tight sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-400">{summary}</p>
          <p className="mt-4 text-xs text-zinc-500">Effective date: {effectiveDate}</p>
        </div>
      </section>
      <section className="py-12 sm:py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.32fr_0.68fr]">
          <aside className="h-fit rounded-md border border-white/10 bg-card p-6 lg:sticky lg:top-28">
            <p className="font-display text-xl font-black">On this page</p>
            <nav className="mt-5 flex flex-col gap-2" aria-label={`${title} sections`}>
              {sections.map((section, index) => <a key={section.title} href={`#legal-${index + 1}`} className="rounded-md px-3 py-2 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-white">{section.title}</a>)}
            </nav>
            <Link href="/support" className="mt-6 inline-flex text-sm font-bold text-ember hover:text-red-300">Visit support</Link>
          </aside>
          <div className="divide-y divide-white/10 rounded-md border border-white/10 bg-card px-6 sm:px-9">
            {sections.map((section, index) => (
              <article id={`legal-${index + 1}`} key={section.title} className="py-8 sm:py-10">
                <p className="font-mono text-[9px] font-bold uppercase text-zinc-600">Section {String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-3 font-display text-2xl font-black sm:text-3xl">{section.title}</h2>
                <div className="mt-4 space-y-4">{section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-zinc-400">{paragraph}</p>)}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
