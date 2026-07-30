import { Shield, TrendingUp } from "lucide-react";

export default function SiteBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 leading-none">
      <span className={`${compact ? "h-10 w-10" : "h-12 w-12"} brand-crest relative grid shrink-0 place-items-center`} aria-hidden="true">
        <span className="brand-crest-orbit absolute inset-0" />
        <span className="brand-crest-orbit brand-crest-orbit-inner absolute" />
        <span className="brand-crest-core absolute grid place-items-center">
          <Shield className={`${compact ? "h-6 w-6" : "h-7 w-7"} brand-crest-shield text-ember`} strokeWidth={1.75} />
          <TrendingUp className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} brand-crest-signal absolute text-white`} strokeWidth={2.6} />
          <span className="brand-crest-bars absolute"><i /><i /><i /></span>
        </span>
        <span className="brand-crest-beam absolute" />
      </span>
      <span className="brand-wordmark font-display text-xl font-black uppercase sm:text-2xl">
        <span className="brand-wordmark-darth text-ember">Darth</span> <span className="text-white">Algo</span>
      </span>
    </span>
  );
}
