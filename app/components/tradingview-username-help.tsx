"use client";

import { ArrowUpRight, Check, CircleHelp, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TradingViewUsernameHelpProps = {
  className?: string;
};

const steps = [
  "Sign in to the TradingView app or website.",
  "Open your account or profile menu.",
  "Find the username shown beside your profile picture, like the circled example.",
  "Paste that exact username into the required field at Stripe checkout.",
];

export default function TradingViewUsernameHelp({ className = "" }: TradingViewUsernameHelpProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const dialog = open ? (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-md border border-white/15 bg-[#0b0f15] shadow-[0_0_90px_rgba(255,36,36,0.2)] sm:max-w-xl sm:rounded-md">
        <div className="h-1 w-full bg-[linear-gradient(90deg,#ff2424,#ff2424_54%,#34d399_54%,#34d399)]" />
        <div className="flex items-start justify-between gap-5 border-b border-white/10 p-5 sm:p-7">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase text-ember">TradingView access guide</p>
            <h2 id={titleId} className="mt-2 font-display text-2xl font-black text-white sm:text-3xl">Find your username.</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Stripe collects your contact email separately. Enter only your TradingView account username in the username field.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={close} aria-label="Close username guide" className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-white/25 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          <figure className="overflow-hidden rounded-md border border-white/10 bg-[#111722]">
            <div className="relative aspect-[4/3] w-full bg-black">
              <Image src="/tradingview-username-guide.jpg" alt="TradingView mobile profile with the Darth_Algo username circled in red" fill sizes="(min-width: 640px) 520px, calc(100vw - 40px)" className="object-cover object-top" />
            </div>
            <figcaption className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3">
              <span className="text-xs font-semibold text-zinc-400">Your username appears beside your profile picture.</span>
              <span className="shrink-0 rounded-md border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 font-mono text-[9px] font-bold uppercase text-emerald-400">Copy this</span>
            </figcaption>
          </figure>

          <ol className="mt-6 space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="grid grid-cols-[2rem_1fr] items-start gap-3 text-sm leading-6 text-zinc-300">
                <span className="grid h-8 w-8 place-items-center rounded-md border border-ember/25 bg-ember/[0.07] font-mono text-[10px] font-bold text-ember">0{index + 1}</span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-md border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs leading-5 text-amber-100/80">
            Double-check the spelling before payment. Your username is used to grant access, and your checkout email lets Darth Algo contact you if it needs to be corrected.
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-5 text-sm font-extrabold text-white transition hover:border-white/30">
              Open TradingView <ArrowUpRight className="h-4 w-4" />
            </a>
            <button type="button" onClick={close} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ember px-5 text-sm font-extrabold text-white shadow-glow transition hover:bg-red-500">
              Got it <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-bold text-zinc-400 transition hover:bg-white/[0.04] hover:text-white ${className}`}>
        <CircleHelp className="h-4 w-4 text-ember" /> Where do I find my TradingView username?
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
