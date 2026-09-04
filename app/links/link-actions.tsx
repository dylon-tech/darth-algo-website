"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export default function LinkActions() {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "Darth Algo", text: "Darth Algo links, community, and indicators", url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-black text-zinc-200 backdrop-blur transition hover:border-red-500/50 hover:bg-red-500/10"
      aria-label="Share the Darth Algo link hub"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
