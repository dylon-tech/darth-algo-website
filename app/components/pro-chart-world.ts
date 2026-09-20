import { smooth } from "./chart-journey-math";
import { proCandles as candles, proSignals, proSimulation } from "./pro-chart-simulation";
import type { ChartWorld } from "./chart-world";

// Visual reconstruction from the site's Darth Algo Pro feature-map references.
// Prices and timing are deterministic illustrations, not Pine Script output.
const NS = "http://www.w3.org/2000/svg";
const GREEN = "#4caf50", RED = "#ff304b", UP = "#00a995";
const X = (i: number) => 26 + i * 12.2;
const Y = (price: number) => 475 - (price - 4430) * 2.25;
const cloud = candles.map((c, i) => ({ x: X(i), fast: Y((c.open + c.close) / 2 + (i < 60 ? -7 : 7)), slow: Y((c.open + c.close) / 2 + (i < 60 ? -20 : 20)) }));

export function createProChartWorld(host: HTMLElement): ChartWorld {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 1120 540"); svg.setAttribute("aria-hidden", "true");
  svg.classList.add("pro-chart-simulation");
  host.dataset.renderer = "pro-chart"; host.appendChild(svg);
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
  element("rect", { width: 1120, height: 540, rx: 3, fill: "#141923", stroke: "#303541" });
  const plot = element("g", {});
  for (let i = 0; i < 8; i++) element("rect", { x: i * 130, y: 38, width: 83, height: 462, fill: "#182238" }, plot);
  for (let y = 58; y < 501; y += 34) element("path", { d: `M0 ${y} H1020`, stroke: "#ffffff", "stroke-opacity": .075, "stroke-width": .7 }, plot);
  for (let x = 28; x < 1020; x += 49) element("path", { d: `M${x} 38 V500`, stroke: "#ffffff", "stroke-opacity": .075, "stroke-width": .7 }, plot);
  element("rect", { x: 0, y: 0, width: 1120, height: 37, fill: "#11161f" });
  element("text", { x: 16, y: 24, fill: "#b6bac4", "font-size": 13 }, svg, "Micro Gold Futures · 30 · COMEX");
  element("text", { x: 1104, y: 23, "text-anchor": "end", fill: "#c0a2ff", "font-size": 11, "font-weight": 700 }, svg, "PRO / SCRIPTED WINNING EXAMPLE");
  for (let p = 4440; p <= 4600; p += 20) element("text", { x: 1036, y: Y(p) + 4, fill: "#a9aeb8", "font-size": 12 }, svg, `${p.toLocaleString("en-US")}.0`);
  ["09:00", "12:00", "15:00", "18:00", "21:00", "00:00", "03:00", "06:00"].forEach((text, i) => element("text", { x: 28 + i * 130, y: 523, fill: "#a9aeb8", "font-size": 11 }, svg, text));
  const trend = element("g", {}, plot);
  const bullishCloud = element("path", { fill: GREEN, "fill-opacity": .24 }, trend);
  const bearishCloud = element("path", { fill: RED, "fill-opacity": .24 }, trend);
  const bullishLine = element("path", { fill: "none", stroke: GREEN, "stroke-width": 1.8 }, trend);
  const bearishLine = element("path", { fill: "none", stroke: RED, "stroke-width": 1.8 }, trend);
  const bars = candles.map((c, i) => {
    const group = element("g", {}, plot), color = c.close >= c.open ? UP : RED;
    const wick = element("path", { stroke: color, "stroke-width": .8 }, group);
    const body = element("rect", { x: X(i) - 4, width: 8, fill: color }, group);
    return { group, wick, body };
  });
  const markers = proSignals.map(({index, buy}) => ({index, node: label(X(index), Y(buy ? candles[index].low : candles[index].high) + (buy ? 12 : -12), buy ? "BUY" : "SELL", buy ? GREEN : RED, plot, !buy)}));
  const plans = proSignals.map(signal => {
    const group = element("g", {}, plot), left = X(signal.index), right = 948;
    const zone = (a: number, b: number, color: string) => element("rect", {x:left,y:Math.min(Y(a),Y(b)),width:right-left,height:Math.abs(Y(a)-Y(b)),fill:color,"fill-opacity":.14},group);
    zone(signal.entry,signal.stop,RED); zone(signal.entry,signal.tp2,GREEN);
    const tags = [
      {name:"SL",price:signal.stop,color:RED},
      {name:"ENTRY",price:signal.entry,color:signal.buy?GREEN:RED},
      {name:"TP1",price:signal.tp1,color:GREEN},
      {name:"TP2",price:signal.tp2,color:GREEN},
    ].map(({name,price,color}) => {
      const y = Y(price);
      element("path",{d:`M${left} ${y} H${right}`,stroke:color,"stroke-width":1.1},group);
      element("path",{d:`M${right} ${y} l8 -11 h49 v22 h-49 Z`,fill:color},group);
      return element("text",{x:right+30,y:y+4,"text-anchor":"middle",fill:"white","font-weight":700,"font-size":10},group,name);
    });
    return {group,tags};
  });
  const priceLine = element("path", { stroke: UP, "stroke-width": .7, "stroke-dasharray": "2 3" }, plot);
  const priceBox = element("rect", { x: 1027, width: 87, height: 23, fill: UP });
  const priceText = element("text", { x: 1070, fill: "white", "text-anchor": "middle", "font-size": 12, "font-weight": 700 });
  const dashboard = element("g", { transform: "translate(866 47)" });
  const rows = ["Darth Algo AI", "Trend", "Signal", "RSI", "Volatility", "Risk/Reward"];
  const values = rows.map((title, i) => {
    element("rect", { y: i * 23, width: 242, height: 23, fill: i === 0 ? "#252a33" : "#363b47", stroke: "#1e222b", "stroke-width": .8 }, dashboard);
    element("path", { d: `M137 ${i * 23} v23`, stroke: "#1e222b" }, dashboard);
    element("text", { x: 129, y: i * 23 + 16, "text-anchor": "end", fill: "#e1e3e8", "font-size": 12, "font-weight": 600 }, dashboard, title);
    return element("text", { x: 190, y: i * 23 + 16, "text-anchor": "middle", fill: i ? GREEN : "#a8adb6", "font-size": 12, "font-weight": 600 }, dashboard, i === 0 ? "V1.7" : "—");
  });
  let current = 0, playback = 1, disposed = false;
  const linePath = (points: typeof cloud) => points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.fast}`).join(" ");
  const cloudPath = (points: typeof cloud) => points.length ? linePath(points) + points.slice().reverse().map(p=>` L${p.x} ${p.slow}`).join("") + " Z" : "";
  const render = (progress: number, demoProgress = 1) => {
    if (disposed) return;
    current = progress; playback = demoProgress;
    const state = proSimulation(demoProgress), visible = state.visible;
    const activeSignal = proSignals[state.active];
    svg.dataset.plan = String(state.active); svg.dataset.tp1 = String(state.tp1Hit); svg.dataset.tp2 = String(state.tp2Hit);
    svg.dataset.playback = String(demoProgress);
    const index = Math.min(75, Math.max(0, Math.ceil(visible) - 1));
    bars.forEach(({group, wick, body}, i) => {
      const c = candles[i], growth = Math.min(1, Math.max(0, visible - i));
      group.setAttribute("visibility", growth > 0 ? "visible" : "hidden");
      const close = c.open + (c.close - c.open) * growth;
      body.setAttribute("y", String(Math.min(Y(c.open), Y(close)))); body.setAttribute("height", String(Math.max(1, Math.abs(Y(close) - Y(c.open)))));
      wick.setAttribute("d", `M${X(i)} ${Y(c.open + (c.high - c.open) * growth)} V${Y(c.open + (c.low - c.open) * growth)}`);
    });
    const points = cloud.slice(0, index + 1), bullish = points.filter(p=>p.x <= X(60)), bearish = points.filter(p=>p.x >= X(60));
    bullishCloud.setAttribute("d", cloudPath(bullish)); bearishCloud.setAttribute("d", cloudPath(bearish));
    bullishLine.setAttribute("d", linePath(bullish)); bearishLine.setAttribute("d", linePath(bearish));
    trend.setAttribute("opacity", "1");
    // The same confirmation threshold reveals the signal and its complete plan.
    markers.forEach(({index:i,node})=>node.setAttribute("opacity",visible >= i+1 ? "1" : "0"));
    plans.forEach(({group,tags},i)=>{
      group.setAttribute("opacity",state.active === i ? "1" : "0");
      tags[2].textContent = state.active === i && state.tp1Hit ? "TP1 ✓" : "TP1";
      tags[3].textContent = state.active === i && state.tp2Hit ? "TP2 ✓" : "TP2";
    });
    const c = candles[index], growth = Math.min(1, Math.max(0, visible-index)), price = c.open + (c.close-c.open)*growth;
    priceLine.setAttribute("d", `M0 ${Y(price)} H1025`); priceBox.setAttribute("y", String(Y(price)-11)); priceText.setAttribute("y", String(Y(price)+5)); priceText.textContent = price.toLocaleString("en-US", {minimumFractionDigits:1,maximumFractionDigits:1});
    const bullishBias = state.active < 1;
    values[1].textContent = bullishBias ? "BULLISH" : "BEARISH"; values[1].setAttribute("fill",bullishBias?GREEN:RED);
    values[2].textContent = activeSignal ? activeSignal.buy ? "BUY" : "SELL" : "WAIT"; values[2].setAttribute("fill",activeSignal && !activeSignal.buy?RED:GREEN);
    values[3].textContent = ((bullishBias?58:42) + Math.sin(index*.5)*7).toFixed(2);
    values[4].textContent = "NORMAL"; values[4].setAttribute("fill", "#e1e3e8");
    values[5].textContent = activeSignal ? "1:1.5" : "—";
    svg.style.opacity = String(Math.min(smooth(0,.025,demoProgress),1-smooth(.96,1,demoProgress)));
    // A dimensional approach settles to a legible chart as the setup develops.
    const settle = smooth(.1, .7, progress);
    svg.style.transform = `perspective(1400px) rotateX(${12 * (1-settle)}deg) rotateY(${-17 * (1-settle)}deg) scale(${.86 + .14*settle})`;
  };
  const resize = () => {
    const narrow = host.clientWidth < 640;
    svg.setAttribute("viewBox", narrow ? "430 0 690 540" : "0 0 1120 540");
    svg.style.aspectRatio = narrow ? "690 / 540" : "1120 / 540";
    render(current, playback);
  };
  resize();
  return {render,resize,dispose:()=>{disposed=true; svg.remove(); delete host.dataset.renderer;}};
}
