import Image from "next/image";

export default function SiteBrand({ compact = false }: { compact?: boolean }) {
  return <span className="inline-flex items-center gap-3 leading-none">
    <Image src="/darth-algo-link-logo.svg" alt="" width={compact ? 42 : 48} height={compact ? 42 : 48} className="shrink-0 rounded-lg" />
    <span className="font-display text-xl font-black uppercase italic sm:text-2xl"><span className="text-ember">Darth</span> <span className="text-white">Algo</span></span>
  </span>;
}
