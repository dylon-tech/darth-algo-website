import {db} from '../affiliate-db';

type Row = Record<string, unknown>;
export type FounderInboxCategory = 'customer' | 'alert' | 'agent';
export type FounderInboxState = {
  version: number; readAt: string | null; snoozedUntil: string | null;
  resolvedAt: string | null; draft: string; updatedAt: string | null;
};
export type FounderInboxItem = {
  id: string; category: FounderInboxCategory; kind: string; title: string;
  preview: string; body: string; sender: string; at: string | null;
  source: string; sourceHref: string | null; customerId: string | null;
  jobId: string | null; runId: string | null; severity: 'info' | 'warning' | 'critical';
  sourceStatus: string; contentCoverage: 'full_message' | 'summary_only' | 'alert';
  unread: boolean | null; state: FounderInboxState;
};
export type FounderInboxPatch = {read?: boolean; snoozedUntil?: string | null; resolved?: boolean; draft?: string};
type SourceResult = {id: string; status: 'read' | 'unavailable'; rows: Row[]; limit: number};
const row = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const text = (value: unknown, limit = 20000): string => typeof value === 'string' ? value.slice(0, limit) : '';
const date = (value: unknown): string | null => {
  const candidate = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  return candidate && Number.isFinite(candidate.getTime()) ? candidate.toISOString() : null;
};
const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
export function validInboxId(id: unknown): id is string {return typeof id === 'string' && new RegExp(`^(support|loop|message|approval):${uuid}$`).test(id);}
export const emptyInboxState = (): FounderInboxState => ({version: 0, readAt: null, snoozedUntil: null, resolvedAt: null, draft: '', updatedAt: null});
export function inboxState(record?: Row): FounderInboxState {
  if (!record) return emptyInboxState();
  return {version: Number(record.version) || 0, readAt: date(record.read_at), snoozedUntil: date(record.snoozed_until), resolvedAt: date(record.resolved_at), draft: text(record.draft), updatedAt: date(record.updated_at)};
}
export function inboxUnread(at: string | null, state: FounderInboxState): boolean {
  return !state.readAt || Boolean(at && Date.parse(at) > Date.parse(state.readAt));
}
export function safeInboxHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Source links are explicit owner routes or Gmail links; never promote arbitrary
  // provider/model payload URLs into clickable privileged navigation.
  if (/^\/owner(?:[/?#]|$)/.test(value) && !/[\\\u0000-\u001f]/.test(value)) return value;
  try {const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'mail.google.com' && !u.username && !u.password ? u.href : null;} catch {return null;}
}
function gmailHref(provider: unknown, threadId: unknown): string | null {
  return provider === 'gmail' && typeof threadId === 'string' && /^[a-f0-9]{10,64}$/i.test(threadId)
    ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'darthalgo67@gmail.com')}#all/${threadId}` : null;
}
function base(id: string, category: FounderInboxCategory, source: string, at: unknown): FounderInboxItem {
  return {id, category, source, at: date(at), kind: category, title: '', preview: '', body: '', sender: '', sourceHref: null, customerId: null, jobId: null, runId: null, severity: 'info', sourceStatus: 'recorded', contentCoverage: 'alert', unread: true, state: emptyInboxState()};
}
export function mapInboxSource(source: string, value: Row): FounderInboxItem {
  let item: FounderInboxItem;
  if (source === 'support') {
    item = base(`support:${value.id}`, 'customer', 'Support conversation ledger', value.last_message_at);
    item.kind = text(value.category, 100) || 'support'; item.title = text(value.subject, 300) || 'Customer conversation';
    item.body = text(value.summary) || 'A support case is recorded, but its message body has not been synchronized.';
    item.sender = text(value.provider, 100) || 'Customer'; item.customerId = text(value.customer_key, 200) || null;
    item.sourceHref = gmailHref(value.provider, value.provider_thread_id); item.sourceStatus = text(value.status, 100);
    item.severity = value.requires_founder === true ? 'warning' : 'info'; item.contentCoverage = 'summary_only';
  } else if (source === 'loops') {
    // Re-observing the same unresolved issue must not make it unread on every
    // watchdog pass. The creation timestamp identifies the alert occurrence.
    item = base(`loop:${value.id}`, 'alert', 'Business attention ledger', value.first_seen_at || value.last_seen_at);
    item.kind = text(value.category, 100); item.title = text(value.title, 300) || 'Business alert';
    item.body = [text(value.why), text(value.founder_action) ? `Your next action: ${text(value.founder_action)}` : '', text(value.resume_action) ? `Next step: ${text(value.resume_action)}` : ''].filter(Boolean).join('\n\n');
    item.sender = text(value.service, 100) || 'Operations'; item.sourceStatus = text(value.status, 100);
    item.sourceHref = safeInboxHref(row(value.details).href) || '/owner/connections';
    item.jobId = value.source_type === 'job' ? text(value.source_id, 100) || null : null;
    item.severity = value.severity === 'critical' ? 'critical' : value.severity === 'warning' ? 'warning' : 'info';
  } else if (source === 'approvals') {
    const payload = row(value.payload);
    item = base(`approval:${value.id}`, 'alert', 'Exact-version decision ledger', value.created_at);
    item.kind = 'decision'; item.title = text(payload.summary, 300) || 'A saved decision needs review';
    item.body = text(payload.details) || text(payload.text) || 'Open the existing decision workflow to review the exact scope and version.';
    item.sender = 'Decision review'; item.sourceHref = payload.executor === 'indicator_release_v1' ? '/owner/indicators' : '/owner?legacy=1&view=inbox';
    item.sourceStatus = text(value.status, 100); item.severity = 'warning';
  } else {
    item = base(`message:${value.id}`, 'agent', 'Persisted agent messages', value.created_at);
    item.kind = 'agent_update'; item.sender = `${text(value.department, 100).replaceAll('_', ' ')} agent`;
    item.body = text(value.body); item.title = item.body.split('\n').find(line => line.trim())?.slice(0, 120) || 'Agent update';
    item.runId = text(value.run_id, 100) || null; item.jobId = text(value.job_id, 100) || null;
    item.sourceHref = '/owner/team'; item.contentCoverage = typeof value.body === 'string' && value.body.length > 20000 ? 'summary_only' : 'full_message';
  }
  item.preview = item.body.replace(/\s+/g, ' ').slice(0, 220);
  return item;
}

