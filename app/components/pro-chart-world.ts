import { smooth, chapterAt } from "./chart-journey-math";
import { proCandles as candles, signalsFor, indicatorProfiles, type IndicatorMode, proSimulation, proCandleTick, proFocusFrame } from "./pro-chart-simulation";
import type { ChartWorld } from "./chart-world";

// Visual reconstruction from the site's Darth Algo Pro feature-map references.
// Prices and timing are deterministic illustrations, not Pine Script output.
const NS = "http://www.w3.org/2000/svg";
const GREEN = "#4caf50", RED = "#ff304b", UP = "#00a995";
const X = (i: number) => 26 + i * 12.2;
let chartNumber = 0;
const Y = (price: number) => 475 - (price - 4430) * 2.25;
// Continuous illustrative smoothing avoids a geometric spike when the cloud changes color.
let fastAverage = candles[0].open, slowAverage = candles[0].open;
const cloud = candles.map((c,i)=>{
  const mid = (c.open+c.close)/2;
  fastAverage += (mid-fastAverage)*.32; slowAverage += (mid-slowAverage)*.14;
  return {x:X(i),fast:Y(fastAverage),slow:Y(slowAverage)};
});

export function createProChartWorld(host: HTMLElement, options: { mode?: IndicatorMode; pro?: boolean; compact?: boolean } = {}): ChartWorld {
  const mode = options.mode ?? "swing", profile = indicatorProfiles[mode], proSignals = signalsFor(mode);
  const name = options.pro ? `PRO · ${profile.label.toUpperCase()}` : profile.label.toUpperCase();
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 1120 570"); svg.setAttribute("aria-hidden", "true");
  svg.classList.add("pro-chart-simulation");
  host.dataset.renderer = "pro-chart"; host.dataset.mode = mode; host.appendChild(svg);
  const element = (tag: string, attrs: Record<string, string | number>, parent: Element = svg, text?: string) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text) node.textContent = text;
    parent.appendChild(node); return node;
  };
  const label = (x: number, y: number, text: string, color: string, parent: Element, down = false) => {
    const group = element("g", { transform: `translate(${x} ${y})` }, parent);
    const width = Math.max(35, text.length * 7.5 + 16);
    element("rect", { x: -width / 2, y: down ? -25 : 0, width, height: 25, rx: 2, fill: color }, group);
    element("path", { d: down ? "M-7 0 L0 7 L7 0 Z" : "M-7 0 L0 -7 L7 0 Z", fill: color }, group);
    element("text", { x: 0, y: down ? -9 : 17, "text-anchor": "middle", fill: "#fff", "font-size": 12, "font-weight": 700 }, group, text);
    return group;
  };
  element("rect", { width: 1120, height: 570, rx: 3, fill: "#141923", stroke: "#303541" });
  const plotId = `pro-plot-${++chartNumber}`;
  const defs = element("defs",{}), clip = element("clipPath",{id:plotId},defs);
  element("rect",{x:40,y:72,width:980,height:428},clip);
  const plot = element("g", {"clip-path":`url(#${plotId})`});
  const grid = element("g",{},plot);

  for (let i = 0; i < 12; i++) element("rect", { x: i * 130, y: 38, width: 83, height: 462, fill: "#182238" }, grid);
  for (let y = 58; y < 501; y += 34) element("path", { d: `M0 ${y} H1020`, stroke: "#ffffff", "stroke-opacity": .075, "stroke-width": .7 }, plot);
  for (let x = 0; x < 1700; x += 49) element("path", { d: `M${x} 38 V500`, stroke: "#ffffff", "stroke-opacity": .075, "stroke-width": .7 }, grid);
  element("rect", { x: 0, y: 0, width: 1120, height: 37, fill: "#11161f" });
  element("text", { x: 16, y: 24, fill: "#b6bac4", "font-size": 13 }, svg, `MGC · Micro Gold Futures · ${profile.timeframe} · COMEX`);
  element("text", { x: 1104, y: 23, "text-anchor": "end", fill: "#c0a2ff", "font-size": 11, "font-weight": 700 }, svg, `${name} / SCRIPTED EXAMPLE`);
  for (let p = 4440; p <= 4600; p += 20) element("text", { x: 1036, y: Y(p) + 4, fill: "#a9aeb8", "font-size": 12 }, svg, `${p.toLocaleString("en-US")}.0`);
  const timeLabels = Array.from({length:9},(_,i)=>element("text",{x:40+i*122,y:523,fill:"#a9aeb8","font-size":11},svg,"09:00"));
  const rolling = element("g",{},plot);
  const trend = element("g", {}, rolling);
  element("rect",{x:0,y:37,width:1120,height:34,fill:"#171b26",stroke:"#2a2e39"});
  element("text",{x:17,y:59,fill:"#d1d4dc","font-size":12},svg,"＋    1m     5m     15m     1h     │     Candles     │     ƒx Indicators     │     Alert");
  const ohlc = element("text",{x:1000,y:59,"text-anchor":"end",fill:UP,"font-size":11});
  element("rect",{x:0,y:72,width:39,height:428,fill:"#171b26",stroke:"#2a2e39"});
  ["＋","╱","≡","T","⌖","↶"].forEach((symbol,i)=>element("text",{x:19,y:102+i*46,"text-anchor":"middle",fill:"#9ca3b2","font-size":20},svg,symbol));
  element("path",{d:"M1020 72 V500 M40 500 H1120",stroke:"#2a2e39"});
  element("text",{x:55,y:557,fill:"#9ca3b2","font-size":11},svg,"1D    5D    1M    3M    6M    YTD    1Y    All");
  element("text",{x:1100,y:557,"text-anchor":"end",fill:"#9ca3b2","font-size":11},svg,"UTC     %     log     auto");

  const bullishCloud = element("path", { fill: GREEN, "fill-opacity": .24 }, trend);
  const bearishCloud = element("path", { fill: RED, "fill-opacity": .24 }, trend);
  const bullishLine = element("path", { fill: "none", stroke: GREEN, "stroke-width": 1.8 }, trend);
  const bearishLine = element("path", { fill: "none", stroke: RED, "stroke-width": 1.8 }, trend);
  const bars = candles.map((c, i) => {
    const group = element("g", {}, rolling), color = c.close >= c.open ? UP : RED;
    const wick = element("path", { stroke: color, "stroke-width": .8 }, group);
    const body = element("rect", { x: X(i) - 4, width: 8, fill: color }, group);
    const volume = element("rect",{x:X(i)-4,y:494-Math.min(30,4+Math.abs(c.close-c.open)*3),width:8,height:Math.min(30,4+Math.abs(c.close-c.open)*3),fill:color,"fill-opacity":.3},group);
    return { group, wick, body, volume };
  });
  const markers = proSignals.map(({index, buy}) => ({index, node: label(X(index), Y(buy ? candles[index].low : candles[index].high) + (buy ? 12 : -12), buy ? "BUY" : "SELL", buy ? GREEN : RED, rolling, !buy)}));
  const plans = proSignals.map(signal => {
    const group = element("g", {}, plot), left = X(signal.index), right = 948;
    const zones: Element[] = [];
    const lines: Element[] = [];
    const zone = (a: number, b: number, color: string) => zones.push(element("rect", {x:left,y:Math.min(Y(a),Y(b)),width:right-left,height:Math.abs(Y(a)-Y(b)),fill:color,"fill-opacity":.14},group));
    zone(signal.entry,signal.stop,RED); zone(signal.entry,signal.tp2,GREEN);
    const tags = [
      {name:"SL",price:signal.stop,color:RED},
      {name:"ENTRY",price:signal.entry,color:signal.buy?GREEN:RED},
      {name:"TP1",price:signal.tp1,color:GREEN},
      {name:"TP2",price:signal.tp2,color:GREEN},
    ].map(({name,price,color}) => {
      const y = Y(price);
      // Keep nearby scalping targets legible while connectors retain their exact price levels.
      const rank = signal.buy ? {SL:3,ENTRY:2,TP1:1,TP2:0} : {SL:0,ENTRY:1,TP1:2,TP2:3};
      const tagY = mode === "scalp" ? Math.min(Y(signal.stop),Y(signal.tp2)) + rank[name as keyof typeof rank]*27 : y;
      lines.push(element("path",{d:`M${left} ${y} H${right}`,stroke:color,"stroke-width":1.1},group));
      element("path",{d:`M${right} ${y} L${right+8} ${tagY-11} h49 v22 h-49 Z`,fill:color},group);
      return element("text",{x:right+30,y:tagY+4,"text-anchor":"middle",fill:"white","font-weight":700,"font-size":10},group,name);
    });
    return {group,tags,zones,lines,signal};
  });
  const chrome = [...svg.children].filter(node=>node!==svg.firstElementChild&&node!==defs&&node!==plot);
  const priceLine = element("path", { stroke: UP, "stroke-width": .7, "stroke-dasharray": "2 3" }, plot);
  const priceBox = element("rect", { x: 1027, width: 87, height: 23, fill: UP });
  const priceText = element("text", { x: 1070, fill: "white", "text-anchor": "middle", "font-size": 12, "font-weight": 700 });
  const dashboard = element("g", { transform: "translate(866 83)" });
  const rows = [`Darth Algo ${options.pro ? "Pro" : profile.label}`, "Trend", "Signal", "RSI", "Volatility", "Risk/Reward"];
  const values = rows.map((title, i) => {
    element("rect", { y: i * 23, width: 242, height: 23, fill: i === 0 ? "#252a33" : "#363b47", stroke: "#1e222b", "stroke-width": .8 }, dashboard);
    element("path", { d: `M137 ${i * 23} v23`, stroke: "#1e222b" }, dashboard);
    element("text", { x: 129, y: i * 23 + 16, "text-anchor": "end", fill: "#e1e3e8", "font-size": 12, "font-weight": 600 }, dashboard, title);
    return element("text", { x: 190, y: i * 23 + 16, "text-anchor": "middle", fill: i ? GREEN : "#a8adb6", "font-size": 12, "font-weight": 600 }, dashboard, i === 0 ? profile.label : "—");
  });
  let current = 0, playback = 1, disposed = false;
  let frame: number[] | null = null;
  let lastRender = 0;
  const linePath = (points: typeof cloud) => points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.fast}`).join(" ");
  const cloudPath = (points: typeof cloud) => points.length ? linePath(points) + points.slice().reverse().map(p=>` L${p.x} ${p.slow}`).join("") + " Z" : "";
  const render = (progress: number, demoProgress = 1, still = false) => {
    if (disposed) return;
    current = progress; playback = demoProgress;
    const state = proSimulation(demoProgress, mode), visible = state.visible;
    const feature = chapterAt(progress), scroll = (visible - 42) * 12.2;
    svg.dataset.feature = String(feature);
    rolling.setAttribute("transform",`translate(${-scroll} 0)`);
    grid.setAttribute("transform",`translate(${-scroll} 0)`);
    const show = (node: Element, yes: boolean) => node.setAttribute("visibility",yes?"visible":"hidden");
    chrome.forEach(node=>show(node,feature===0 && !options.compact));
    timeLabels.forEach((node,i)=>{
      const minutes = 9*60 + (Math.floor(scroll/122)+i)*10*profile.minutes;
      node.textContent = `${String(Math.floor(minutes/60)%24).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
      node.setAttribute("x",String(40+i*122-scroll%122));
    });
    show(plot,feature!==4); show(dashboard,!options.compact && (feature===0||feature===4));
    show(priceBox,feature===0 && !options.compact); show(priceText,feature===0 && !options.compact); show(priceLine,feature!==4);

    const activeSignal = proSignals[state.active];
    svg.dataset.plan = String(state.active); svg.dataset.tp1 = String(state.tp1Hit); svg.dataset.tp2 = String(state.tp2Hit);
    svg.dataset.playback = String(demoProgress);
    const index = Math.min(75, Math.max(0, Math.ceil(visible) - 1));
    bars.forEach(({group, wick, body, volume}, i) => {
      const c = candles[i], growth = Math.min(1, Math.max(0, visible - i));
      group.setAttribute("visibility", growth > 0 ? "visible" : "hidden");
      const tick = proCandleTick(c,growth), close = tick.price;
      const color = close >= c.open ? UP : RED; body.setAttribute("fill",color); wick.setAttribute("stroke",color);
      group.setAttribute("opacity",feature===1?".35":"1");
      show(volume,feature===0 && growth>0);
      body.setAttribute("y", String(Math.min(Y(c.open), Y(close)))); body.setAttribute("height", String(Math.max(1, Math.abs(Y(close) - Y(c.open)))));
      wick.setAttribute("d", `M${X(i)} ${Y(tick.high)} V${Y(tick.low)}`);
    });
    const points = cloud.slice(0, index + 1), bullish = points.filter(p=>p.x <= X(60)), bearish = points.filter(p=>p.x >= X(60));
    bullishCloud.setAttribute("d", cloudPath(bullish)); bearishCloud.setAttribute("d", cloudPath(bearish));
    bullishLine.setAttribute("d", linePath(bullish)); bearishLine.setAttribute("d", linePath(bearish));
    show(trend,feature===0||feature===1);
    // The same confirmation threshold reveals the signal and its complete plan.
    markers.forEach(({index:i,node})=>node.setAttribute("opacity",visible >= i+1 && (feature===0||feature===2) ? "1" : "0"));
    plans.forEach(({group,tags,zones,lines,signal},i)=>{
      const left = X(signal.index)-scroll;
      zones.forEach(zone=>{zone.setAttribute("x",String(left));zone.setAttribute("width",String(948-left));});
      [signal.stop,signal.entry,signal.tp1,signal.tp2].forEach((price,j)=>lines[j].setAttribute("d",`M${left} ${Y(price)} H948`));
      group.setAttribute("opacity",state.active === i && (feature===0||feature===3) ? "1" : "0");
      tags[2].textContent = state.active === i && state.tp1Hit ? "TP1 ✓" : "TP1";
      tags[3].textContent = state.active === i && state.tp2Hit ? "TP2 ✓" : "TP2";
    });
    const price = state.price;
    ohlc.textContent = `O ${candles[index].open.toFixed(1)}  C ${price.toFixed(1)}`;
    priceLine.setAttribute("stroke",price>=candles[index].open?UP:RED); priceBox.setAttribute("fill",price>=candles[index].open?UP:RED);
    priceLine.setAttribute("d", `M0 ${Y(price)} H1025`); priceBox.setAttribute("y", String(Y(price)-11)); priceText.setAttribute("y", String(Y(price)+5)); priceText.textContent = price.toLocaleString("en-US", {minimumFractionDigits:1,maximumFractionDigits:1});
    const bullishBias = activeSignal ? activeSignal.buy : true;
    values[1].textContent = bullishBias ? "BULLISH" : "BEARISH"; values[1].setAttribute("fill",bullishBias?GREEN:RED);
    values[2].textContent = activeSignal ? activeSignal.buy ? "BUY" : "SELL" : "WAIT"; values[2].setAttribute("fill",activeSignal && !activeSignal.buy?RED:GREEN);
    values[3].textContent = ((bullishBias?58:42) + Math.sin(index*.5)*7).toFixed(2);
    values[4].textContent = "NORMAL"; values[4].setAttribute("fill", "#e1e3e8");
    values[5].textContent = activeSignal ? `1:${profile.target2/profile.risk}` : "—";
    svg.style.opacity = String(Math.min(smooth(0,.025,demoProgress),1-smooth(.96,1,demoProgress)));
    const signal = activeSignal ?? proSignals[0];
    const destination = options.compact ? [320,155,710,355] : proFocusFrame(feature,host.clientWidth<640,X(index)-scroll,Y(price),X(signal.index)-scroll,Y(signal.entry),Math.min(Y(signal.stop),Y(signal.tp2)));
    const now = performance.now(), blend = 1-Math.exp(-Math.min(80,now-lastRender)/100); lastRender=now;
    frame = frame && !still ? frame.map((value,i)=>value+(destination[i]-value)*blend) : destination;
    svg.setAttribute("viewBox",frame.map(value=>value.toFixed(2)).join(" "));
    svg.style.transform = "none";
  };
  const resize = () => { frame=null; render(current,playback); };
  resize();
  return {render,resize,dispose:()=>{disposed=true; svg.remove(); delete host.dataset.renderer;}};
}
