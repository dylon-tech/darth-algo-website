"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { advanceProLoop, proSimulation } from "./pro-chart-simulation";
import type { ChartWorld } from "./chart-world";

/** A small, explicitly scripted trade preview. No market data or performance claims. */
export default function HeroTradeDemo() {
  const host = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const playback = useRef(.07);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let world: ChartWorld | undefined, frame = 0, previous = 0, visible = false, cancelled = false;
    const paint = (now: number) => {
      frame = 0;
      if (!world || !visible || document.hidden) return;
      const still = preference.matches || paused;
      if (!still) playback.current = advanceProLoop(playback.current, previous ? now - previous : 0);
      previous = now;
      const progress = preference.matches ? .38 : playback.current;
      world.render(0, progress, true);
      if (status.current) status.current.textContent = proSimulation(progress).phase;
      if (!still) frame = requestAnimationFrame(paint);
    };
    const schedule = () => { previous = 0; if (!frame && !document.hidden) frame = requestAnimationFrame(paint); };
    const onPreference = () => { setReduced(preference.matches); schedule(); };
    onPreference();
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule(); else { cancelAnimationFrame(frame); frame = 0; }
    });
    intersection.observe(element);
    const resize = new ResizeObserver(() => { world?.resize(); schedule(); }); resize.observe(element);
    const visibility = () => { cancelAnimationFrame(frame); frame = 0; if (!document.hidden) schedule(); };
    document.addEventListener("visibilitychange", visibility);
    preference.addEventListener("change", onPreference);
    import("./pro-chart-world").then(({ createProChartWorld }) => {
      if (cancelled) return;
      world = createProChartWorld(element, { mode: "swing", pro: true, compact: true });
      world.render(0, preference.matches ? .38 : playback.current, true);
      setReady(true); schedule();
    }).catch(() => { if (!cancelled) setReady(false); });
    return () => {
      cancelled = true; cancelAnimationFrame(frame); intersection.disconnect(); resize.disconnect();
      preference.removeEventListener("change", onPreference); document.removeEventListener("visibilitychange", visibility);
      world?.dispose();
    };
  }, [paused]);
  return <figure className="hero-trade-demo" aria-label="Darth Algo Pro simulated trade demonstration">
    <div className="hero-trade-title"><span><Image src="/darth-algo-icon.svg" alt="" width={28} height={28} /> DARTH ALGO <b>PRO</b></span><span className="hero-demo-badge">SCRIPTED DEMO</span></div>
    <div className="hero-trade-screen">
      <div ref={host} className="hero-trade-canvas" aria-hidden="true" />
      {!ready && <Image src="/indicator-examples/darth-algo-feature-map-03.png" alt="Recorded Darth Algo chart showing a signal, entry, stop and targets" fill priority sizes="(max-width: 767px) 90vw, 650px" className="object-contain" />}
    </div>
    <div className="hero-trade-status"><span ref={status}>Signal → entry & stop → targets</span>{ready && !reduced && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Play hero trade demo" : "Pause hero trade demo"}>{paused ? "▶ Play" : "Ⅱ Pause"}</button>}</div>
    <figcaption>Scripted winning example · Real trades can lose</figcaption>
  </figure>;
}
