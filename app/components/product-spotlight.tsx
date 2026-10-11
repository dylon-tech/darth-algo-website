"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Expand, X } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { products, type ProductSlug } from "../lib/products";

const views = {
  scalper: [
    { label: "Full chart", src: products.scalper.overview, alt: products.scalper.overviewAlt, title: "Keep pace with the session.", copy: "Short-term signals, trend context and your trade plan in one view." },
    { label: "Trade plan", src: "/indicators/scalper-risk-plan.png", alt: "Scalper short setup with entry, stop, Target 1 and Target 2", title: "See the exits before the entry.", copy: "Compare the stop and two target levels before deciding to take a setup." },
    { label: "Signal context", src: "/indicators/signal-context-alt.png", alt: "Scalper buy and sell labels alongside the trend cloud", title: "Give every signal context.", copy: "Read the buy or sell marker alongside the direction of the cloud." },
  ],
  swing: [
    { label: "Full chart", src: products.swing.overview, alt: products.swing.overviewAlt, title: "Follow the broader move.", copy: "Swing signals and trend context help you review the bigger picture." },
    { label: "Trade plan", src: "/indicators/swing-risk-plan.png", alt: "Swing long setup showing entry, stop and two possible targets", title: "Keep the whole plan in sight.", copy: "Entry, stop and targets stay together as you evaluate the setup." },
    { label: "Trend cloud", src: "/indicators/swing-trend-cloud.png", alt: "Swing trend cloud transitioning between bullish and bearish conditions", title: "Read the direction first.", copy: "The cloud shows changes in trend context, not a promise of the next move." },
  ],
  pro: [
    { label: "Full chart", src: products.pro.overview, alt: products.pro.overviewAlt, title: "Signals. Context. A visible plan.", copy: "See how Darth Algo brings the decision-making layers onto your chart." },
    { label: "Scalper", src: products.scalper.overview, alt: products.scalper.overviewAlt, title: "Work the shorter-term setup.", copy: "Scalper is built for active sessions. It is included with Pro." },
    { label: "Swing", src: products.swing.overview, alt: products.swing.overviewAlt, title: "Step back to the broader trend.", copy: "Swing is built for larger directional moves. It is included with Pro." },
  ],
};

/** Recorded, unchanged product captures; never a simulation or live market feed. */
export function IndicatorExplorer({ product = "pro", priority = false }: { product?: ProductSlug; priority?: boolean }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const frames = views[product];
  const frame = frames[selected];
  return <div className="indicator-explorer" data-product={product}>
    <div className="indicator-explorer-bar">
      <span>Darth Algo <strong>{products[product].shortName}</strong></span>
      <span className="indicator-recorded">Recorded chart</span>
    </div>
    <figure id={id}>
      <button type="button" className="indicator-explorer-image" onClick={() => dialog.current?.showModal()} aria-label={`Enlarge ${products[product].shortName} ${frame.label.toLowerCase()}`}>
        <Image src={frame.src} alt={frame.alt} fill sizes="(min-width: 1280px) 1180px, 94vw" priority={priority} className="object-contain" />
        <span className="indicator-expand"><Expand size={14} /> Enlarge</span>
      </button>
      <figcaption className="indicator-explorer-caption" aria-live="polite">
        <strong>{frame.title}</strong><span>{frame.copy}</span>
      </figcaption>
    </figure>
    <div className="indicator-explorer-controls" role="group" aria-label={`${products[product].shortName} feature views`}>
      {frames.map((item, index) => <button key={item.label} type="button" aria-pressed={selected === index} aria-controls={id} onClick={() => setSelected(index)}><span>0{index + 1}</span>{item.label}</button>)}
    </div>
    <dialog ref={dialog} className="indicator-dialog" aria-label={`${products[product].shortName} enlarged chart`}>
      <div className="indicator-dialog-bar"><strong>{products[product].shortName} · {frame.label}</strong><button type="button" aria-label="Close enlarged chart" onClick={() => dialog.current?.close()}><X size={22} /></button></div>
      <p>Scroll across the full-size chart to inspect its labels.</p>
      <div className="indicator-dialog-scroll">
        {/* Preserve native dimensions for inspecting labels, rather than upscaling a thumbnail. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frame.src} alt={frame.alt} />
      </div>
      <a href={frame.src} target="_blank" rel="noopener noreferrer">Open original image ↗</a>
    </dialog>
  </div>;
}

export default function ProductSpotlight({ eyebrow, title, description, product = "pro", children, id }: {
  eyebrow: string; title: string; description: string; product?: ProductSlug; children?: ReactNode; id?: string;
}) {
  return <section id={id} className="product-spotlight" data-product-spotlight>
    <div className="section-shell">
      <div className="product-spotlight-intro"><p className="product-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="product-spotlight-copy">{description}</p></div>
      <IndicatorExplorer product={product} priority />
      {children && <div className="product-spotlight-actions">{children}</div>}
      <p className="product-proof-note">Actual indicator screenshots. Not live signals or guaranteed results.</p>
    </div>
  </section>;
}

export function ExploreTools({ title = "See what belongs on your chart." }: { title?: string }) {
  return <section className="product-next-step"><div className="section-shell"><div><p className="product-eyebrow">Meet the indicators</p><h2>{title}</h2><p>Scalp the session, follow the broader trend, or get both with Pro.</p></div><Link href="/products/pro" className="product-primary">Explore Pro <ArrowRight size={17} /></Link><Link href="/compare" className="product-secondary">Compare all plans</Link></div></section>;
}
