// Shared display model only. No credentials or server imports belong in this file.
export type OperationTone = 'good' | 'wait' | 'bad' | 'quiet';
export type OperationState = { label: string; tone: OperationTone };
export type NetworkDelivery = { network: string; state: string; published: boolean; postId: string | null; url: string | null; checkedAt: string | null };
export type IndicatorItem = { id: string; name: string; status: string; createdAt: string | null; url: string | null };
export type TeamItem = { id: string; state: string; finishedAt: string | null; queued: number; running: number; error: string | null };
export type OperationsSnapshot = {
  checkedAt: string; day: string; environment: string; partial: string[];
  scheduler: { enabled: boolean; paused: boolean | null; lastSeenAt: string | null; state: string; fresh: boolean };
  content: { prepared: boolean; preparedAt: string | null; previewUrl: string | null; caption: string | null; assets: number };
  deliveries: NetworkDelivery[];
  indicator: { enabled: boolean; stage: string; candidates: IndicatorItem[]; browserConnected: boolean | null; browserStartsRemaining: number | null; loginVerified: boolean | null; releaseExecutorConnected: boolean; lastHandoff: string | null; lastHandoffAt: string | null; researchState: string | null };
  team: TeamItem[];
  openLoops: Array<{id:string; category:string; title:string; why:string; service:string; founderAction:string|null; resumeAction:string; severity:string; lastSeenAt:string|null}>;
};
export function recentTimestamp(value: string | null, now = Date.now(), maximumAgeMs = 180000): boolean {
  if (!value) return false;
  const age = now - Date.parse(value);
  return Number.isFinite(age) && age >= -30000 && age <= maximumAgeMs;
}
export function publicOperationUrl(value: unknown, network?: string): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    const allowed: Record<string, string[]> = { x: ['x.com','www.x.com','twitter.com','www.twitter.com'], instagram: ['www.instagram.com','instagram.com'], threads: ['www.threads.net','threads.net','www.threads.com','threads.com'], whop: ['whop.com','www.whop.com'], tradingview: ['www.tradingview.com'], asset: ['www.darthalgo.com'] };
    if (!network || !allowed[network]?.includes(u.hostname)) return null;
    if (network === 'asset' && !u.pathname.startsWith('/api/social-media/')) return null;
    return u.href;
  } catch { return null; }
}
export function operationState(state: string, confirmed = false): OperationState {
  if (confirmed) return {label: 'Published', tone: 'good'};
  const known: Record<string, OperationState> = {
    ready_for_daily_window: {label: 'Waiting for 9 AM', tone: 'wait'},
    connection_checked_waiting_for_window: {label: 'Connection checked · waiting', tone: 'wait'},
    waiting_for_daily_window: {label: 'Spacing safeguard', tone: 'wait'},
    no_supported_idea: {label: 'Research needs stronger evidence', tone: 'bad'},
    awaiting_private_test: {label: 'Needs TradingView testing', tone: 'bad'},
    awaiting_approval: {label: 'Ready for your review', tone: 'wait'},
    awaiting_release: {label: 'Release connection needed', tone: 'bad'},
    qa_blocked: {label: 'Testing / education pending', tone: 'bad'},
    pending: {label: 'Needs your decision', tone: 'wait'},
    approved: {label: 'Approved · not released', tone: 'wait'},
    released: {label: 'Released', tone: 'good'},
    succeeded: {label: 'Last request finished', tone: 'good'},
    completed: {label: 'Last run finished', tone: 'good'},
    running: {label: 'Working', tone: 'good'},
    queued: {label: 'Queued', tone: 'wait'},
    ready: {label: 'Build eligible', tone: 'wait'},
    prepared: {label: 'Assets prepared', tone: 'good'},
    paused: {label: 'Paused', tone: 'quiet'},
    disabled: {label: 'Not enabled', tone: 'quiet'},
    unknown: {label: 'Not verified', tone: 'bad'},
    no_record: {label: 'No recorded run', tone: 'quiet'},
    stale: {label: 'Status needs a fresh check', tone: 'bad'},
    research_queued: {label: 'Research queued', tone: 'wait'},
    growth_queued: {label: 'Idea review queued', tone: 'wait'},
  };
  if (known[state]) return known[state];
  // A label or provider acceptance alone must never become a green publication receipt.
  if (['published','sent','processing','scheduled','unconfirmed','waiting_for_prior_receipt','waiting_or_started'].includes(state)) return {label: state === 'scheduled' ? 'Scheduled · not published' : 'Awaiting confirmed receipt', tone: 'wait'};
  if (/missing|required|blocked|failed|rejected|unknown|needs_check|credits|exhausted|unavailable|expired/i.test(state)) return {label: state.replaceAll('_',' ').replace(/^WHOP /,''), tone: 'bad'};
  return {label: state.replaceAll('_',' '), tone: 'wait'};
}
