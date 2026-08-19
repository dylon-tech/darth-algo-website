"use client";

import { BookOpen, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

const lessons = [
  { category: "Foundation", title: "How trend confirmation improves signal context", copy: "Learn why a buy or sell marker should be evaluated inside the broader market environment.", time: "6 min", points: ["Start with the active trend regime before interpreting a signal.", "Treat counter-trend signals differently from trend-aligned setups.", "Confirmation reduces ambiguity; it does not remove market risk."] },
  { category: "Risk", title: "Reading entry, stop, TP1, and TP2 together", copy: "A practical framework for reviewing reward and invalidation before a position is opened.", time: "7 min", points: ["Entry defines the planned participation area.", "The stop defines where the setup is invalidated, not how much money to risk.", "Targets help compare potential reward with the distance to invalidation."] },
  { category: "Scalper", title: "Building an intraday decision routine", copy: "Turn fast chart information into a repeatable checklist for active trading sessions.", time: "5 min", points: ["Choose the session and timeframe before signals begin.", "Wait for direction, signal, and risk structure to align.", "Avoid increasing size simply because signals appear more frequently."] },
  { category: "Swing", title: "Separating market noise from directional moves", copy: "Use broader trend context to avoid treating every short-term move as a new market regime.", time: "8 min", points: ["Broader moves require more room and patience than intraday setups.", "A pullback can occur without changing the primary trend.", "Reassess when market structure and the trend cloud both change."] },
  { category: "TradingView", title: "Setting up invite-only scripts and alerts", copy: "Understand where private indicators appear and how alert availability depends on your TradingView plan.", time: "4 min", points: ["Open Indicators and select the Invite-only scripts section.", "Add Darth Algo to the intended chart and timeframe.", "Create alerts from the indicator conditions supported by your TradingView plan."] },
  { category: "Discipline", title: "Why structure matters more than prediction", copy: "A trading process is built around scenarios, risk limits, and consistent execution rather than certainty.", time: "6 min", points: ["A signal is a scenario, not a promise.", "Define invalidation and size before focusing on potential profit.", "Review whether the process was followed, not only whether the trade won."] },
];

export default function EducationLibrary() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => lessons.filter((lesson) => `${lesson.category} ${lesson.title} ${lesson.copy}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <>
      <label className="relative mt-8 block max-w-xl" htmlFor="education-search">
        <span className="sr-only">Search education library</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input id="education-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search risk, signals, TradingView..." className="min-h-12 w-full rounded-md border border-white/10 bg-card pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-swing" />
      </label>
      <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((lesson) => (
          <details key={lesson.title} className="group min-h-64 bg-card p-7 transition open:bg-[#222b39] hover:bg-[#222b39]">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between"><span className="rounded-md border border-swing/30 bg-swing/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase text-blue-200">{lesson.category}</span><BookOpen className="h-4 w-4 text-zinc-600" /></div>
              <h2 className="mt-8 font-display text-2xl font-black leading-tight text-white">{lesson.title}</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-500">{lesson.copy}</p>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-600"><span>{lesson.time} lesson</span><span className="inline-flex items-center gap-1 font-bold text-zinc-300">Read lesson <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></span></div>
            </summary>
            <ul className="mt-5 space-y-3 border-t border-white/10 pt-5">{lesson.points.map((point) => <li key={point} className="flex gap-3 text-sm leading-6 text-zinc-400"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-swing" />{point}</li>)}</ul>
          </details>
        ))}
      </div>
      {filtered.length === 0 && <p className="mt-10 rounded-md border border-white/10 bg-card p-8 text-sm text-zinc-500">No lessons match that search yet.</p>}
    </>
  );
}
