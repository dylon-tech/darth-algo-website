import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;
let schemaReady: Promise<void> | undefined;

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  client ??= postgres(url, { max: 4, prepare: false });
  return client;
}

export function ensureAffiliateSchema() {
  schemaReady ??= (async () => {
    const sql = db();
    await sql`
      create table if not exists affiliate_applications (
        id uuid primary key,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        status text not null default 'pending' check (status in ('pending','approved','declined','paused')),
        full_name text not null,
        email text not null unique,
        password_hash text not null,
        tradingview_username text not null,
        primary_platform text not null,
        profile_url text not null,
        audience_size text not null,
        content_plan text not null,
        preferred_code text not null unique,
        payout_method text not null,
        payout_handle text not null,
        terms_accepted_at timestamptz not null,
        stripe_coupon_id text,
        stripe_promotion_code_id text unique,
        commission_rate_bps integer not null default 2500,
        approved_at timestamptz
      )
    `;
    await sql`
      create table if not exists affiliate_commissions (
        id uuid primary key,
        created_at timestamptz not null default now(),
        affiliate_id uuid not null references affiliate_applications(id),
        stripe_event_id text not null unique,
        stripe_customer_id text,
        stripe_payment_id text,
        gross_cents integer not null,
        refunded_cents integer not null default 0,
        commission_cents integer not null,
        currency text not null default 'usd',
        status text not null default 'holding' check (status in ('holding','payable','paid','reversed')),
        payable_at timestamptz not null,
        paid_at timestamptz
      )
    `;
    await sql`create index if not exists affiliate_commissions_affiliate_id_idx on affiliate_commissions(affiliate_id)`;
    await sql`create index if not exists affiliate_commissions_payable_at_idx on affiliate_commissions(payable_at)`;
    await sql`create table if not exists affiliate_webhook_events (stripe_event_id text primary key, processed_at timestamptz not null default now())`;
  })();
  return schemaReady;
}

export function normalizeAffiliateCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}
