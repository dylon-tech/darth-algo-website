"use client";
import Image from "next/image";
import { Expand, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import type { DarthProduct } from "../lib/products";
export default function ProductGallery({ product, priority = false }: { product: DarthProduct; priority?: boolean }) {
  const frames = [{ src: product.overview, alt: product.overviewAlt, label: "Chart overview" }, ...product.gallery, ...(product.dashboard ? [{ src: product.dashboard, alt: product.dashboardAlt || product.shortName + " dashboard", label: "Dashboard" }] : [])];
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = frames[index];
  const move = (direction: number) => setIndex(current => (current + direction + frames.length) % frames.length);
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="group relative block aspect-[16/10] w-full overflow-hidden bg-[#080b10] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label={"Expand " + product.shortName + " chart preview"}>
      <Image src={frame.src} alt={frame.alt} fill priority={priority} sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-contain transition-transform duration-500 group-hover:scale-[1.035]" />
      <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-md border border-white/20 bg-black/80 px-3 py-2 text-xs font-semibold"><Expand size={14} /> Enlarge preview</span>
    </button>
    <div className="flex gap-2 border-y border-white/10 bg-black/20 p-3" aria-label={product.shortName + " chart views"}>
      {frames.map((item, i) => <button type="button" key={item.src} onClick={() => setIndex(i)} aria-label={item.label} aria-pressed={i === index} className={"relative h-12 min-w-0 flex-1 overflow-hidden rounded border transition " + (i === index ? "border-white opacity-100" : "border-white/10 opacity-50 hover:opacity-100")}><Image src={item.src} alt="" fill sizes="80px" className="object-cover" /></button>)}
    </div>
    <dialog ref={dialog} aria-label={product.shortName + " chart gallery"} className="fixed inset-0 m-auto max-h-[95dvh] w-[min(1200px,95vw)] max-w-none overflow-y-auto rounded-xl border border-white/20 bg-[#0d1117] p-0 text-white shadow-2xl backdrop:bg-black/90" onKeyDown={event => { if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); }}>
      <div className="flex items-center justify-between gap-4 border-b border-white/10 p-4"><div><p className="text-xs uppercase tracking-widest text-zinc-400">Darth Algo / {product.shortName}</p><h2 className="mt-1 font-bold">{frame.label}</h2></div><button type="button" onClick={() => dialog.current?.close()} aria-label="Close preview" className="rounded-lg border border-white/20 p-3 hover:bg-white/10"><X size={20} /></button></div>
      <div className="relative h-[min(65dvh,700px)] bg-black"><Image src={frame.src} alt={frame.alt} fill sizes="95vw" className="object-contain" /></div>
      <div className="flex items-center justify-between gap-3 p-4"><button type="button" onClick={() => move(-1)} className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-sm"><ChevronLeft size={16} /> Previous</button><p className="text-center text-xs text-zinc-400">{index + 1} / {frames.length} · Actual product screenshots</p><button type="button" onClick={() => move(1)} className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-sm">Next <ChevronRight size={16} /></button></div>
    </dialog>
  </>;
}
