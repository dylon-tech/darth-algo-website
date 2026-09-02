"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const fieldClass = "mt-2 min-h-12 w-full rounded-md border border-white/10 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-ember/70 focus:ring-2 focus:ring-ember/20";

export default function AffiliateApplication() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/affiliates/apply", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, acceptTerms: form.get("acceptTerms") === "on" }),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.error); setLoading(false); return; }
    router.push("/affiliate-dashboard"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-white/10 bg-[#111720] p-5 shadow-2xl sm:p-8">
      <div className="mb-7 flex items-start gap-3 border-b border-white/10 pb-6">
        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-400" />
        <div><h2 className="text-xl font-black text-white">Creator application</h2><p className="mt-1 text-sm leading-6 text-zinc-400">Applications are reviewed before a Stripe promo code is activated.</p></div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-zinc-300">Full name<input name="fullName" required className={fieldClass} autoComplete="name" /></label>
        <label className="text-sm font-bold text-zinc-300">Email<input name="email" required type="email" className={fieldClass} autoComplete="email" /></label>
        <label className="text-sm font-bold text-zinc-300">Social media handle<input name="socialMediaHandle" required className={fieldClass} placeholder="@yourhandle" /></label>
        <label className="text-sm font-bold text-zinc-300">Preferred creator code<input name="preferredCode" required minLength={3} maxLength={20} pattern="[A-Za-z0-9]+" className={fieldClass} placeholder="Example: DYLAN25" /></label>
        <label className="text-sm font-bold text-zinc-300">Dashboard username<input name="dashboardUsername" required minLength={3} className={fieldClass} autoComplete="username" placeholder="Choose a login username" /></label>
        <label className="text-sm font-bold text-zinc-300">Dashboard password<input name="password" required minLength={8} type="password" className={fieldClass} autoComplete="new-password" placeholder="8+ characters" /></label>
      </div>
      <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-zinc-400"><input name="acceptTerms" required type="checkbox" className="mt-1 h-5 w-5 accent-red-500" /><span>I agree to disclose my affiliate relationship, avoid profit guarantees or misleading claims, follow platform rules, and accept the program terms shown above.</span></label>
      {error && <p role="alert" className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      <button disabled={loading} className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-md bg-ember px-6 text-sm font-black text-white shadow-glow transition hover:bg-red-500 disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Submit application <ArrowRight className="h-4 w-4" /></>}</button>
    </form>
  );
}
