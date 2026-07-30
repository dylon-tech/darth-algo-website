import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import SiteBrand from "./components/site-brand";

export default function NotFound() {
  return (
    <main id="main-content" className="relative grid min-h-screen place-items-center overflow-hidden bg-obsidian px-5 text-center text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-grid bg-[size:48px_48px] opacity-[0.12]" />
      <div className="relative max-w-xl"><div className="flex justify-center"><SiteBrand /></div><p className="mt-12 font-mono text-xs font-bold uppercase text-ember">Error 404 // Signal lost</p><h1 className="mt-5 font-display text-6xl font-black sm:text-8xl">This chart went off-screen.</h1><p className="mt-6 text-base leading-8 text-zinc-400">The page does not exist or may have moved. Return to the Darth Algo trading system.</p><Link href="/" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ember px-6 text-sm font-extrabold text-white shadow-glow"><ArrowLeft className="h-4 w-4" />Return home</Link></div>
    </main>
  );
}
