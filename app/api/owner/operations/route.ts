import { db } from '../../../lib/affiliate-db';
import { ownerSessionFromRequest, privateHeaders } from '../../../lib/business-os/owner-session';
import { pilotSessionLimit } from '../../../lib/business-os/hosted-browser';
import { publicOperationUrl, recentTimestamp, type OperationsSnapshot } from '../../../lib/business-os/operations-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
type Row = Record<string, unknown>;
const object = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const text = (value: unknown): string | null => typeof value === 'string' ? value : value instanceof Date ? value.toISOString() : null;
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;

export async function GET(request: Request) {
  if (!ownerSessionFromRequest(request)) return Response.json({error: 'Unauthorized'}, {status: 401, headers: privateHeaders});
  const checkedAt = new Date().toISOString();
  const day = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  const partial: string[] = [];
  async function read(name: string, query: () => PromiseLike<Row[]>) {
    try { return Array.from(await query()); }
    catch { partial.push(name); return []; }
  }
  try {
    const sql = db();
    // Every query is bounded and read-only. Opening the dashboard does not run an
    // agent, contact a provider, send a post, or increase any spending allowance.
    const [controls, heartbeats, events, receipts, whop, candidates, ideas, browser, handoffs, runs, queues] = await Promise.all([
      read('control', () => sql`select paused from os_control where id=1`),
      read('scheduler', () => sql`select status,last_seen_at from os_worker_heartbeat where id=1`),
      read('content', () => sql`select distinct on(event) event,details,created_at from os_activity where event in ('daily_social_ready','daily_social_status') and entity_id=${day} order by event,id desc`),
      read('social_receipts', () => sql`select p.entity_id,r.details,r.created_at from os_activity p left join lateral (select details,created_at from os_activity where entity_id=p.details->>'approvalId' and event='buffer_publish_checked' order by (details->>'published'='true') desc nulls last,id desc limit 1) r on true where p.event='daily_social_prepared' and p.entity_id in (${day+':x'},${day+':instagram'},${day+':threads'}) order by p.id desc limit 3`),
      read('whop_receipts', () => sql`select event,details,created_at from os_activity where event in ('whop_home_publish_receipt','whop_home_publish_unknown','whop_home_publish_started','whop_home_preflight') and entity_id=${'daily-whop:'+day} order by id desc limit 8`),
      read('indicators', () => sql`select id,candidate->>'name' as name,status,created_at,tradingview_url from os_indicator_candidates order by created_at desc limit 6`),
      read('indicator_jobs', () => sql`select j.request_key,j.status,r.result->>'brief' as brief from os_jobs j left join os_runs r on r.id=j.run_id where j.request_key in (${`indicator-ideas:${day}:research`},${`indicator-ideas:${day}:growth`}) or j.request_key like ${`indicator:${day}:%`} order by j.created_at desc limit 8`),
      read('browser', () => sql`select secret is not null as connected,attempts,verification_status,verified_at from os_browser_connection where id=1`),
      read('indicator_handoff', () => sql`select details,created_at from os_activity where event='indicator_handoff' order by id desc limit 1`),
      read('team', () => sql`select distinct on(department) department,status,finished_at from os_runs order by department,created_at desc`),
      read('queue', () => sql`select department,count(*) filter(where status='queued')::int as queued,count(*) filter(where status='running' and started_at>now()-interval '5 minutes')::int as running,count(*) filter(where status='running' and (started_at is null or started_at<=now()-interval '5 minutes'))::int as stale from os_jobs where status in ('queued','running') group by department`),
    ]);
    const campaignEvent = events.find(row => row.event === 'daily_social_ready');
    const campaign = object(campaignEvent?.details);
    const statusEvent = events.find(row => row.event === 'daily_social_status');
    const statuses = object(object(statusEvent?.details).deliveries);
    const assets = Array.isArray(campaign.assets) ? campaign.assets : [];
    const heartbeat = heartbeats[0];
    const paused = typeof controls[0]?.paused === 'boolean' ? controls[0].paused : null;
    const lastSeenAt = text(heartbeat?.last_seen_at);
    const fresh = recentTimestamp(lastSeenAt);
    const deliveries = ['x','instagram','threads','whop'].map(network => {
      const receipt = network === 'whop' ? whop.find(row => row.event === 'whop_home_publish_receipt') : receipts.find(row => row.entity_id === `${day}:${network}`);
      const details = object(receipt?.details);
      const postId = text(details.postId);
      const published = details.published === true && Boolean(postId);
      const sourceUnavailable = partial.includes(network === 'whop' ? 'whop_receipts' : 'social_receipts');
      return {network, published, postId, url: published ? publicOperationUrl(details.externalLink,network) : null, checkedAt: text(details.checkedAt) || text(receipt?.created_at), state: published ? 'published' : sourceUnavailable ? 'unknown' : text(statuses[network]) || 'unknown'};
    });
    const research = ideas.find(row => row.request_key === `indicator-ideas:${day}:research`);
    const growth = ideas.find(row => row.request_key === `indicator-ideas:${day}:growth`);
    const building = ideas.find(row => text(row.request_key)?.startsWith(`indicator:${day}:`) && ['queued','running'].includes(String(row.status)));
    let stage = !research ? 'research_not_recorded' : research.status !== 'succeeded' ? `research_${String(research.status)}` : !growth ? 'growth_not_recorded' : growth.status !== 'succeeded' ? `growth_${String(growth.status)}` : /^BUILD_NONE\b/.test(text(growth.brief)?.trim() || '') ? 'no_supported_idea' : 'ready';
    if (building) stage = String(building.status);
    else if (candidates.some(row => row.status === 'pending')) stage = 'awaiting_approval';
    else if (candidates.some(row => row.status === 'approved')) stage = 'awaiting_release';
    else if (stage === 'ready' && candidates.some(row => row.status === 'qa_blocked')) stage = 'awaiting_private_test';
    const labEnabled = process.env.AI_OS_INDICATOR_LAB_ENABLED === 'true';
    if (!labEnabled) stage = 'disabled';
    else if (paused === true) stage = 'paused';
    else if (partial.includes('indicator_jobs')) stage = 'unknown';
    const departments = ['ceo','growth','content','support','affiliates','analytics','research','operations'];
    const snapshot: OperationsSnapshot = {
      checkedAt, day, environment: process.env.VERCEL_ENV || 'development', partial,
      scheduler: {enabled: process.env.AI_OS_AUTONOMY_ENABLED === 'true', paused, lastSeenAt, fresh, state: text(heartbeat?.status) || 'unknown'},
      content: {prepared: Boolean(campaignEvent), preparedAt: text(campaignEvent?.created_at), previewUrl: publicOperationUrl(object(assets[0]).url,'asset'), caption: text(campaign.text), assets: assets.length},
      deliveries,
      indicator: {enabled: labEnabled, stage, candidates: candidates.map(row => ({id: String(row.id), name: text(row.name) || 'Untitled prototype', status: String(row.status), createdAt: text(row.created_at), url: publicOperationUrl(row.tradingview_url,'tradingview')})), browserConnected: browser.length ? browser[0].connected === true : null, browserStartsRemaining: number(browser[0]?.attempts) === null ? null : Math.max(0,pilotSessionLimit-Number(browser[0].attempts)), loginVerified: browser.length ? Boolean(browser[0].verified_at && browser[0].verification_status === 'verified') : null, releaseExecutorConnected: false, lastHandoff: text(object(handoffs[0]?.details).reason), lastHandoffAt: text(handoffs[0]?.created_at), researchState: text(research?.status)},
      team: departments.map(id => {
        const run = runs.find(row => row.department === id), queue = queues.find(row => row.department === id);
        const queued = number(queue?.queued) || 0, running = number(queue?.running) || 0;
        return {id, state: partial.includes('team') || partial.includes('queue') ? 'unknown' : (number(queue?.stale) || 0) > 0 ? 'stale' : running && fresh ? 'running' : running ? 'stale' : queued ? 'queued' : paused === true ? 'paused' : text(run?.status) || 'no_record', finishedAt: text(run?.finished_at), queued, running, error: null};
      }),
    };
    return Response.json(snapshot, {headers: privateHeaders});
  } catch { return Response.json({error: 'OPERATIONS_UNAVAILABLE', message: 'Live operations could not be read. No work was started.'}, {status: 503, headers: privateHeaders}); }
}
