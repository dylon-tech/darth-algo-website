"use client";

import { ArrowRight, Check, Mail, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const dismissalKey = "darth-algo-newsletter-dismissed";

export default function NewsletterSignup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (window.sessionStorage.getItem(dismissalKey)) return;
    const reveal = () => {
      setVisible(true);
      window.removeEventListener("scroll", checkScroll);
      window.clearTimeout(timer);
    };
    const checkScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable > 0.22) reveal();
    };
    const timer = window.setTimeout(reveal, 18000);
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", checkScroll);
    };
  }, []);

  const dismiss = () => {
    window.sessionStorage.setItem(dismissalKey, "true");
    setVisible(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!consent) {
      setStatus("error");
      setMessage("Confirm that you would like to receive Darth Algo emails.");
      return;
    }

    setStatus("submitting");

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent,
          company: String(form.get("company") || ""),
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Signup failed");

      window.sessionStorage.setItem(dismissalKey, "true");
      setStatus("success");
      setMessage("You are on the list. Watch your inbox for upcoming releases and offers.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not add you right now. Please try again.");
    }
  };

  if (!visible) return null;

  return (
    <aside className="newsletter-popup fixed bottom-20 right-4 z-[80] w-[calc(100%-2rem)] max-w-[390px] overflow-hidden rounded-md border border-white/15 bg-secondary/95 p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.72),0_0_45px_rgba(220,55,65,0.12)] backdrop-blur-xl sm:right-6 sm:p-6 lg:bottom-6" aria-label="Darth Algo newsletter signup" aria-live="polite">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px red-line" />
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-black/50 text-zinc-500 transition hover:border-ember/50 hover:text-white"
        aria-label="Close newsletter signup"
      >
        <X className="h-4 w-4" />
      </button>

      {status === "success" ? (
        <div className="pr-8" role="status">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-emerald-400/35 bg-emerald-400/10 text-emerald-300"><Check className="h-4 w-4" /></span>
          <p className="mt-4 font-display text-2xl font-black text-white">Transmission received.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{message}</p>
          <button type="button" onClick={dismiss} className="mt-4 text-xs font-bold text-zinc-500 transition hover:text-white">Close</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex items-center gap-3 pr-10">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-ember/30 bg-ember/10"><Mail className="h-4 w-4 text-ember" /></span>
            <div>
              <p className="font-mono text-[9px] font-black uppercase text-ember">Darth Algo Dispatch</p>
              <h2 className="mt-1 font-display text-xl font-black text-white">Get deals and indicator drops.</h2>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-zinc-500">Join for product updates, subscriber offers, and early access to future indicators.</p>

          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Your email address"
            className="mt-4 min-h-12 w-full rounded-md border border-white/10 bg-black/65 px-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-ember focus:shadow-[0_0_24px_rgba(255,36,36,0.12)]"
          />

          <div className="pointer-events-none absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="newsletter-company">Company</label>
            <input id="newsletter-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[11px] leading-5 text-zinc-600">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#ff2424]" />
            <span>I agree to receive promotional and product emails. Unsubscribe anytime.</span>
          </label>

          {message && <p className="mt-3 text-xs leading-5 text-ember" role="alert">{message}</p>}

          <button type="submit" disabled={status === "submitting"} className="group mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ember px-5 text-sm font-extrabold text-white shadow-glow transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
            {status === "submitting" ? "Joining..." : "Join the List"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>

          <div className="mt-3 flex items-center justify-between gap-4 text-[11px]">
            <button type="button" onClick={dismiss} className="font-bold text-zinc-600 transition hover:text-white">Skip for now</button>
            <a href="/privacy-policy" className="text-zinc-700 underline decoration-zinc-800 underline-offset-2 transition hover:text-zinc-400">Privacy Policy</a>
          </div>
        </form>
      )}
    </aside>
  );
}
