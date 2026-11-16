/** Shared entitlement clarification. This does not replace purchase-time terms. */
export default function LifetimeAccessNote() {
  return (
    <aside aria-label="Lifetime Pro access and optional source setup" className="mt-6 rounded-xl border border-rose-400/30 bg-white/[.04] p-5 text-sm leading-7 text-zinc-300">
      <p><strong className="text-white">Lifetime Pro access has no expiration.</strong> Your Lifetime purchase includes Pro indicator access plus the Pro Pine Script and setup instructions. Uploading or renaming your private copy is optional. Your Pro access remains active for life even if you never upload or rename the source.</p>
      <p className="mt-3">Pro combines Scalp and Swing modes. Those modes are not separate standalone scripts. Source setup is separate from activating your TradingView access; contact support if your purchased access is missing.</p>
      <p className="mt-3 text-xs text-zinc-400">Existing purchases retain the access, source files and license rights promised at purchase. This clarification does not remove or replace those rights.</p>
    </aside>
  );
}
