"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { chapterAt, chapterProgress, journeyProgress } from "./chart-journey-math";
import { advanceProLoop, proSimulation, type IndicatorMode } from "./pro-chart-simulation";
import type { ChartWorld } from "./chart-world";
import type { EngineScene } from "./immersive-engine";

type TourAccent = "red" | "swing" | "scalp" | "pro";
const proChapters = ["Chart", "Trend", "Signals", "Risk", "Dashboard"];
const proCopy = [
  {title:"Your chart, in motion.",copy:"Pick a feature below to take a closer look."},
  {title:"Follow the trend cloud.",copy:"A close-up of the cloud as candles move through it."},
  {title:"Watch the signals appear.",copy:"BUY and SELL markers in their chart context."},
  {title:"See the complete risk plan.",copy:"Entry, stop and targets appear together at each signal."},
  {title:"Read the dashboard.",copy:"Trend, signal, RSI, volatility and risk/reward in one view."},
];
export default function ChartJourney({ scenes, accent = "red" }: { scenes: EngineScene[]; accent?: TourAccent }) {
  const isPro = accent === "red" || accent === "pro";
  const [mode, setMode] = useState<IndicatorMode>(accent === "scalp" ? "scalp" : "swing");
  const productName = isPro ? "Pro" : accent === "scalp" ? "Scalper" : "Swing";
  const purchaseHref = accent === "red" ? "#pricing" : accent === "swing" ? "/#swing-trial" : accent === "scalp" ? "/#scalper-plan" : "/#pro-plan";
  const paused = useRef(false);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const world = useRef<ChartWorld | null>(null);
  const playback = useRef(0);
  const playing = useRef(false);
  const playbackStatus = useRef<HTMLSpanElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const target = useRef(0);
  const current = useRef(0);
  const activeRef = useRef(0);
  const requestFrame = useRef<() => void>(() => {});
  const [active, setActive] = useState(0);
  const [motion, setMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nearby, setNearby] = useState(false);
  const copy = active === 0 ? {
    title: isPro ? "Two modes. One Pro." : mode === "swing" ? "Fewer signals. Broader moves." : "More signals. Faster setups.",
    copy: isPro ? "Switch between Swing and Scalp. Explore any feature below." : mode === "swing" ? "Follow broader trend setups at a steadier pace." : "See more frequent setups for a faster trading style.",
  } : proCopy[active];
  const proof = accent === "red" ? { image: "/indicator-examples/darth-algo-feature-map-03.png", alt: "Actual Darth Algo Pro reference showing SELL, SL, ENTRY, TP1 and TP2" } : scenes[Math.min(2, Math.max(0, active - 1))];
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setMotion(!preference.matches);
    change(); preference.addEventListener("change", change);
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNearby(true); observer.disconnect(); } }, { rootMargin: "450px" });
    if (root.current) observer.observe(root.current);
    return () => { preference.removeEventListener("change", change); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (!nearby || failed || !canvas.current) return;
    const host = canvas.current;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    import("./pro-chart-world").then(({ createProChartWorld }) => {
      if (cancelled) return;
      try {
        world.current = createProChartWorld(host, {mode, pro: isPro});
        world.current.render(current.current, playback.current, !motion); setReady(true);
        observer = new ResizeObserver(() => world.current?.resize()); observer.observe(host);
        requestFrame.current();
      } catch { setFailed(true); setReady(false); }
    }).catch(() => { if (!cancelled) { setFailed(true); setReady(false); } });
    return () => { cancelled = true; observer?.disconnect(); world.current?.dispose(); world.current = null; setReady(false); };
  }, [nearby, motion, failed, mode, isPro]);
  useEffect(() => {
    if (!motion || failed) { playing.current = false; playback.current = .38; setIsPlaying(false); }
    const section = root.current, viewport = stage.current;
    if (!section || !viewport) return;
    let frame = 0;
    let lastFrame = 0;
    let visible = false;
    const paint = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      const now = performance.now();
      const elapsed = lastFrame ? Math.max(0, now - lastFrame) : 16;
      lastFrame = now;
      const difference = target.current - current.current;
      current.current = Math.abs(difference) < .0002 || !motion ? target.current : current.current + difference * (1 - Math.exp(-elapsed / 100));
      const value = current.current;
      {
        const run = !!(motion && world.current && !paused.current);
        if (playing.current !== run) { playing.current = run; setIsPlaying(run); }
        if (run) playback.current = advanceProLoop(playback.current, elapsed);
      }
      world.current?.render(value, playback.current, !motion);
      if (playbackStatus.current) playbackStatus.current.textContent = proSimulation(playback.current, mode).phase;
      section.style.setProperty("--journey-progress", String(value));
      section.style.setProperty("--proof-reveal", "0");
      const next = chapterAt(value);
      if (next !== activeRef.current) { activeRef.current = next; setActive(next); }
      if (Math.abs(target.current - value) > .0002 || playing.current) frame = requestAnimationFrame(paint);
    };
    const schedule = () => { if (visible && !document.hidden && !frame) { lastFrame = 0; frame = requestAnimationFrame(paint); } };
    requestFrame.current = schedule;
    const readScroll = () => {
      if (motion && !failed) target.current = journeyProgress(section.getBoundingClientRect().top, section.offsetHeight, viewport.offsetHeight);
      schedule();
    };
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { lastFrame = 0; readScroll(); } else { cancelAnimationFrame(frame); frame = 0; } });
    intersection.observe(section);
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else { lastFrame = 0; readScroll(); } };
    window.addEventListener("scroll", readScroll, { passive: true }); window.addEventListener("resize", readScroll); document.addEventListener("visibilitychange", visibility);
    return () => { intersection.disconnect(); cancelAnimationFrame(frame); requestFrame.current = () => {}; window.removeEventListener("scroll", readScroll); window.removeEventListener("resize", readScroll); document.removeEventListener("visibilitychange", visibility); };
  }, [motion, failed, mode]);
  const select = (index: number) => {
    const progress = chapterProgress[index];
    target.current = progress;
    if (motion && !failed && root.current && stage.current) {
      const section = root.current;
      window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - 72 + progress * (section.offsetHeight - stage.current.offsetHeight), behavior: "instant" });
    }
    requestFrame.current();
  };
  const replay = () => { paused.current = !paused.current; requestFrame.current(); };
  const changeMode = (next: IndicatorMode) => {
    if (next === mode) return;
    playback.current = motion ? 0 : .38;
    setMode(next);
  };
  const toggleMotion = () => {
    playing.current = false; playback.current = 0; paused.current = false; setIsPlaying(false);
    const top = root.current ? window.scrollY + root.current.getBoundingClientRect().top - 72 : window.scrollY;
    setMotion(value => !value);
    // Keep the selected tour on screen when its long scroll track collapses.
    requestAnimationFrame(() => window.scrollTo({ top, behavior: "instant" }));
  };
  return (
    <>
    <section ref={root} id="inside-the-engine" className={`chart-journey immersion-${accent}`} data-pro="true" data-mode={mode} data-product={productName} data-toggle={isPro} data-animated={motion && !failed} data-ready={ready} data-chapter={active} aria-label={`Darth Algo ${productName} interactive product tour`}>
      <div ref={stage} className="chart-journey-stage">
        <div className="journey-topline"><span>DARTH ALGO / {productName.toUpperCase()} DEMO</span><a href={purchaseHref}>Skip to the tools ↗</a></div>
        <div className="journey-heading" key={active}>
          <p className="journey-kicker">0{active + 1} <span>/</span> {proChapters[active]}</p>
          <h2>{copy.title}</h2><p className="journey-copy">{copy.copy}</p>
        </div>
        <div className="journey-world-wrap">
          <div className="journey-light journey-light-left" aria-hidden="true" /><div className="journey-light journey-light-right" aria-hidden="true" />
          <span className="journey-backdrop-word" aria-hidden="true">{active === 0 ? "CLARITY" : active === 1 ? "CONTEXT" : active === 2 ? "PRECISION" : active === 3 ? "CONTROL" : "DARTH ALGO"}</span>
          <div ref={canvas} className="journey-webgl" aria-hidden="true" />
          <div className="journey-layer-labels" aria-hidden="true"><span data-visible={active >= 1}>01 — Trend context</span><span data-visible={active >= 2}>02 — Signal markers</span><span data-visible={active >= 3}>03 — Risk plan</span></div>
          <div className="journey-proof" aria-hidden={ready}>
            <div className="journey-proof-bar"><span>DARTH ALGO / ACTUAL PRODUCT</span><span>TRADINGVIEW</span></div>
            <a href={proof.image} target="_blank" rel="noopener noreferrer" tabIndex={ready ? -1 : 0} aria-label="Open the actual Darth Algo chart full-size"><Image src={proof.image} alt={proof.alt} fill sizes="(max-width: 768px) 90vw, 950px" className="object-contain" /></a>
            <p>Recorded chart example · Tap to inspect</p>
          </div>
        </div>
        <div className="journey-bottom">
          {isPro && <div className="journey-modes" role="group" aria-label="Pro trading mode"><span>PRO MODE</span><button type="button" onClick={() => changeMode("swing")} aria-pressed={mode === "swing"}>Swing</button><button type="button" onClick={() => changeMode("scalp")} aria-pressed={mode === "scalp"}>Scalp</button></div>}
          {ready && motion && <div className="journey-playback"><span ref={playbackStatus}>Watch a setup unfold</span><button type="button" onClick={replay} aria-label={isPlaying ? "Pause demo animation" : "Resume demo animation"}>{isPlaying ? "Ⅱ Pause demo" : "▶ Resume demo"}</button></div>}
          <div className="journey-chapters" role="group" aria-label="Tour chapters">{proChapters.map((label, index) => <button key={label} type="button" onClick={() => select(index)} aria-pressed={active === index}><span>0{index + 1}</span>{label}<i /></button>)}</div>
          <div className="journey-caption"><span>{ready ? "Scripted winning example · Real trades can lose" : "Recorded product example · Not typical results"}</span><button type="button" onClick={toggleMotion} aria-pressed={motion && !failed} disabled={failed}>{failed ? "Still view" : motion ? "Motion on" : "Motion off"}</button></div>
        </div>
      </div>
    </section>
      <div id="journey-finish" className="journey-finish"><div><p className="immersion-eyebrow">Clarity is just the beginning.</p><h2>Your chart. Your next move.</h2></div><div><a href={purchaseHref}>{accent === "red" ? "Choose your tool" : `Get ${productName} access`} <span>↗</span></a><a href="/links">Explore all Darth Algo links →</a></div></div>
    </>
  );
}
