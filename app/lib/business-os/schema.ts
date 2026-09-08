import { db } from "../affiliate-db";
import { coordinationSchema } from "./coordination";
import { budgetSchema } from "./budget";

// Additive, explicitly initialized through the owner-only init operation.
// Existing affiliate/growth schemas are not altered or initialized here.
export const schema = `
create table if not exists os_device_links (
 id uuid primary key, token_hash text not null unique,
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 used_at timestamptz, revoked_at timestamptz
);

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
alter table os_runs add column if not exists department text not null default 'ceo';
alter table os_runs add column if not exists task_id uuid references os_tasks(id);
alter table os_tasks add column if not exists result text;
alter table os_tasks add column if not exists result_kind text;
create table if not exists os_control (
 id integer primary key check(id=1), paused boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into os_control(id) values(1) on conflict do nothing;
create table if not exists os_jobs (
 id uuid primary key, request_key text not null unique, department text not null,
 message text not null, source text not null check(source in ('owner','telegram','schedule')),
 task_id uuid references os_tasks(id),
 status text not null default 'queued' check(status in ('queued','running','succeeded','failed','cancelled','unknown')),
 created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz,
 run_id uuid references os_runs(id), error_code text
);
create unique index if not exists os_one_job_running on os_jobs((status)) where status='running';
create unique index if not exists os_one_task_job on os_jobs(task_id) where status in ('queued','running');
create index if not exists os_jobs_queue on os_jobs(created_at) where status='queued';
create table if not exists os_telegram_updates (
 update_id bigint primary key, created_at timestamptz not null default now(),
 payload jsonb not null, status text not null default 'queued', processed_at timestamptz
);
create table if not exists os_telegram_state (
 owner_id bigint primary key, department text not null default 'ceo',
 revision_id uuid references os_approvals(id), revision_hash text
);
create table if not exists os_outbox (
 id uuid primary key, sequence bigserial, dedupe_key text not null unique,
 body text not null, buttons jsonb,
 status text not null default 'queued' check(status in ('queued','sending','sent','failed','unknown')),
 created_at timestamptz not null default now(), claimed_at timestamptz,
 sent_at timestamptz, provider_message_id bigint, error_code text
);
create table if not exists os_callback_actions (
 id text primary key, approval_id uuid not null references os_approvals(id),
 payload_hash text not null, decision text not null check(decision in ('approved','declined','revision_requested')),
 expires_at timestamptz not null
);
create table if not exists os_briefs (
 day date primary key, created_at timestamptz not null default now(),
 body text not null, evidence jsonb not null
);
`;

export async function initializeOS() {
  await db().begin(async sql => {
    await sql`select pg_advisory_xact_lock(730914)`;
    await sql`select pg_advisory_xact_lock(730915)`;
    await sql.unsafe(schema);
    await sql.unsafe(coordinationSchema);
    await sql.unsafe(budgetSchema);
    await sql`insert into os_activity(actor,event,details) values('owner','schema_initialized','{}'::jsonb)`;
  });
}
