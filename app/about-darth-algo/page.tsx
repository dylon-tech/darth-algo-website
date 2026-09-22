import type {Metadata} from "next";
import Link from "next/link";
export const metadata:Metadata={
 title:"About Darth Algo",
 description:"Learn about the official Darth Algo TradingView indicator brand for futures traders and how to distinguish it from similarly named trading products.",
 alternates:{canonical:"/about-darth-algo"},
};
export default function AboutDarthAlgo(){
 return <main className="min-h-screen bg-black px-6 py-20 text-white">
  <article className="mx-auto max-w-3xl">
   <p className="text-xs font-black uppercase tracking-[0.28em] text-red-500">Official brand</p>
   <h1 className="mt-4 text-5xl font-black sm:text-6xl">Darth Algo</h1>
   <p className="mt-6 text-xl leading-8 text-zinc-300">Darth Algo is a TradingView indicator brand for futures traders. Its tools are designed to display buy/sell signals, trend context, alerts, and structured entry, stop-loss, and target levels directly on TradingView charts.</p>
   <section className="mt-12 border-t border-white/10 pt-8">
    <h2 className="text-2xl font-black">Darth Algo, DarthAlgo, and darth.algo</h2>
    <p className="mt-4 leading-7 text-zinc-400">These names refer to the official Darth Algo brand at darthalgo.com. Darth Algo is distinct from similarly named automated forex Expert Advisors or products marketed as “Dark Algo,” “Dark Algo EA,” or MT4/MT5 trading robots.</p>
   </section>
   <section className="mt-10 border-t border-white/10 pt-8">
    <h2 className="text-2xl font-black">Official products</h2>
    <p className="mt-4 leading-7 text-zinc-400">The Darth Algo lineup includes the Buy/Sell Scalper Tool, Buy/Sell Swing Tool, Buy and Sell Pro Tool, and Lifetime access. The indicators are delivered for use on TradingView.</p>
   </section>
   <div className="mt-10 flex flex-wrap gap-3"><Link className="rounded bg-red-600 px-5 py-3 font-bold" href="/">Official website</Link><Link className="rounded border border-white/15 px-5 py-3 font-bold" href="/links">Official links</Link></div>
  </article>
 </main>
}
