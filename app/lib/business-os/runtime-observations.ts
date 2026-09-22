import { db } from '../affiliate-db';
import type { Observation } from './desk-state';
// Latest result only: bounded storage, no credentials, prompts, customer data or media blobs.
const fields = ['status','code','reason','day','theme','assetsReady','communityReadiness','ideaStage','privateTesting','privatePackage','publishing','socialDiscovery','hostedBrowser','hostedBrowserStartsRemaining','candidates','pending','cardsDelivered','cardsQueued','lastHandoff','delivered','panelDelivered','view'];
const ids = ['social','telegram','indicators','research','handoffs','team'];
let schemaReady = false;
async function ensureTable() {
  if (schemaReady) return;
  const sql = db();
  const [table] = await sql`select to_regclass('public.os_runtime_observations') as relation`;
  if (!table?.relation) await sql`create table if not exists os_runtime_observations (id text primary key, details jsonb not null, started_at timestamptz not null, observed_at timestamptz not null default now())`;
  schemaReady = true;
}
export async function recordObservation(id: string, value: unknown, startedAt = new Date().toISOString()) {
  try {
    if (!ids.includes(id)) return;
    const input = value && typeof value === 'object' ? value as Record<string,unknown> : {};
    const details: Record<string, string | number | boolean | Record<string,string>> = {};
    for (const key of fields) {
      const v = input[key];
      if (typeof v === 'string') details[key] = v.slice(0,240);
      else if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) details[key] = v;
    }
    if (input.deliveries && typeof input.deliveries === 'object') {
      const source = input.deliveries as Record<string,unknown>, deliveries: Record<string,string> = {};
      for (const network of ['x','instagram','threads','whop']) if (typeof source[network] === 'string') deliveries[network] = String(source[network]).slice(0,100);
      details.deliveries = deliveries;
    }
    await ensureTable();
    const sql = db();
    await sql`insert into os_runtime_observations(id,details,started_at) values(${id},${sql.json(details)},${startedAt}) on conflict(id) do update set details=excluded.details,started_at=excluded.started_at,observed_at=now() where os_runtime_observations.started_at<=excluded.started_at`;
  } catch { console.warn(JSON.stringify({event:'owner_observation_unavailable',service:id})); }
}
export async function observed<T>(id: string, work: () => Promise<T>): Promise<T> {
  const startedAt = new Date().toISOString();
  try { const result = await work(); await recordObservation(id,result,startedAt); return result; }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    await recordObservation(id,{status:'blocked',code:/^(AI_|BUFFER_|INSTAGRAM_|VIDIQ_)[A-Z0-9_]+$/.test(message) ? message : 'CHECK_REQUIRED'},startedAt);
    throw error; // Observability must not change execution or retry behavior.
  }
}
export async function latestObservations(): Promise<{ available: boolean; services: Observation[] }> {
  try {
    const rows = await db()`select id,observed_at as "observedAt",details from os_runtime_observations order by id`;
    return {available:true,services:rows as unknown as Observation[]};
  } catch { return {available:false,services:[]}; }
}
