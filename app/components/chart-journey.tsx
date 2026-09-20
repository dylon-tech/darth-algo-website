"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { chapterAt, chapterProgress, journeyProgress, smooth, setupPlayback } from "./chart-journey-math";
import type { ChartWorld } from "./chart-world";
import type { EngineScene } from "./immersive-engine";

const colors = { red: "#ff4c65", swing: "#58afff", scalp: "#ffa64e", pro: "#b48aff" };
const chapters = ["The chart", "Trend", "Signals", "Risk", "Your move"];
const defaultCopy = [
  { title: "Step inside the chart.", copy: "One chart. Three layers of clarity. Scroll to see how they fit together." },
  { title: "Find the direction.", copy: "Trend context comes forward, helping you see beyond the next candle." },
  { title: "Bring the setup into focus.", copy: "Signal markers add a point of reference. You decide whether the context fits." },
  { title: "Define the risk first.", copy: "Entry, stop and targets form a visible plan before you make your move." },
  { title: "Now, make it your chart.", copy: "Explore the real Darth Algo tools on TradingView. Choose the pace that fits you." },
];

export default function ChartJourney({ scenes, accent = "red" }: { scenes: EngineScene[]; accent?: keyof typeof colors }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const world = useRef<ChartWorld | null>(null);
  const playback = useRef(1);
  const played = useRef(false);
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
  const copy = active > 0 && active < 4 && accent !== "red" ? scenes[active - 1] : defaultCopy[active];
  const proof = scenes[Math.min(2, Math.max(0, active - 1))];
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setMotion(!preference.matches);
    change(); preference.addEventListener("change", change);
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNearby(true); observer.disconnect(); } }, { rootMargin: "450px" });
    if (root.current) observer.observe(root.current);
    return () => { preference.removeEventListener("change", change); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (!nearby || !motion || failed || !canvas.current) return;
    const host = canvas.current;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    import("./chart-world").then(({ createChartWorld }) => {
      if (cancelled) return;
      try {
        world.current = createChartWorld(host, colors[accent], () => { setFailed(true); setReady(false); });
        world.current.render(current.current, playback.current); setReady(true);
        observer = new ResizeObserver(() => world.current?.resize()); observer.observe(host);
        requestFrame.current();
      } catch { setFailed(true); setReady(false); }
    }).catch(() => { if (!cancelled) { setFailed(true); setReady(false); } });
    return () => { cancelled = true; observer?.disconnect(); world.current?.dispose(); world.current = null; setReady(false); };
  }, [nearby, motion, failed, accent]);
  useEffect(() => {
    if (!motion || failed) { playing.current = false; playback.current = 1; setIsPlaying(false); }
    const section = root.current, viewport = stage.current;
    if (!section || !viewport) return;
    let frame = 0;
    let lastFrame = 0;
    let visible = false;
    const paint = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      const now = performance.now();
      const elapsed = lastFrame ? Math.min(250, now - lastFrame) : 16;
      lastFrame = now;
      const difference = target.current - current.current;
      current.current = Math.abs(difference) < .0002 || !motion ? target.current : current.current + difference * (1 - Math.exp(-elapsed / 100));
      const value = current.current;
      if (motion && world.current && !played.current && value >= .37 && value < .81) {
        played.current = true; playing.current = true; playback.current = 0; setIsPlaying(true);
      }
      if (playing.current && motion && world.current) {
        playback.current = Math.min(1, playback.current + elapsed / 12000);
        if (playback.current === 1 || target.current >= .81 || target.current < .32) {
          playing.current = false; playback.current = 1; setIsPlaying(false);
        }
      }
      world.current?.render(value, playback.current);
      if (playbackStatus.current) playbackStatus.current.textContent = playing.current ? setupPlayback(playback.current).phase : "Watch a setup unfold";
      section.style.setProperty("--journey-progress", String(value));
      section.style.setProperty("--proof-reveal", String(smooth(.81, .92, value)));
      const next = chapterAt(value);
      if (next !== activeRef.current) { activeRef.current = next; setActive(next); }
      if (Math.abs(target.current - value) > .0002 || playing.current) frame = requestAnimationFrame(paint);
    };
    const schedule = () => { if (visible && !document.hidden && !frame) frame = requestAnimationFrame(paint); };
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
  }, [motion, failed]);
  const select = (index: number) => {
    const progress = chapterProgress[index];
    target.current = progress;
    if (motion && !failed && root.current && stage.current) {
      const section = root.current;
      window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - 72 + progress * (section.offsetHeight - stage.current.offsetHeight), behavior: "instant" });
    }
    requestFrame.current();
  };
  const replay = () => {
    if (playing.current) { playing.current = false; playback.current = 1; setIsPlaying(false); }
    else { played.current = true; playing.current = true; playback.current = 0; setIsPlaying(true); select(3); }
    requestFrame.current();
  };
  const toggleMotion = () => {
    playing.current = false; playback.current = 1; setIsPlaying(false);
    const top = root.current ? window.scrollY + root.current.getBoundingClientRect().top - 72 : window.scrollY;
    setMotion(value => !value);
    // Keep the selected tour on screen when its long scroll track collapses.
    requestAnimationFrame(() => window.scrollTo({ top, behavior: "instant" }));
  };
  return (
    <>
    <section ref={root} id="inside-the-engine" className={`chart-journey immersion-${accent}`} data-animated={motion && !failed} data-ready={ready} data-chapter={active} aria-label="Darth Algo 3D product tour">
      <div ref={stage} className="chart-journey-stage">
        <div className="journey-topline"><span>DARTH ALGO / THE INTERACTIVE TOUR</span><a href="#journey-finish">Skip to the tools ↗</a></div>
        <div className="journey-heading" key={active}>
          <p className="journey-kicker">0{active + 1} <span>/</span> {chapters[active]}</p>
          <h2>{copy.title}</h2><p className="journey-copy">{active === 0 && (!motion || failed) ? "Tap a chapter to explore the actual indicator charts." : copy.copy}</p>
        </div>
        <div className="journey-world-wrap">
          <div className="journey-light journey-light-left" aria-hidden="true" /><div className="journey-light journey-light-right" aria-hidden="true" />
          <span className="journey-backdrop-word" aria-hidden="true">{active === 0 ? "CLARITY" : active === 1 ? "CONTEXT" : active === 2 ? "PRECISION" : active === 3 ? "CONTROL" : "DARTH ALGO"}</span>
          <div ref={canvas} className="journey-webgl" aria-hidden="true" />
          <div className="journey-layer-labels" aria-hidden="true"><span data-visible={active >= 1}>01 — Trend context</span><span data-visible={active >= 2}>02 — Signal markers</span><span data-visible={active >= 3}>03 — Risk plan</span></div>
          <div className="journey-proof" aria-hidden={ready && active !== 4}>
            <div className="journey-proof-bar"><span>DARTH ALGO / ACTUAL PRODUCT</span><span>TRADINGVIEW</span></div>
            <a href={proof.image} target="_blank" rel="noopener noreferrer" tabIndex={ready && active !== 4 ? -1 : 0} aria-label="Open the actual Darth Algo chart full-size"><Image src={proof.image} alt={proof.alt} fill sizes="(max-width: 768px) 90vw, 950px" className="object-contain" /></a>
            <p>Recorded chart example · Tap to inspect</p>
          </div>
        </div>
        <div className="journey-bottom">
          {ready && active !== 4 && <div className="journey-playback"><span ref={playbackStatus}>Watch a setup unfold</span><button type="button" onClick={replay} aria-label={isPlaying ? "Stop setup animation" : "Replay setup animation"}>{isPlaying ? "■ Stop demo" : "▶ Replay setup"}</button></div>}
          <div className="journey-chapters" role="group" aria-label="Tour chapters">{chapters.map((label, index) => <button key={label} type="button" onClick={() => select(index)} aria-pressed={active === index}><span>0{index + 1}</span>{label}<i /></button>)}</div>
          <div className="journey-caption"><span>{ready && active !== 4 ? "Simulated indicator walkthrough · Not live signals" : "Recorded product example · Not typical results"}</span><button type="button" onClick={toggleMotion} aria-pressed={motion && !failed} disabled={failed}>{failed ? "Still view" : motion ? "Motion on" : "Motion off"}</button></div>
        </div>
      </div>
    </section>
      <div id="journey-finish" className="journey-finish"><div><p className="immersion-eyebrow">Clarity is just the beginning.</p><h2>Your chart. Your next move.</h2></div><div><a href={accent === "red" ? "/products/swing" : "/#pricing"}>{accent === "red" ? "Explore Swing · 2 days free" : "Choose your plan"} <span>↗</span></a><a href="/links">Explore all Darth Algo links →</a></div></div>
    </>
  );
}
