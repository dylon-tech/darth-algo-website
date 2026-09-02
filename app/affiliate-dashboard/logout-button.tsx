"use client";
import { useRouter } from "next/navigation";
export default function LogoutButton(){const router=useRouter();return <button onClick={async()=>{await fetch('/api/affiliates/logout',{method:'POST'});router.refresh();}} className="rounded-md border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5">Sign out</button>}