export const founderInboxSchema = `
create table if not exists os_founder_inbox_state (
 item_id text primary key, version integer not null default 0 check(version>=0),
 read_at timestamptz, snoozed_until timestamptz, resolved_at timestamptz,
 draft text not null default '', updated_at timestamptz not null default now()
);
create table if not exists os_founder_inbox_events (
 id bigserial primary key, item_id text not null, version integer not null,
 changed_fields jsonb not null, created_at timestamptz not null default now()
);
create table if not exists os_founder_inbox_drafts (
 item_id text not null, version integer not null, body text not null,
 created_at timestamptz not null default now(), primary key(item_id,version)
);`;

export async function ensureFounderInboxSchema() {
  await db().begin(async tx => {await tx`select pg_advisory_xact_lock(73111203)`; await tx.unsafe(founderInboxSchema);});
}
async function readSource(id: string, work: () => PromiseLike<Row[]>, limit = 80): Promise<SourceResult> {
  try {return {id, status: 'read', rows: Array.from(await work()), limit};}
  catch {return {id, status: 'unavailable', rows: [], limit};}
}
const emailState = () => ({status: 'disconnected' as const, source: 'Gmail', lastSuccessfulSyncAt: null,
  reason: 'This app has no verified Gmail sync connection. Support records below are saved summaries, not a complete email inbox.',
  href: `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'darthalgo67@gmail.com')}`});

