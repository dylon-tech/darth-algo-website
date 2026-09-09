"use client";

import { useState } from "react";

const features = [
  { name: "Context", heading: "Start with direction.", copy: "The dashboard brings market direction and guidance together. Here, it shows an uptrend. Use it alongside the price action.", box: [1460, 0, 235, 185], view: "1300 0 457 340", note: "This capture is after the move: TARGET 2 HIT is a historical outcome." },
  { name: "Signal", heading: "A condition, not a command.", copy: "The BUY marker flags a condition detected by Swing. It is one piece of a setup, not a guarantee that price will rise.", box: [1065, 475, 60, 52], view: "850 290 570 410", note: "Read the surrounding price action before interpreting a marker." },
  { name: "Entry", heading: "Find the reference level.", copy: "The ENTRY line anchors this example’s trade plan. Compare the distance to the stop with the distance to possible targets.", box: [1080, 437, 285, 30], view: "990 240 440 350", note: "A chart level does not mean an order was placed or filled." },
  { name: "Stop", heading: "Define the downside.", copy: "The red STOP line marks the planned invalidation level for this long setup. Position size and execution determine the actual exposure.", box: [1080, 505, 285, 33], view: "990 305 440 350", note: "A stop level does not guarantee a fill price or limit every loss." },
  { name: "Targets", heading: "Plan possible exits.", copy: "TARGET 1 and TARGET 2 map possible exit areas above entry. Compare them with the downside before considering the setup.", box: [1080, 297, 290, 96], view: "990 205 440 350", note: "This selected favorable example is not typical-results evidence." },
] as const;

export default function FeatureExplorer() {
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [visited, setVisited] = useState<number[]>([0]);
  const feature = features[active];
  function select(index: number) {
    setActive(index);
    setVisited(previous => previous.includes(index) ? previous : [...previous, index]);
  }
  return <section aria-labelledby="explorer-title" className="mb-10 overflow-hidden rounded-2xl border border-white/15 bg-[#111925]">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 sm:px-7">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-red-400">Swing · Interactive demo</p><h2 id="explorer-title" className="mt-1 text-xl font-bold">One chart. Five things to explore.</h2></div>
      <button type="button" onClick={() => setFocused(!focused)} aria-pressed={focused} className="min-h-11 rounded-lg border border-white/25 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300">{focused ? "Show full chart" : "Zoom into feature"}</button>
    </div>
    <div className="relative bg-[#0d1117]">
      <svg viewBox={focused ? feature.view : "0 0 1757 763"} className="block aspect-[4/3] w-full sm:aspect-[1757/763]" role="img" aria-labelledby="chart-title chart-description">
        <title id="chart-title">Historical Darth Algo Swing chart — {feature.name} highlighted</title>
        <desc id="chart-description">Micro Gold Futures, five-minute chart. Explore the dashboard, BUY signal, entry, stop, and targets using the buttons below.</desc>
        <image href="/indicators/swing-overview.png" width="1757" height="763" />
        <rect key={active} x={feature.box[0]} y={feature.box[1]} width={feature.box[2]} height={feature.box[3]} rx="7" fill="#60a5fa" fillOpacity=".12" stroke="#93c5fd" strokeWidth="3" vectorEffect="non-scaling-stroke" className="feature-highlight" />
      </svg>
      <span className="absolute bottom-2 left-3 rounded bg-black/85 px-2 py-1 text-xs text-zinc-300">Historical example · Not live</span>
    </div>
    <div className="grid grid-cols-5 gap-1 border-y border-white/10 p-2 sm:gap-2 sm:px-6" aria-label="Chart features">
      {features.map((item, index) => <button key={item.name} type="button" aria-pressed={index === active} aria-controls="feature-detail" onClick={() => select(index)} className={`min-h-14 rounded-lg px-1 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 ${index === active ? "bg-blue-400/15 text-blue-200 ring-1 ring-inset ring-blue-400/50" : "text-zinc-300 hover:bg-white/5"}`}><span className="mb-1 block text-xs opacity-60">0{index + 1}</span>{item.name}</button>)}
    </div>
    <div id="feature-detail" className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_1fr]" aria-live="polite">
      <div><h3 className="text-2xl font-bold">{feature.heading}</h3><p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">{feature.copy}</p></div>
      <div className="flex flex-col justify-between gap-5"><p className="border-l-2 border-blue-400/40 pl-4 text-sm leading-6 text-zinc-400">{feature.note}</p><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-zinc-400">{visited.length} of 5 features explored</span><button type="button" onClick={() => select((active + 1) % features.length)} className="min-h-11 rounded-lg bg-white px-5 text-sm font-bold text-black">{active === features.length - 1 ? "Back to context" : "Next feature →"}</button></div></div>
    </div>
    <style jsx>{`
      .feature-highlight { animation: highlight-in 350ms ease-out; }
      @keyframes highlight-in { from { opacity: 0; } to { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { .feature-highlight { animation: none; } }
    `}</style>
  </section>;
}
