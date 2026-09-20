"use client";

import {useEffect,useRef,useState} from "react";

// Deliberately illustrative values: no market-data request, account or subscription.
const quotes=[
 ["AAPL","214.32","+1.24"],["NVDA","142.87","+2.18"],["MSFT","428.60","−0.42"],
 ["AMZN","198.44","+0.86"],["TSLA","248.16","−1.32"],["META","586.72","+1.64"],
 ["SPY","568.25","+0.73"],["QQQ","492.18","+1.08"],
] as const;

function QuoteRibbon({reverse=false}:{reverse?:boolean}) {
 return <div className={`hub-quote-ribbon ${reverse?"hub-quote-reverse":""}`}>
  <div className="hub-quote-track">{[0,1].map(copy=><div className="hub-quote-set" key={copy}>{quotes.map(([symbol,price,change])=><span className="hub-quote" key={symbol}><b>{symbol}</b><span>{price}</span><em className={change.startsWith("−")?"is-down":"is-up"}>{change}%</em></span>)}</div>)}</div>
 </div>;
}

export default function MarketScene() {
 const canvas=useRef<HTMLCanvasElement>(null),scene=useRef<HTMLDivElement>(null),time=useRef(0);
 const [reduced,setReduced]=useState(false),[hidden,setHidden]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  const preference=()=>setReduced(media.matches),visibility=()=>setHidden(document.hidden);
  preference();visibility();media.addEventListener("change",preference);document.addEventListener("visibilitychange",visibility);
  return ()=>{media.removeEventListener("change",preference);document.removeEventListener("visibilitychange",visibility);};
 },[]);
 const frozen=reduced||hidden;
 useEffect(()=>{
  const element=canvas.current,root=scene.current;if(!element||!root)return;
  const ctx=element.getContext("2d");if(!ctx)return;
  let width=0,height=0,frame=0,last=0;
  const draw=()=>{
   ctx.clearRect(0,0,width,height);
   const t=time.current;
   // Two market planes at different depths; deterministic closed bars and a ticking last bar.
   for(let layer=0;layer<2;layer++){
    const step=layer?30:22,count=Math.ceil(width/step)+4,travel=(t*(layer?5:8))%step;
    const shift=Math.floor(t*(layer?5:8)/step),base=width<761?(layer?205:165):height*(layer?0.73:0.37);
    const center=width/2;
    ctx.lineWidth=1;
    for(let i=0;i<count;i++){
     const n=i+shift,x=i*step-travel-30;
     const wave=(v:number)=>Math.sin(v*.31+layer)*43+Math.sin(v*.79)*21;
     const open=wave(n),close=wave(n+1),tick=i===count-3?Math.sin(t*7)*7:0;
     const y=base+open,end=base+close+tick;
     const up=end<y,color=up?"57,215,173":"248,76,96";
     const edge=Math.min(1,Math.abs(x-center)/Math.max(1,width*.3));
     ctx.strokeStyle=`rgba(${color},${.22+edge*.3})`;ctx.fillStyle=`rgba(${color},${.18+edge*.22})`;
     ctx.beginPath();ctx.moveTo(x,Math.min(y,end)-11);ctx.lineTo(x,Math.max(y,end)+14);ctx.stroke();
     ctx.fillRect(x-4,Math.min(y,end),8,Math.max(3,Math.abs(end-y)));ctx.strokeRect(x-4,Math.min(y,end),8,Math.max(3,Math.abs(end-y)));
    }
    // Faint connecting price trace enhances depth without implying product results.
    ctx.strokeStyle=layer?"rgba(104,175,242,.16)":"rgba(86,223,186,.2)";
    ctx.beginPath();for(let x=0;x<width;x+=8){const y=base+Math.sin(x*.012+t*.16)*44+Math.cos(x*.021)*18;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
   }
  };
  const resize=()=>{width=root.clientWidth;height=root.clientHeight;const dpr=Math.min(window.devicePixelRatio||1,1.5);element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();};
  const animate=(now:number)=>{if(!last)last=now;if(now-last>=1000/24){time.current+=Math.min((now-last)/1000,.1);last=now;draw();}frame=requestAnimationFrame(animate);};
  const observer=new ResizeObserver(resize);observer.observe(root);resize();
  if(!frozen)frame=requestAnimationFrame(animate);
  return ()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[frozen]);
 return <>
  <div className="hub-market-scene" ref={scene} aria-hidden="true" data-frozen={frozen}>
   <div className="hub-market-halo" />
   <div className="hub-exchange-wall hub-exchange-left"><div className="hub-board-heading">EQUITIES / 01</div>{quotes.map(([symbol,price,change],i)=><div className="hub-board-row" key={symbol}><b>{symbol}</b><span className="hub-board-price"><span style={{animationDelay:`-${i*1.7}s`}}>{price}<br/>{(Number(price)+.12).toFixed(2)}<br/>{price}</span></span><em className={change.startsWith("−")?"is-down":"is-up"}>{change}</em></div>)}</div>
   <div className="hub-exchange-wall hub-exchange-right"><div className="hub-board-heading">MARKET / 02</div>{[...quotes].reverse().map(([symbol,price,change],i)=><div className="hub-board-row" key={symbol}><b>{symbol}</b><span className="hub-board-price"><span style={{animationDelay:`-${i*2.1}s`}}>{price}<br/>{(Number(price)-.08).toFixed(2)}<br/>{price}</span></span><em className={change.startsWith("−")?"is-down":"is-up"}>{change}</em></div>)}</div>
   <canvas ref={canvas} className="hub-market-candles" />
   <div className="hub-floor-perspective"><div className="hub-floor-grid" /></div>
   <div className="hub-ribbon-plane hub-ribbon-upper"><QuoteRibbon /></div>
   <div className="hub-ribbon-plane hub-ribbon-lower"><QuoteRibbon reverse /></div>
   <div className="hub-market-vignette" />
  </div>
 </>;
}