export async function founderInbox() {
  const checkedAt = new Date().toISOString();
  const capabilities = {readNativeMessages: true, saveDraft: true, markRead: true, snooze: true, resolveInboxItem: true, emailSync: false, aiDraft: false, sendEmail: false};
  let sql: ReturnType<typeof db>;
  try {sql = db();} catch {
    return {checkedAt, status: 'unavailable' as const, items: [] as FounderInboxItem[], unreadCount: null, statePersistence: 'unavailable' as const,
      sources: [], coverage: 'Saved records unavailable; no empty-inbox or zero-unread claim is made.', email: emailState(), capabilities: {...capabilities, saveDraft: false, markRead: false, snooze: false, resolveInboxItem: false}};
  }
  // Reading never initializes a schema, runs an agent, synchronizes a provider,
  // changes an approval, or sends a customer message.
  const sources = await Promise.all([
    readSource('support', () => sql`select id,provider,provider_thread_id,customer_key,category,status,subject,last_message_at,summary,requires_founder from os_support_conversations order by last_message_at desc,id limit 80`),
    readSource('loops', () => sql`select id,category,title,why,service,founder_action,resume_action,severity,status,source_type,source_id,first_seen_at,last_seen_at,details from os_open_loops where status='open' order by last_seen_at desc,id limit 80`),
    readSource('agents', () => sql`select id,department,body,run_id,created_at from os_messages where role='agent' order by created_at desc,id limit 80`),
    readSource('approvals', () => sql`select id,payload,status,created_at from os_approvals where status='pending' and expires_at>now() order by created_at desc,id limit 80`),
  ]);
  let statePersistence: 'ready' | 'not_initialized' | 'unavailable' = 'unavailable';
  const states = new Map<string, FounderInboxState>();
  try {
    const [exists] = await sql`select to_regclass('public.os_founder_inbox_state') is not null as present`;
    if (exists?.present) {
      const ids = sources.flatMap(source => source.rows.map(value => mapInboxSource(source.id, value).id));
      const saved = ids.length ? await sql`select * from os_founder_inbox_state where item_id=any(${ids})` : [];
      for (const savedState of saved) states.set(String(savedState.item_id), inboxState(savedState));
      statePersistence = 'ready';
    } else statePersistence = 'not_initialized';
  } catch {/* Native messages stay available if presentation state cannot be read. */}
  const approvalSource = sources.find(source => source.id === 'approvals');
  const approvalIds = new Set(approvalSource?.rows.map(value => String(value.id)) || []);
  const items = sources.flatMap(source => source.rows
    .filter(value => !(source.id === 'loops' && value.source_type === 'approval' && approvalIds.has(String(value.source_id))))
    .map(value => {
      const item = mapInboxSource(source.id, value); item.state = states.get(item.id) || emptyInboxState();
      if (item.state.resolvedAt && item.at && Date.parse(item.at) > Date.parse(item.state.resolvedAt)) item.state = {...item.state, resolvedAt: null};
      item.unread = statePersistence === 'unavailable' ? null : inboxUnread(item.at, item.state);
      return item;
    })).sort((a, b) => (Date.parse(b.at || '') || 0) - (Date.parse(a.at || '') || 0));
  const visible = items.filter(item => !item.state.resolvedAt && !(item.state.snoozedUntil && Date.parse(item.state.snoozedUntil) > Date.parse(checkedAt)));
  return {checkedAt, status: sources.every(source => source.status === 'unavailable') ? 'unavailable' as const : sources.some(source => source.status === 'unavailable') || statePersistence === 'unavailable' ? 'partial' as const : 'ready' as const,
    items, unreadCount: statePersistence === 'unavailable' || sources.some(source => source.status === 'unavailable') ? null : visible.filter(item => item.unread).length,
    statePersistence, sources: sources.map(({id, status, rows, limit}) => ({id, status, returned: rows.length, limit, bounded: rows.length === limit, lastRecordAt: rows.length ? mapInboxSource(id, rows[0]).at : null})),
    coverage: 'Up to 80 records per native source. Unread counts cover these records only. Customer entries are persisted summaries; full email history is not connected.',
    email: emailState(), capabilities: {...capabilities, saveDraft: statePersistence !== 'unavailable', markRead: statePersistence !== 'unavailable', snooze: statePersistence !== 'unavailable', resolveInboxItem: statePersistence !== 'unavailable'}};
}

async function sourceItem(id: string): Promise<FounderInboxItem | null> {
  const [kind, key] = id.split(':'); const sql = db(); let values: Row[];
  if (kind === 'support') values = await sql`select * from os_support_conversations where id=${key}`;
  else if (kind === 'loop') values = await sql`select * from os_open_loops where id=${key}`;
  else if (kind === 'approval') values = await sql`select id,payload,status,created_at from os_approvals where id=${key}`;
  else values = await sql`select * from os_messages where id=${key} and role='agent'`;
  return values[0] ? mapInboxSource(kind === 'loop' ? 'loops' : kind === 'approval' ? 'approvals' : kind, values[0]) : null;
}
export async function founderInboxDetail(id: string) {
  if (!validInboxId(id)) throw new Error('INVALID_INBOX_ID');
  const item = await sourceItem(id); if (!item) return null;
  const sql = db(); let stateAvailable = true;
  const history: Array<{version: number; body: string; at: string | null}> = [];
  try {
    const [exists] = await sql`select to_regclass('public.os_founder_inbox_state') is not null as present`;
    if (exists?.present) {const [saved] = await sql`select * from os_founder_inbox_state where item_id=${id}`; item.state = inboxState(saved);}
  } catch {stateAvailable = false;}
  item.unread = stateAvailable ? inboxUnread(item.at, item.state) : null;
  if (item.state.resolvedAt && item.at && Date.parse(item.at) > Date.parse(item.state.resolvedAt)) item.state = {...item.state, resolvedAt: null};
  const messages: Array<{id: string; role: string; body: string; at: string | null; truncated: boolean}> = [];
  if (item.category === 'agent' && item.runId) {
    const values = await sql`select id,role,body,created_at from os_messages where run_id=${item.runId} order by created_at,id limit 100`;
    messages.push(...values.map(value => ({id: String(value.id), role: text(value.role, 30), body: text(value.body), at: date(value.created_at), truncated: typeof value.body === 'string' && value.body.length > 20000})));
  } else messages.push({id: item.id, role: item.category === 'customer' ? 'summary' : 'system', body: item.body, at: item.at, truncated: item.contentCoverage === 'summary_only'});
  try {const values = await sql`select version,body,created_at from os_founder_inbox_drafts where item_id=${id} order by version desc limit 5`; history.push(...values.map(value => ({version: Number(value.version), body: text(value.body), at: date(value.created_at)})));} catch {/* No draft history before the first saved reply. */}
  return {item, messages, draftHistory: history, stateAvailable, email: emailState(), canSend: false, checkedAt: new Date().toISOString()};
}

