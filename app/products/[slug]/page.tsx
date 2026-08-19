import { ArrowRight, BellRing, Check, Layers3, ShieldCheck, Target, TrendingUp, Zap } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";
import SiteHeader from "../../components/site-header";
import TradingViewUsernameHelp from "../../components/tradingview-username-help";
import { getCheckoutLink, productList, products, type ProductSlug } from "../../lib/products";

const colorStyles = {
  scalp: { text: "text-scalp", border: "border-scalp/45", bg: "bg-scalp/10", button: "bg-scalp hover:bg-orange-400", glow: "shadow-[0_0_70px_rgba(235,145,20,0.16)]" },
  swing: { text: "text-swing", border: "border-swing/45", bg: "bg-swing/10", button: "bg-swing hover:bg-blue-500", glow: "shadow-[0_0_70px_rgba(30,125,220,0.16)]" },
  pro: { text: "text-pro", border: "border-pro/45", bg: "bg-pro/10", button: "bg-pro hover:bg-violet-500", glow: "shadow-[0_0_70px_rgba(139,92,246,0.16)]" },
};

export function generateStaticParams() {
  return productList.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = products[slug as ProductSlug];
  if (!product) return {};
  return {
    title: `${product.shortName} Indicator | Darth Algo`,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} | Darth Algo`,
      description: product.description,
      images: [{ url: product.overview, alt: product.overviewAlt }],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products[slug as ProductSlug];
  if (!product) notFound();

  const styles = colorStyles[product.color];
  const checkout = getCheckoutLink(product.slug);
  const icon = product.slug === "scalper" ? <Zap className="h-4 w-4" /> : product.slug === "swing" ? <TrendingUp className="h-4 w-4" /> : <Layers3 className="h-4 w-4" />;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "TradingView",
    description: product.description,
    offers: { "@type": "Offer", price: product.price.replace("$", ""), priceCurrency: "USD", availability: "https://schema.org/InStock" },
  };

  return (
    <main id="main-content" className="min-h-screen bg-obsidian text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-white/10 pb-16 pt-14 sm:pb-24 sm:pt-20">
        <div aria-hidden="true" className="absolute inset-0 bg-grid bg-[size:48px_48px] opacity-[0.12]" />
        <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-px ${styles.bg} opacity-80`} />
        <div className="section-shell relative grid gap-12 xl:grid-cols-[0.78fr_1.22fr] xl:items-center">
          <div>
            <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-[10px] font-bold uppercase ${styles.border} ${styles.bg} ${styles.text}`}>{icon}{product.mode}</span>
            <h1 className="mt-7 text-balance font-display text-5xl font-black leading-[0.98] sm:text-7xl">{product.shortName} <span className={styles.text}>intelligence</span> for your chart.</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">{product.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {checkout ? (
                <a href={checkout} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 text-sm font-extrabold text-white transition ${styles.button} ${styles.glow}`}>{product.slug === "swing" ? "Start 2-Day Free Trial" : `Get ${product.shortName} Access`}<ArrowRight className="h-4 w-4" /></a>
              ) : (
                <Link href="/#pricing" className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-6 text-sm font-extrabold ${styles.border} ${styles.bg} ${styles.text}`}>View availability<ArrowRight className="h-4 w-4" /></Link>
              )}
              <Link href="/#pricing" className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/15 bg-white/[0.035] px-6 text-sm font-extrabold text-white transition hover:border-white/30">Compare all plans</Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500">{product.price} {product.cadence}. Invite-only access through TradingView.</p>
            {checkout && <TradingViewUsernameHelp className="mt-2 -ml-3" />}
          </div>

          <div className={`relative overflow-hidden rounded-md border bg-[#090d13] ${styles.border} ${styles.glow}`}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 font-mono text-[9px] font-bold uppercase text-zinc-500">
              <span>Darth Algo // {product.shortName}</span><span className={styles.text}>Chart preview</span>
            </div>
            <div className="relative aspect-[16/8.5] min-h-[250px]">
              <Image src={product.overview} alt={product.overviewAlt} fill priority sizes="(min-width: 1280px) 58vw, 100vw" className="object-cover object-left" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="section-shell grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className={`font-mono text-[10px] font-bold uppercase ${styles.text}`}>What it gives you</p>
            <h2 className="mt-4 font-display text-4xl font-black sm:text-5xl">Structure without the clutter.</h2>
            <p className="mt-5 text-base leading-8 text-zinc-500">Every visual layer has a job: direction, confirmation, risk, or execution. Nothing is presented as a guaranteed outcome.</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-2">
            {product.features.map((feature, index) => (
              <div key={feature} className="flex min-h-28 items-start gap-4 bg-card p-6">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${styles.bg} ${styles.text}`}><Check className="h-4 w-4" /></span>
                <div><p className="font-display text-lg font-bold text-white">{feature}</p><p className="mt-2 text-xs leading-5 text-zinc-500">Module {String(index + 1).padStart(2, "0")}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-secondary py-20 sm:py-28">
        <div className="section-shell">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className={`font-mono text-[10px] font-bold uppercase ${styles.text}`}>Feature inspection</p><h2 className="mt-4 font-display text-4xl font-black sm:text-5xl">See each decision layer.</h2></div>
            <p className="max-w-xl text-sm leading-7 text-zinc-500">Actual Darth Algo screenshots. Expandable chart previews remain available on the main product experience.</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {product.gallery.map((item) => (
              <figure key={item.src} className="overflow-hidden rounded-md border border-white/10 bg-card">
                <div className="relative aspect-[16/9]"><Image src={item.src} alt={item.alt} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" /></div>
                <figcaption className="border-t border-white/10 px-5 py-4 font-display text-lg font-bold">{item.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="section-shell grid gap-10 lg:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-card p-7 sm:p-9">
            <p className={`font-mono text-[10px] font-bold uppercase ${styles.text}`}>Best fit</p>
            <h2 className="mt-4 font-display text-3xl font-black">Built for a specific rhythm.</h2>
            <ul className="mt-7 space-y-4">{product.idealFor.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-zinc-400"><ShieldCheck className={`mt-0.5 h-4 w-4 shrink-0 ${styles.text}`} />{item}</li>)}</ul>
          </div>
          <div className="rounded-md border border-white/10 bg-card p-7 sm:p-9">
            <p className={`font-mono text-[10px] font-bold uppercase ${styles.text}`}>Trading workflow</p>
            <ol className="mt-5 divide-y divide-white/10">{product.workflow.map((step, index) => <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-5"><span className={`font-mono text-xs font-bold ${styles.text}`}>0{index + 1}</span><div><h3 className="font-display text-xl font-bold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{step.copy}</p></div></li>)}</ol>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#090c11] py-16">
        <div className="section-shell grid gap-6 sm:grid-cols-3">
          {[[BellRing, "Real-time alerts", "Stay connected away from the chart"], [Target, "Defined risk", "Entry, stop, and target planning"], [ShieldCheck, "Invite-only", "Private access through TradingView"]].map(([Icon, title, copy]) => {
            const ModuleIcon = Icon as typeof BellRing;
            return <div key={String(title)} className="flex gap-4"><ModuleIcon className={`mt-1 h-5 w-5 shrink-0 ${styles.text}`} /><div><p className="font-display text-lg font-bold">{String(title)}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{String(copy)}</p></div></div>;
          })}
        </div>
      </section>

      <section className="py-20 text-center sm:py-28">
        <div className="section-shell max-w-3xl">
          <p className={`font-mono text-[10px] font-bold uppercase ${styles.text}`}>Choose your access</p>
          <h2 className="mt-4 text-balance font-display text-4xl font-black sm:text-6xl">Trade with structure, not emotion.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-zinc-500">Review every Darth Algo plan, compare the tools, and choose the workflow that matches how you trade.</p>
          <Link href="/#pricing" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ember px-7 text-sm font-extrabold text-white shadow-glow transition hover:bg-red-500">Compare Darth Algo plans<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
