// Presentation rules shared by the private CEO desk and its regression tests.
export type DeskJob = { id: string; department: string; status: string; message: string; createdAt: string; startedAt: string | null };
export type DeskRun = { id: string; department: string; status: string; createdAt: string; finishedAt: string | null; errorCode: string | null; brief: string | null; step?: string | null };
export type DeskAgent = { id: string; name: string; mandate: string; configured: boolean; latest: DeskRun | null; completed: DeskRun | null; current: DeskJob | null; next: DeskJob | null; waiting: number; task: { title: string; status: string } | null };
export type Observation = { id: string; observedAt: string; details: Record<string, unknown> };
export type DeskSnapshot = {
  checkedAt: string; paused: boolean; autonomy: boolean;
  scheduler: { lastSeenAt: string; status: string } | null;
  budget: { configured: boolean; available?: boolean; reason?: string | null; dailyLimitUsd?: number; monthlyLimitUsd?: number };
  counts: { working: number; queued: number; completedToday: number; needsOwner: number };
  agents: DeskAgent[]; services: Observation[]; telemetryAvailable: boolean;
  decisions: Array<{ id: string; summary: string; kind: string }>;
  activity: Array<{ id: string; actor: string; event: string; at: string }>;
  receipts: Array<{ id: string; network: string | null; url: string | null; sentAt: string | null }>;
};
export type ViewState = { label: string; tone: 'good' | 'warn' | 'quiet'; detail: string };
export function freshAt(date: string | null | undefined, now: number, maxAge = 180000): boolean {
  const age = now - Date.parse(date || '');
  return Number.isFinite(age) && age >= -5000 && age < maxAge;
}
export const words = (value: unknown): string => typeof value === 'string' ? value.replaceAll('_', ' ') : 'Not reported';
export function agentView(agent: DeskAgent, snapshot: DeskSnapshot, now: number, fresh: boolean): ViewState {
  if (!fresh) return { label: 'Update unavailable', tone: 'warn', detail: 'Showing the last saved snapshot, not a live status.' };
  if (snapshot.paused) return { label: 'Paused', tone: 'quiet', detail: 'The owner pause is on. No new work is requested here.' };
  if (agent.latest?.status === 'running') {
    if (!freshAt(agent.latest.createdAt, now, 300000)) return { label: 'Needs a check', tone: 'warn', detail: 'This saved run has exceeded its reporting window.' };
    return { label: 'Working', tone: 'good', detail: words(agent.latest.step || 'working_on_saved_request') };
  }
  if (agent.current) return freshAt(agent.current.startedAt, now, 300000)
    ? { label: 'Starting', tone: 'good', detail: 'A worker has picked up this saved request.' }
    : { label: 'Needs a check', tone: 'warn', detail: 'The picked-up request has stopped reporting.' };
  if (!agent.configured) return { label: 'Needs setup', tone: 'warn', detail: 'The app AI connection is not fully configured.' };
  if (snapshot.budget.configured && snapshot.budget.available === false) return { label: 'Allowance reached', tone: 'warn', detail: words(snapshot.budget.reason || 'existing_budget_unavailable') };
  if (agent.latest?.status === 'failed') return { label: 'Needs a check', tone: 'warn', detail: words(agent.latest.errorCode || 'last_attempt_did_not_finish') };
  if (agent.next || agent.task?.status === 'queued') return { label: 'Scheduled', tone: 'good', detail: freshAt(snapshot.scheduler?.lastSeenAt, now) ? 'The live scheduler has this assignment and will run it in order.' : 'Work is saved; the scheduler needs a connection check.' };
  if (agent.task?.status === 'blocked') return { label: 'Blocked follow-up', tone: 'warn', detail: agent.task.title };
  return agent.completed ? { label: 'Live · On standby', tone: 'good', detail: 'Connected and available. Previous work is saved; no new assignment is needed right now.' } : { label: 'Not verified yet', tone: 'warn', detail: 'This role has no recorded successful app run.' };
}
export function serviceView(service: Observation, now: number): ViewState {
  if (!freshAt(service.observedAt, now)) return { label: 'Stale update', tone: 'warn', detail: 'This service has not reported in the last three minutes.' };
  const d = service.details, status = typeof d.status === 'string' ? d.status : 'unknown';
  if (status === 'prototype_ready') return { label: 'Prototype ready', tone: 'good', detail: `${Number(d.prototypeReady || 1)} original indicator prototype ready for review. TradingView release QA remains separate.` };
  const blockers = ['privateTesting', 'publishing', 'socialDiscovery'].map(k => d[k]).filter(v => typeof v === 'string' && /blocked|not_connected|waiting_for_credits|connection_required/.test(v));
  const deliveryIssues = d.deliveries && typeof d.deliveries === 'object' ? Object.entries(d.deliveries).filter(([,v]) => typeof v === 'string' && /needs_check|connection_required|unknown|unconfirmed|prior_receipt|HTTP_[45]\d\d|failed|blocked|error/i.test(v)).map(([network,value])=>`${network}: ${words(value)}`) : [];
  if (blockers.length || deliveryIssues.length || /blocked|failed|error|needs_check/i.test(status)) return { label: 'Needs attention', tone: 'warn', detail: [...blockers.map(words),...deliveryIssues].join(' · ') || words(d.code || d.reason || status) };
  if (/disabled|paused/.test(status)) return { label: words(status), tone: 'quiet', detail: 'This service is not currently executing work.' };
  if (/prepared_for_daily_window|preparing_daily_caption/.test(status)) return { label: status === 'prepared_for_daily_window' ? 'Scheduled' : 'Preparing', tone: 'good', detail: status === 'prepared_for_daily_window' ? 'Creative is ready and held for the daily posting window. It has not been falsely marked published.' : 'The live content worker is preparing the daily creative.' };
  if (/already_checked|idle|waiting|no_supported_idea/.test(status)) return { label: 'Waiting', tone: 'quiet', detail: words(status) };
  if (/ready|active|completed|working|synced|published/.test(status)) return { label: 'Reported', tone: 'good', detail: words(status) };
  return { label: 'Check result', tone: 'quiet', detail: words(status) };
}
export function safeReceiptUrl(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && ['x.com','twitter.com','instagram.com','www.instagram.com','threads.net','www.threads.net','threads.com','www.threads.com','whop.com','www.whop.com'].includes(url.hostname) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
