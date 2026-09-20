"use client";

import Image from "next/image";
import { useState } from "react";

const scenes = [
  {label:"Trend",title:"See the bigger picture.",copy:"Read the trend cloud before focusing on an individual signal.",image:"/indicators/swing-trend-cloud.png",alt:"Recorded Darth Algo chart with a green and red trend cloud",width:1183,height:471},
  {label:"Signals",title:"Put signals in context.",copy:"Buy and sell markers highlight conditions to review alongside your plan.",image:"/indicators/signal-context-alt.png",alt:"Recorded Darth Algo chart with buy and sell markers in different market conditions",width:1523,height:485},
  {label:"Risk",title:"Make the risk visible.",copy:"Compare entry, stop and possible targets. A target is a plan, not a promise.",image:"/indicators/swing-risk-plan.png",alt:"Recorded long setup showing entry, a stop below entry, and two targets",width:514,height:325},
] as const;

export default function IndicatorPreview() {
  const [active,setActive]=useState(0);
  const scene=scenes[active];
  return (
    <div id="indicator-demo" className="relative border-b border-white/10 bg-[#0b1018] px-4 pb-5 pt-4 sm:px-5">
      <div role="group" aria-label="Explore the indicator" className="grid grid-cols-3 rounded-xl bg-white/[.05] p-1">
        {scenes.map((item,index)=><button key={item.label} type="button" onClick={()=>setActive(index)} aria-pressed={active===index} aria-controls="indicator-scene" className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${active===index?"bg-white text-[#101116] shadow-sm":"text-zinc-300 hover:bg-white/10"}`}>{item.label}</button>)}
      </div>
      <div id="indicator-scene" aria-live="polite" aria-atomic="true">
        <figure key={scene.label} className="indicator-scene-enter mt-4">
          <a href={scene.image} target="_blank" rel="noopener noreferrer" aria-label={`Open full-size ${scene.label.toLowerCase()} chart`} className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl bg-[#101522] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
            <Image src={scene.image} alt={scene.alt} width={scene.width} height={scene.height} sizes="(max-width: 640px) 90vw, 534px" className="max-h-full w-auto max-w-full object-contain" />
          </a>
          <figcaption className="mt-4">
            <p className="text-lg font-semibold tracking-tight text-white">{scene.title}</p>
            <p className="mt-1 min-h-12 text-sm leading-6 text-zinc-300">{scene.copy}</p>
          </figcaption>
        </figure>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">Recorded product examples · Tap the chart to enlarge. Selected historical views are not live signals or typical results.</p>
    </div>
  );
}
