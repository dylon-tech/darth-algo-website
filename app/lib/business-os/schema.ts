import { db } from "../affiliate-db";

// Additive, explicitly initialized through the owner-only init operation.
// Existing affiliate/growth schemas are not altered or initialized here.
export const schema = `
create table if not exists os_runs (
 id uuid primary key, request_key text not null unique,
 status text not null check(status in ('running','completed','failed')),
 created_at timestamptz not null default now(), finished_at timestamptz,
 snapshot jsonb, result jsonb, error_code text
);
create unique index if not exists os_one_running on os_runs ((status)) where status='running';
create table if not exists os_tasks (
 id uuid primary key, department text not null,
 title text not null, priority integer not null check(priority between 1 and 5),
 status text not null default 'queued' check(status in ('queued','in_progress','blocked','completed','cancelled')),
 dedupe_key text not null, evidence jsonb not null, run_id uuid references os_runs(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists os_open_task_dedupe on os_tasks(dedupe_key) where status in ('queued','in_progress','blocked');
create table if not exists os_approvals (
 id uuid primary key, run_id uuid references os_runs(id),
 payload jsonb not null, payload_hash text not null,
 status text not null default 'pending' check(status in ('pending','approved','declined','revision_requested','expired')),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 decided_at timestamptz, decided_by text, decision_note text
);
create unique index if not exists os_pending_approval_dedupe on os_approvals(payload_hash) where status='pending';
create table if not exists os_activity (
 id bigserial primary key, created_at timestamptz not null default now(),
 actor text not null, event text not null, entity_id text, details jsonb not null
);
create index if not exists os_activity_recent on os_activity(created_at desc);
create table if not exists os_messages (
 id uuid primary key, department text not null, role text not null check(role in ('owner','agent')),
 body text not null, run_id uuid references os_runs(id), created_at timestamptz not null default now()
);
`;

export async function initializeOS() {
  await db().begin(async sql => {
    await sql`select pg_advisory_xact_lock(730914)`;
    await sql.unsafe(schema);
    await sql`insert into os_activity(actor,event,details) values('owner','schema_initialized','{}'::jsonb)`;
  });
}
