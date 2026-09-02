"use client";

import { FormEvent, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AffiliateLoginForm() {
  const router = useRouter(); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setError("");const f=new FormData(e.currentTarget);const response=await fetch('/api/affiliates/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(f.entries()))});const result=await response.json();if(!response.ok){setError(result.error);setLoading(false);return;}router.refresh();}
  return <form onSubmit={submit} className="mx-auto max-w-md rounded-xl border border-white/10 bg-[#111720] p-7"><h1 className="text-2xl font-black">Creator dashboard</h1><p className="mt-2 text-sm text-zinc-400">Sign in with your creator username and password.</p><label className="mt-6 block text-sm font-bold text-zinc-300">Username or email<input name="username" required autoComplete="username" className="mt-2 min-h-12 w-full rounded-md border border-white/10 bg-black/30 px-4 outline-none focus:border-ember" /></label><label className="mt-4 block text-sm font-bold text-zinc-300">Password<input name="password" type="password" required autoComplete="current-password" className="mt-2 min-h-12 w-full rounded-md border border-white/10 bg-black/30 px-4 outline-none focus:border-ember" /></label>{error&&<p className="mt-4 text-sm text-red-300">{error}</p>}<button disabled={loading} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ember font-black">{loading?<Loader2 className="h-5 w-5 animate-spin"/>:<><LogIn className="h-4 w-4"/> Sign in</>}</button></form>;
}