export function validateInboxUpdate(value: unknown, now = Date.now()): {id: string; expectedVersion: number; patch: FounderInboxPatch} {
  const input = row(value); if (input.operation !== 'update' || !validInboxId(input.id) || !Number.isSafeInteger(input.expectedVersion) || Number(input.expectedVersion) < 0) throw new Error('INVALID_INBOX_UPDATE');
  const patch = row(input.patch), keys = Object.keys(patch);
  if (!keys.length || keys.some(key => !['read','snoozedUntil','resolved','draft'].includes(key))) throw new Error('INVALID_INBOX_UPDATE');
  if ('read' in patch && typeof patch.read !== 'boolean' || 'resolved' in patch && typeof patch.resolved !== 'boolean') throw new Error('INVALID_INBOX_UPDATE');
  if ('draft' in patch && (typeof patch.draft !== 'string' || patch.draft.length > 20000 || !input.id.startsWith('support:'))) throw new Error('INVALID_DRAFT');
  if ('snoozedUntil' in patch && patch.snoozedUntil !== null) {
    const until = typeof patch.snoozedUntil === 'string' ? Date.parse(patch.snoozedUntil) : NaN;
    if (!Number.isFinite(until) || until <= now || until > now + 30 * 86400000) throw new Error('INVALID_SNOOZE');
    patch.snoozedUntil = new Date(until).toISOString();
  }
  return {id: input.id, expectedVersion: Number(input.expectedVersion), patch: patch as FounderInboxPatch};
}
export async function updateFounderInbox(value: unknown) {
  const {id, expectedVersion, patch} = validateInboxUpdate(value);
  if (!await sourceItem(id)) return {status: 'not_found' as const};
  await ensureFounderInboxSchema();
  return db().begin(async tx => {
    // The insert and row lock serialize first saves and phone/computer edits.
    await tx`insert into os_founder_inbox_state(item_id) values(${id}) on conflict do nothing`;
    const [saved] = await tx`select * from os_founder_inbox_state where item_id=${id} for update`;
    const current = inboxState(saved);
    if (current.version !== expectedVersion) return {status: 'conflict' as const, state: current, message: 'This item changed on another device. Review the saved version before saving your draft.'};
    const now = new Date().toISOString();
    const next: FounderInboxState = {...current, version: current.version + 1, updatedAt: now,
      readAt: patch.read === undefined ? current.readAt : patch.read ? now : null,
      snoozedUntil: 'snoozedUntil' in patch ? patch.snoozedUntil ?? null : current.snoozedUntil,
      resolvedAt: patch.resolved === undefined ? current.resolvedAt : patch.resolved ? now : null,
      draft: patch.draft === undefined ? current.draft : patch.draft};
    await tx`update os_founder_inbox_state set version=${next.version},read_at=${next.readAt},snoozed_until=${next.snoozedUntil},resolved_at=${next.resolvedAt},draft=${next.draft},updated_at=${now} where item_id=${id}`;
    if (patch.draft !== undefined && patch.draft !== current.draft) await tx`insert into os_founder_inbox_drafts(item_id,version,body) values(${id},${next.version},${next.draft})`;
    await tx`insert into os_founder_inbox_events(item_id,version,changed_fields) values(${id},${next.version},${tx.json(Object.keys(patch))})`;
    return {status: 'saved' as const, state: next, message: patch.draft !== undefined ? 'Draft saved to your account. No email was sent.' : patch.resolved === true ? 'Hidden from your Inbox. The underlying business issue is unchanged.' : 'Saved to your account.', sent: false};
  });
}
