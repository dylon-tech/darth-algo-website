"use client";

import { ArrowRight, Check, CircleCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

const discoveryOptions = [
  ["tiktok", "TikTok"],
  ["instagram", "Instagram"],
  ["youtube", "YouTube"],
  ["x-twitter", "X / Twitter"],
  ["tradingview", "TradingView"],
  ["search", "Google or another search engine"],
  ["referral", "Friend, trader, or community"],
  ["other", "Somewhere else"],
];

const purchaseReasonOptions = [
  ["signals", "Clear buy and sell signals"],
  ["risk-planning", "Entry, stop, and take-profit planning"],
  ["trend-dashboard", "Trend dashboard and confirmation"],
  ["ai-updates", "Continuous AI-assisted updates"],
  ["free-trial", "The 2-day free trial"],
  ["price-value", "Price and overall value"],
  ["source-code", "Source code and commercial rights"],
];

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function PurchaseSurvey({ sessionId }: { sessionId: string }) {
  const [heardFrom, setHeardFrom] = useState("");
  const [purchaseReasons, setPurchaseReasons] = useState<string[]>([]);
  const [otherSource, setOtherSource] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const toggleReason = (value: string) => {
    setPurchaseReasons((current) =>
      current.includes(value)
        ? current.filter((reason) => reason !== value)
        : [...current, value],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!heardFrom || purchaseReasons.length === 0) {
      setErrorMessage("Choose one discovery source and at least one purchase reason.");
      return;
    }

    if (!sessionId) {
      setErrorMessage("This survey must be opened from the Stripe purchase confirmation.");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/purchase-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, heardFrom, purchaseReasons, otherSource }),
      });

      if (!response.ok) throw new Error("Survey submission failed");
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("We could not save your response. Please try again in a moment.");
    }
  };

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-obsidian text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-grid bg-[size:48px_48px] opacity-[0.1]" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[linear-gradient(145deg,rgba(255,26,26,0.08),transparent_38%,rgba(52,211,153,0.035))]" />

      <header className="relative z-10 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="section-shell flex h-[72px] items-center justify-between">
          <Link href="/#top" className="inline-flex items-center gap-3" aria-label="Return to Darth Algo home">
            <span className="grid h-8 w-8 place-items-center border border-ember/60 bg-black font-display text-xs font-black text-ember shadow-glow">DA</span>
            <span className="font-display text-xl font-black uppercase"><span className="text-ember">Darth</span> Algo</span>
          </Link>
          <span className="font-mono text-[10px] font-bold uppercase text-emerald-400">Purchase complete</span>
        </div>
      </header>

      <section className="relative z-10 py-16 sm:py-24">
        <div className="section-shell grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <span className="inline-flex items-center gap-2 border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase text-emerald-400">
              <CircleCheck className="h-4 w-4" /> Order confirmed
            </span>
            <h1 className="mt-7 text-balance font-display text-5xl font-black leading-[0.96] sm:text-6xl">Welcome to <span className="text-ember">Darth Algo.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">Your access request is in motion. Two quick answers will help us understand which channels and product features matter most to traders.</p>
            <div className="mt-8 flex items-start gap-3 border-t border-white/10 pt-6 text-sm leading-6 text-zinc-600">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
              Your answers are saved privately with your Stripe purchase and are used only to improve Darth Algo marketing and product decisions.
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-white/10 bg-[#080809] shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
            {status === "success" ? (
              <div className="p-7 text-center sm:p-12">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-400"><Check className="h-6 w-6" /></span>
                <h2 className="mt-6 font-display text-4xl font-black">Thank you.</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-zinc-500">Your feedback is now attached to your purchase. We will use it to make Darth Algo sharper for the traders who use it.</p>
                <Link href="/#top" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ember px-6 text-sm font-extrabold text-white shadow-glow">Return to Darth Algo <ArrowRight className="h-4 w-4" /></Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <fieldset className="min-w-0 border-0 border-b border-white/10 p-6 sm:p-8">
                  <legend className="sr-only">Where did you hear about Darth Algo?</legend>
                  <p className="font-mono text-[10px] font-bold uppercase text-ember">Question 01 / Discovery</p>
                  <h2 className="mt-3 font-display text-3xl font-black">Where did you hear about Darth Algo?</h2>
                  <p className="mt-2 text-sm text-zinc-600">Choose the one source that influenced you most.</p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {discoveryOptions.map(([value, label]) => (
                      <label key={value} className={`survey-choice ${heardFrom === value ? "is-selected" : ""}`}>
                        <input type="radio" name="heardFrom" value={value} checked={heardFrom === value} onChange={() => setHeardFrom(value)} className="sr-only" />
                        <span className="survey-choice-mark" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {heardFrom === "other" && (
                    <input value={otherSource} onChange={(event) => setOtherSource(event.target.value)} maxLength={120} placeholder="Tell us where" className="mt-3 min-h-12 w-full rounded-md border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-ember" />
                  )}
                </fieldset>

                <fieldset className="min-w-0 border-0 p-6 sm:p-8">
                  <legend className="sr-only">What made you decide to buy?</legend>
                  <p className="font-mono text-[10px] font-bold uppercase text-ember">Question 02 / Decision</p>
                  <h2 className="mt-3 font-display text-3xl font-black">What made you decide to buy?</h2>
                  <p className="mt-2 text-sm text-zinc-600">Select every reason that mattered.</p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {purchaseReasonOptions.map(([value, label]) => (
                      <label key={value} className={`survey-choice ${purchaseReasons.includes(value) ? "is-selected" : ""}`}>
                        <input type="checkbox" name="purchaseReasons" value={value} checked={purchaseReasons.includes(value)} onChange={() => toggleReason(value)} className="sr-only" />
                        <span className="survey-choice-mark survey-choice-check"><Check className="h-3 w-3" /></span>
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  {errorMessage && <p role="alert" className="mt-5 border-l-2 border-ember bg-ember/[0.06] px-4 py-3 text-sm text-red-200">{errorMessage}</p>}

                  <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <Link href="/#top" className="text-center text-sm font-bold text-zinc-600 transition hover:text-white">Skip survey</Link>
                    <button type="submit" disabled={status === "submitting"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ember px-6 text-sm font-extrabold text-white shadow-glow transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
                      {status === "submitting" ? "Saving response..." : "Send feedback"}<ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
