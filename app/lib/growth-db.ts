import { createHmac, randomUUID } from "crypto";
import { db } from "./affiliate-db";

export const growthSources = [
  "direct",
  "reddit",
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "forums",
  "stocktwits",
  "x",
  "affiliate",
  "email",
  "customer",
  "ads",
  "telegram",
] as const;

export type GrowthSource = (typeof growthSources)[number];

let growthSchemaReady: Promise<void> | undefined;

export function normalizeGrowthSource(value: string | null | undefined): GrowthSource {
  const normalized = (value || "direct").trim().toLowerCase();
  return growthSources.includes(normalized as GrowthSource) ? normalized as GrowthSource : "direct";
}

export function normalizeCampaign(value: string | null | undefined) {
  return (value || "default").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64) || "default";
}

export function ensureGrowthSchema() {
  growthSchemaReady ??= (async () => {
    const sql = db();
    await sql`
      create table if not exists community_growth_sources (
        source text primary key,
        invite_link text not null unique,
        invite_name text not null,
        active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists community_growth_events (
        id uuid primary key,
        created_at timestamptz not null default now(),
        event_type text not null check (event_type in ('page_view','outbound_click','telegram_join')),
        source text not null,
        campaign text not null default 'default',
        visitor_id text,
        telegram_user_hash text
      )
    `;
    await sql`create index if not exists community_growth_events_created_at_idx on community_growth_events(created_at desc)`;
    await sql`create index if not exists community_growth_events_source_idx on community_growth_events(source,created_at desc)`;
    await sql`create unique index if not exists community_growth_unique_join_idx on community_growth_events(telegram_user_hash) where event_type='telegram_join' and telegram_user_hash is not null`;
  })();
  return growthSchemaReady;
}

export async function trackGrowthEvent(input: {
  eventType: "page_view" | "outbound_click" | "telegram_join";
  source?: string | null;
  campaign?: string | null;
  visitorId?: string | null;
  telegramUserId?: number | string | null;
}) {
  await ensureGrowthSchema();
  const source = normalizeGrowthSource(input.source);
  const campaign = normalizeCampaign(input.campaign);
  const visitorId = input.visitorId?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || null;
  const telegramUserHash = input.telegramUserId == null
    ? null
    : createHmac("sha256", process.env.TELEGRAM_WEBHOOK_SECRET || "darth-algo-growth")
        .update(String(input.telegramUserId))
        .digest("hex");
  await db()`
    insert into community_growth_events(id,event_type,source,campaign,visitor_id,telegram_user_hash)
    values(${randomUUID()},${input.eventType},${source},${campaign},${visitorId},${telegramUserHash})
    on conflict do nothing
  `;
}

export async function saveGrowthInvite(source: GrowthSource, inviteLink: string) {
  await ensureGrowthSchema();
  const inviteName = `Darth Algo — ${source}`;
  await db()`
    insert into community_growth_sources(source,invite_link,invite_name)
    values(${source},${inviteLink},${inviteName})
    on conflict(source) do update set invite_link=excluded.invite_link,invite_name=excluded.invite_name,active=true,updated_at=now()
  `;
}

export async function getConfiguredGrowthSources() {
  await ensureGrowthSchema();
  const rows = await db()`select source from community_growth_sources where active=true`;
  return new Set(
    rows
      .map((row) => typeof row.source === "string" ? normalizeGrowthSource(row.source) : null)
      .filter((source): source is GrowthSource => source !== null),
  );
}

export async function getGrowthInvite(sourceValue: string | null | undefined) {
  await ensureGrowthSchema();
  const source = normalizeGrowthSource(sourceValue);
  const [row] = await db()`select invite_link from community_growth_sources where source=${source} and active=true`;
  return typeof row?.invite_link === "string" ? row.invite_link : process.env.TELEGRAM_COMMUNITY_URL || "https://www.darthalgo.com/community";
}

export async function sourceFromInvite(inviteLink: string | undefined) {
  if (!inviteLink) return "direct" as GrowthSource;
  await ensureGrowthSchema();
  const [row] = await db()`select source from community_growth_sources where invite_link=${inviteLink} and active=true`;
  return normalizeGrowthSource(typeof row?.source === "string" ? row.source : "direct");
}
