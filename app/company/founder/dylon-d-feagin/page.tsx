import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dylon D. Feagin | Founder & CEO of Darth Algo",
  description:
    "Official founder profile for Dylon D. Feagin, Founder & CEO of Darth Algo, a TradingView indicator brand focused on clearer signals, market context, and structured risk planning.",
  alternates: { canonical: "/company/founder/dylon-d-feagin" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Dylon D. Feagin | Founder & CEO of Darth Algo",
    description: "Official founder profile for Dylon D. Feagin, Founder & CEO of Darth Algo.",
    type: "profile",
    url: "https://www.darthalgo.com/company/founder/dylon-d-feagin",
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Dylon D. Feagin",
  jobTitle: "Founder & CEO",
  url: "https://www.darthalgo.com/company/founder/dylon-d-feagin",
  worksFor: {
    "@type": "Organization",
    name: "Darth Algo",
    url: "https://www.darthalgo.com",
  },
  founder: {
    "@type": "Organization",
    name: "Darth Algo",
    url: "https://www.darthalgo.com",
  },
};

export default function FounderPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <article className="mx-auto max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-red-500">
          Founder profile
        </p>
        <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl">
          Dylon D. Feagin
        </h1>
        <p className="mt-4 text-xl font-semibold text-zinc-300">
          Founder &amp; CEO of Darth Algo
        </p>

        <p className="mt-8 text-xl leading-8 text-zinc-300">
          Dylon D. Feagin is the founder and CEO of Darth Algo, a trading-software
          brand focused on building TradingView tools that make signals, market
          context, and risk planning easier to read in one chart workflow.
        </p>

        <section className="mt-12 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-black">Building Darth Algo</h2>
          <p className="mt-4 leading-7 text-zinc-400">
            Feagin founded Darth Algo with a practical goal: give traders a cleaner
            way to see directional signals, trend context, entries, stops, and
            profit targets without turning the chart into a wall of information.
            The company develops tools for TradingView with an emphasis on futures
            trading and structured decision-making.
          </p>
        </section>

        <section className="mt-10 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-black">Founder focus</h2>
          <p className="mt-4 leading-7 text-zinc-400">
            As founder and CEO, Feagin leads the direction of the Darth Algo
            product line, brand, customer experience, and the systems being built
            around the company. The product family includes Scalper, Swing, and
            Pro tools designed to work inside a trader&apos;s existing TradingView
            workflow.
          </p>
        </section>

        <section className="mt-10 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-black">About Darth Algo</h2>
          <p className="mt-4 leading-7 text-zinc-400">
            Darth Algo is an independent TradingView indicator brand. Its tools
            combine buy and sell signals with trend context, alerts, and visual
            trade-planning levels. The software is analytical and educational;
            trading remains risky and no outcome is guaranteed.
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            className="rounded border border-white/15 px-5 py-3 font-bold"
            href="/about-darth-algo"
          >
            About Darth Algo
          </Link>
        </div>

        <p className="mt-16 text-xs leading-5 text-zinc-600">
          Official founder profile published by Darth Algo.
        </p>
      </article>
    </main>
  );
}
