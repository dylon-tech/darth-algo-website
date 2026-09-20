"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type EngineScene = { label: string; title: string; copy: string; image: string; alt: string };
export const engineScenes: EngineScene[] = [
  { label: "Trend", title: "First, find the direction.", copy: "See the broader market context before you focus on a single signal.", image: "/indicators/swing-trend-cloud.png", alt: "Recorded Darth Algo trend cloud on a TradingView chart" },
  { label: "Signals", title: "Then, see the setup.", copy: "Bring buy and sell markers into the picture. Evaluate the context behind each one.", image: "/indicators/signal-context-alt.png", alt: "Recorded Darth Algo buy and sell markers with trend context" },
  { label: "Risk", title: "Know your boundaries.", copy: "Keep entry, stop and targets in view. Decide whether the plan fits before taking a trade.", image: "/indicators/swing-risk-plan.png", alt: "Recorded Darth Algo entry, stop and two target levels" },
];

type Props = { accent?: "red" | "swing" | "scalp" | "pro"; image?: string; alt?: string; compact?: boolean; active?: number; priority?: boolean };

/** Native perspective scene: no video downloads, WebGL runtime or scroll interception. */
export default function ImmersiveEngine({ accent = "red", image = "/indicators/swing-overview.png", alt = "Recorded Darth Algo Swing indicator chart", compact = false, active = 0, priority = false }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const node = root.current;
    if (!node || !motion || paused) return;
    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - rect.top - rect.height / 2) / window.innerHeight));
      node.style.setProperty("--camera-scroll", `${progress * 11}deg`);
    };
    const schedule = () => { if (visible && !frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); });
    observer.observe(node);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      node.style.removeProperty("--camera-scroll");
      node.style.removeProperty("--camera-x");
      node.style.removeProperty("--camera-y");
    };
  }, [motion, paused]);
  return (
    <div ref={root} className={`immersion-engine immersion-${accent}${compact ? " immersion-compact" : ""}`} data-active={active} data-motion={motion && !paused}
      onPointerMove={(event) => {
        if (!motion || paused || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--camera-x", `${((event.clientX - bounds.left) / bounds.width - .5) * 9}deg`);
        event.currentTarget.style.setProperty("--camera-y", `${((event.clientY - bounds.top) / bounds.height - .5) * -7}deg`);
      }}
      onPointerLeave={(event) => { event.currentTarget.style.setProperty("--camera-x", "0deg"); event.currentTarget.style.setProperty("--camera-y", "0deg"); }}>
      <div className="immersion-atmosphere" aria-hidden="true" />
      <div className="immersion-horizon" aria-hidden="true" />
      <div className="immersion-camera">
        <div className="immersion-orbit immersion-orbit-back" aria-hidden="true" />
        <div className="immersion-orbit immersion-orbit-front" aria-hidden="true" />
        <div className="immersion-orbit immersion-orbit-cross" aria-hidden="true" />
        <div className="immersion-ghost immersion-ghost-one" aria-hidden="true"><span>CONTEXT</span><i /><i /><i /></div>
        <div className="immersion-ghost immersion-ghost-two" aria-hidden="true"><span>STRUCTURE</span><i /><i /><i /></div>
        <div className="immersion-screen">
          <div className="immersion-screen-bar"><span><b /> DARTH ALGO</span><span>CHART STUDY / 0{active + 1}</span></div>
          <a href={image} target="_blank" rel="noopener noreferrer" className="immersion-chart" aria-label="Open full-size recorded indicator chart">
            <Image src={image} alt={alt} fill priority={priority} sizes={compact ? "(max-width: 640px) 80vw, 480px" : "(max-width: 768px) 88vw, 720px"} className="object-contain" />
          </a>
          <div className="immersion-screen-footer"><span>TRADINGVIEW INDICATOR</span><span>RECORDED EXAMPLE ↗</span></div>
        </div>
        <div className="immersion-chip immersion-chip-trend" aria-hidden="true"><span>01 / CONTEXT</span><strong>Trend intelligence</strong><div className="immersion-spark"><i /><i /><i /><i /><i /><i /><i /><i /></div></div>
        <div className="immersion-chip immersion-chip-risk" aria-hidden="true"><span>03 / PLAN</span><strong>Defined risk.</strong><div className="immersion-risk-lines"><i /><i /><i /></div></div>
      </div>
      <div className="immersion-scene-caption"><span>THE DARTH ALGO ENGINE</span>{motion && <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Enable motion" : "Pause motion"}</button>}</div>
    </div>
  );
}

export function ImmersiveStory({ scenes = engineScenes, accent = "red" }: { scenes?: EngineScene[]; accent?: Props["accent"] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const activeRef = useRef(0);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setScrollEnabled(!preference.matches);
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!scrollEnabled) return;
    const node = root.current;
    if (!node) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = node.getBoundingClientRect();
      const distance = bounds.height - window.innerHeight;
      const progress = Math.max(0, Math.min(1, (72 - bounds.top) / Math.max(1, distance)));
      node.style.setProperty("--story-progress", String(progress));
      const next = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
      if (next !== activeRef.current) { activeRef.current = next; setActive(next); }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule); update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [scrollEnabled, scenes.length]);
  const select = (index: number) => {
    activeRef.current = index; setActive(index);
    if (scrollEnabled && root.current) {
      const bounds = root.current.getBoundingClientRect();
      const distance = bounds.height - window.innerHeight;
      window.scrollTo({ top: window.scrollY + bounds.top - 72 + (index + .35) / scenes.length * distance, behavior: "instant" });
    }
  };
  const scene = scenes[active];
  return (
    <section ref={root} id="inside-the-engine" className={`immersion-story immersion-${accent}`} data-scroll={scrollEnabled} aria-label="Explore the Darth Algo indicator layers">
      <div className="immersion-story-sticky">
        <div className="immersion-story-layout section-shell">
          <div className="immersion-story-copy">
            <p className="immersion-eyebrow">Inside the engine / 0{active + 1}</p>
            <h2>{scene.title}</h2><p className="immersion-description">{scene.copy}</p>
            <div className="immersion-chapters" role="group" aria-label="Indicator layers">
              {scenes.map((item, index) => <button type="button" key={item.label} aria-pressed={index === active} onClick={() => select(index)}><span>0{index + 1}</span>{item.label}</button>)}
            </div>
            <p className="immersion-footnote">Recorded examples. Historical views are not live signals or typical results.</p>
          </div>
          <ImmersiveEngine accent={accent} image={scene.image} alt={scene.alt} active={active} />
        </div>
        <div className="immersion-story-track" aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
