import {db} from '../affiliate-db';
export const welcomeSchema=`
create table if not exists os_welcome_platforms (
 platform text primary key check(platform in ('instagram','x','tiktok')), account_id text, account_label text,
 sending_owner text not null default 'none' check(sending_owner in ('none','provider','backend')),
 paused boolean not null default true, mode text not null default 'not_connected', provider text,
 connected boolean not null default false, eligible boolean not null default false,
 verified_until timestamptz, credential_expires_at timestamptz, last_event_at timestamptz,
 message text not null default '', message_version integer not null default 1,
 evidence jsonb not null default '{}', updated_at timestamptz not null default now());
insert into os_welcome_platforms(platform,account_label) values('instagram','@darth.algo'),('x','Not verified'),('tiktok','Not verified') on conflict do nothing;
create table if not exists os_welcome_contacts (
 contact_key text primary key, platform text not null, account_id text not null, recipient_id text,
 opted_out boolean not null default false, automatic_started boolean not null default false,
 window_until timestamptz, last_event_at timestamptz, created_at timestamptz not null default now(),
 unique(platform,account_id,recipient_id));
create table if not exists os_welcome_events (
 platform text not null, account_id text not null, event_id text not null, contact_key text not null,
 kind text not null, occurred_at timestamptz not null, created_at timestamptz not null default now(),
 primary key(platform,account_id,event_id));
create table if not exists os_welcome_outbox (
 id uuid primary key, contact_key text not null references os_welcome_contacts(contact_key),
 request_key text not null unique, automatic boolean not null, stage text not null check(stage in ('opener','offer')),
 message_version integer not null, body text not null,
 status text not null default 'queued' check(status in ('queued','sending','accepted','delivered','suppressed','failed','unknown')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 claimed_at timestamptz, provider_id text, reason text, sent_at timestamptz, created_at timestamptz not null default now());
create index if not exists os_welcome_queue on os_welcome_outbox(next_attempt_at) where status='queued';
create unique index if not exists os_welcome_one_automatic_stage on os_welcome_outbox(contact_key,stage) where automatic;
create table if not exists os_welcome_checks (id text primary key, details jsonb not null, checked_at timestamptz not null default now());
create table if not exists os_welcome_visits (
 id uuid primary key, platform text not null check(platform in ('instagram','x','tiktok')),
 created_at timestamptz not null default now(), checkout_started_at timestamptz, is_test boolean not null default false);
create table if not exists os_welcome_stripe_inbox (
 event_id text primary key, event_type text not null, object_id text not null,
 status text not null default 'queued', attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now());
create table if not exists os_welcome_purchases (
 payment_key text primary key, customer_id text, subscription_id text, payment_intent_id text,
 source text, visit_id uuid, welcome_code boolean not null default false,
 paid_cents bigint not null, tax_cents bigint not null, refunded_cents bigint not null default 0,
 refunded_tax_cents bigint, currency text not null, paid_at timestamptz not null,
 first_paid boolean, net_cents bigint, updated_at timestamptz not null default now());
create table if not exists os_welcome_journeys (
 session_id text primary key, subscription_id text unique, source text, visit_id uuid,
 created_at timestamptz not null default now());
`;
let ready:Promise<void>|undefined;
export function ensureWelcomeSchema(){return ready??=(async()=>{try{await db().begin(async tx=>{await tx`select pg_advisory_xact_lock(730950)`;await tx.unsafe(welcomeSchema);});}catch(e){ready=undefined;throw e;}})();}
