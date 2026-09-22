import type { Metadata } from "next";
import Link from "next/link";

const imageUrl="https://www.darthalgo.com/founder/dylon-d-feagin.jpg";
export const metadata: Metadata = {
 title:"Dylon D. Feagin | Founder & CEO of Darth Algo",
 description:"Official profile of Dylon D. Feagin, Founder & CEO of Darth Algo, a TradingView indicator software brand.",
 alternates:{canonical:"/company/founder/dylon-d-feagin"},
 robots:{index:true,follow:true},
 openGraph:{title:"Dylon D. Feagin | Founder & CEO of Darth Algo",description:"Official founder profile for Dylon D. Feagin.",type:"profile",url:"https://www.darthalgo.com/company/founder/dylon-d-feagin",images:[{url:imageUrl,width:512,height:512,alt:"Dylon D. Feagin"}]},
 twitter:{card:"summary_large_image",title:"Dylon D. Feagin | Founder & CEO of Darth Algo",description:"Official founder profile for Dylon D. Feagin.",images:[imageUrl]}
};
const person={"@context":"https://schema.org","@type":"Person",name:"Dylon D. Feagin",jobTitle:"Founder & CEO",url:"https://www.darthalgo.com/company/founder/dylon-d-feagin",image:imageUrl,worksFor:{"@type":"Organization",name:"Darth Algo",url:"https://www.darthalgo.com"},founder:{"@type":"Organization",name:"Darth Algo",url:"https://www.darthalgo.com"}};
export default function FounderPage(){
 return <main className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(person)}}/>
  <div className="pointer-events-none absolute inset-0 opacity-40" style={{backgroundImage:"linear-gradient(rgba(239,68,68,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,.07) 1px,transparent 1px)",backgroundSize:"54px 54px",transform:"perspective(700px) rotateX(58deg) scale(1.5)",transformOrigin:"50% 0%"}}/>
  <div className="pointer-events-none absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-red-600/20 blur-[120px]"/>
  <article className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
   <div className="mb-10 flex items-center justify-between">
    <span className="text-xs font-black uppercase tracking-[.3em] text-red-500">Official founder profile</span>
    <span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[10px] uppercase tracking-[.2em] text-zinc-500">Darth Algo</span>
   </div>
   <section className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
    <div className="group relative mx-auto w-full max-w-md">
     <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-red-600/30 via-transparent to-white/10 blur-2xl transition duration-700 group-hover:scale-105"/>
     <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 p-2 shadow-2xl shadow-red-950/30 transition duration-700 group-hover:-translate-y-2 group-hover:rotate-[.4deg]">
      <img src="/founder/dylon-d-feagin.jpg" alt="Dylon D. Feagin, Founder and CEO of Darth Algo" className="aspect-square w-full rounded-[1.6rem] object-cover"/>
      <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-xl">
       <p className="font-black">Dylon D. Feagin</p><p className="text-sm text-zinc-400">Founder & CEO · Darth Algo</p>
      </div>
     </div>
    </div>
    <div>
     <p className="mb-4 text-sm font-bold uppercase tracking-[.24em] text-red-500">Founder · Builder · Trader</p>
     <h1 className="text-5xl font-black leading-[.92] tracking-[-.055em] sm:text-7xl lg:text-8xl">Dylon D.<br/><span className="bg-gradient-to-r from-white via-zinc-300 to-red-500 bg-clip-text text-transparent">Feagin.</span></h1>
     <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300">Founder and CEO of Darth Algo, building TradingView tools designed to make market signals, context, and risk planning easier to read in one workflow.</p>
     <div className="mt-8 flex flex-wrap gap-3">
      {["Founder & CEO","TradingView tools","Darth Algo"].map(x=><span key={x} className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm text-zinc-300">{x}</span>)}
     </div>
    </div>
   </section>
   <section className="mt-24 grid gap-5 md:grid-cols-3">
    {[["01","The vision","Build trading software that feels clear, useful, and focused instead of overloaded."],["02","The company","Darth Algo develops TradingView indicators for traders who want signals, trend context, alerts, and visual trade-planning levels."],["03","The role","Feagin leads the company’s product direction, brand, customer experience, and growth systems."]].map(([n,t,d])=><div key={n} className="group rounded-3xl border border-white/10 bg-white/[.035] p-7 backdrop-blur transition duration-500 hover:-translate-y-1 hover:border-red-500/30 hover:bg-red-500/[.04]"><p className="text-xs font-black text-red-500">{n}</p><h2 className="mt-5 text-2xl font-black">{t}</h2><p className="mt-4 leading-7 text-zinc-400">{d}</p></div>)}
   </section>
   <section className="mt-20 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[.06] to-transparent p-8 sm:p-12">
    <p className="text-xs font-black uppercase tracking-[.28em] text-red-500">Building Darth Algo</p>
    <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Technology built around a cleaner trading workflow.</h2>
    <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-400">Darth Algo is an independent TradingView indicator brand. Its product family includes Scalper, Swing, and Pro tools. The software is analytical and educational; trading involves risk and no outcome is guaranteed.</p>
    <Link href="/about-darth-algo" className="mt-8 inline-flex rounded-xl border border-red-500/30 bg-red-600/10 px-5 py-3 font-bold text-red-300 transition hover:bg-red-600/20">About Darth Algo →</Link>
   </section>
   <p className="mt-16 text-center text-[11px] uppercase tracking-[.22em] text-zinc-700">Official founder profile · Darth Algo</p>
  </article>
 </main>
}