import { createHash } from "node:crypto";
import type { TransactionSql } from "postgres";
import { db } from "../affiliate-db";
import { assertRecurringEnvelope, recurringBudgetPolicy, usageMicros, type RecurringBudgetPolicy } from "./budget-policy";

// Append this additive migration to the existing owner-only schema initialization.
export const budgetSchema = `
create table if not exists os_ai_budget_reservations (
 request_key text primary key, request_hash text not null, model text not null,
 created_at timestamptz not null default now(), recorded_at timestamptz,
 budget_day date not null, budget_month date not null,
 reserved_micros bigint not null check(reserved_micros > 0),
 charged_micros bigint not null constraint os_ai_budget_charged_nonnegative check(charged_micros >= 0),
 daily_limit_micros bigint not null, monthly_limit_micros bigint not null,
 input_usd_per_million numeric not null, output_usd_per_million numeric not null,
 status text not null default 'reserved' check(status in ('reserved','recorded','held')),
 input_tokens bigint, output_tokens bigint, actual_micros bigint,
 anomaly boolean not null default false, error_code text
);
-- Earlier versions retained the full reservation even after verified usage.
-- Discover the generated constraint name so this is safe for existing databases.
do $$
declare old_constraint record;
begin
 for old_constraint in select conname from pg_constraint
  where conrelid='os_ai_budget_reservations'::regclass and contype='c'
   and pg_get_constraintdef(oid) ~ 'charged_micros.*>=.*reserved_micros'
 loop
  execute format('alter table os_ai_budget_reservations drop constraint %I',old_constraint.conname);
 end loop;
 if not exists(select 1 from pg_constraint where conrelid='os_ai_budget_reservations'::regclass
  and conname='os_ai_budget_charged_nonnegative') then
  alter table os_ai_budget_reservations add constraint os_ai_budget_charged_nonnegative check(charged_micros >= 0);
 end if;
end $$;
update os_ai_budget_reservations set charged_micros=actual_micros
 where status='recorded' and not anomaly and actual_micros>=0
  and actual_micros<=reserved_micros and charged_micros=reserved_micros;
create index if not exists os_ai_budget_periods on os_ai_budget_reservations(budget_month,budget_day);
`;

const lockId = 730915;
async function budgetSnapshot(sql: TransactionSql) {
  const [period] = await sql`select at_utc::date::text as day,date_trunc('month',at_utc)::date::text as month
    from (select clock_timestamp() at time zone 'UTC' as at_utc) period`;
  const [totals] = await sql`
    select coalesce(sum(charged_micros) filter (where budget_day=${period.day}::date or status <> 'recorded'),0)::text as daily,
           coalesce(sum(charged_micros) filter (where budget_month=${period.month}::date or status <> 'recorded'),0)::text as monthly,
           coalesce(bool_or(anomaly),false) as anomaly
    from os_ai_budget_reservations`;
  const daily = Number(totals.daily), monthly = Number(totals.monthly);
  if (![daily, monthly].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error("AI_BUDGET_INVALID_TOTALS");
  return { day: period.day as string, month: period.month as string, daily, monthly, anomaly: !!totals.anomaly };
}

function exhaustedReason(totals: { daily: number; monthly: number; anomaly: boolean }, policy: RecurringBudgetPolicy) {
  if (totals.anomaly) return "AI_BUDGET_USAGE_ANOMALY";
  if (totals.daily + policy.reservationMicros > policy.dailyMicros) return "AI_DAILY_BUDGET_EXHAUSTED";
  if (totals.monthly + policy.reservationMicros > policy.monthlyMicros) return "AI_MONTHLY_BUDGET_EXHAUSTED";
  return undefined;
}

// Read-only queue gate; reserveRecurringBudget is the authoritative atomic guard.
export async function recurringBudgetAvailability(): Promise<{ available: boolean; reason?: string; dailyMicros?: number; monthlyMicros?: number }> {
  try {
    const policy = recurringBudgetPolicy();
    return await db().begin(async sql => {
      await sql`select pg_advisory_xact_lock(${lockId})`;
      const totals = await budgetSnapshot(sql);
      const reason = exhaustedReason(totals, policy);
      return { available: !reason, reason, dailyMicros: totals.daily, monthlyMicros: totals.monthly };
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return { available: false, reason: /^AI_[A-Z_]+$/.test(code) ? code : "AI_BUDGET_UNAVAILABLE" };
  }
}

export async function reserveRecurringBudget(requestKey: string, bodyText: string, provider = "openai") {
  const policy = recurringBudgetPolicy();
  if (!/^[a-zA-Z0-9:_-]{1,200}$/.test(requestKey)) throw new Error("AI_BUDGET_INVALID_REQUEST_KEY");
  assertRecurringEnvelope(bodyText, provider, policy);
  const requestHash = createHash("sha256").update(bodyText).digest("hex");
  return db().begin(async sql => {
    // Every reserve and settlement takes the same transaction-scoped database lock.
    // A process mutex or a read-then-insert outside this transaction is insufficient.
    await sql`select pg_advisory_xact_lock(${lockId})`;
    const existing = await sql`select request_hash from os_ai_budget_reservations where request_key=${requestKey}`;
    if (existing.length) throw new Error(existing[0].request_hash === requestHash ? "AI_BUDGET_ALREADY_RESERVED" : "AI_BUDGET_REQUEST_KEY_CONFLICT");
    const totals = await budgetSnapshot(sql);
    // Unknown/in-flight charges remain held across period boundaries until reconciled.
    const reason = exhaustedReason(totals, policy);
    if (reason) throw new Error(reason);
    await sql`insert into os_ai_budget_reservations
      (request_key,request_hash,model,budget_day,budget_month,reserved_micros,charged_micros,daily_limit_micros,monthly_limit_micros,input_usd_per_million,output_usd_per_million)
      values(${requestKey},${requestHash},${policy.model},${totals.day}::date,
      ${totals.month}::date,${policy.reservationMicros},${policy.reservationMicros},
      ${policy.dailyMicros},${policy.monthlyMicros},${policy.inputUsdPerMillion},${policy.outputUsdPerMillion})`;
    return { requestKey, reservedMicros: policy.reservationMicros };
  });
}

export async function holdRecurringReservation(requestKey: string, errorCode = "AI_BUDGET_UNKNOWN_OUTCOME") {
  // No automatic release or retry after timeout, malformed output, provider error, or crash.
  await db().begin(async sql => {
    await sql`select pg_advisory_xact_lock(${lockId})`;
    await sql`update os_ai_budget_reservations set status='held',error_code=${errorCode.slice(0,100)}
      where request_key=${requestKey} and status <> 'recorded'`;
  });
}

export async function recordRecurringUsage(requestKey: string, usage: { inputTokens: unknown; outputTokens: unknown }) {
  await db().begin(async sql => {
    await sql`select pg_advisory_xact_lock(${lockId})`;
    const [row] = await sql`select * from os_ai_budget_reservations where request_key=${requestKey} for update`;
    if (!row) throw new Error("AI_BUDGET_RESERVATION_MISSING");
    let actual: number;
    try { actual = usageMicros(usage, Number(row.input_usd_per_million), Number(row.output_usd_per_million)); }
    catch {
      if (row.status === "recorded") return; // An invalid replay cannot erase a known settlement.
      await sql`update os_ai_budget_reservations set status='held',error_code='AI_BUDGET_UNKNOWN_USAGE' where request_key=${requestKey}`;
      return; // Commit the hold; throwing here would roll it back.
    }
    // Exact duplicates are harmless. Conflicting settlement is an operator-review stop.
    if (row.status === "recorded") {
      if (Number(row.input_tokens) === usage.inputTokens && Number(row.output_tokens) === usage.outputTokens) return;
      await sql`update os_ai_budget_reservations set anomaly=true,error_code='AI_BUDGET_USAGE_CONFLICT',
        charged_micros=greatest(charged_micros,reserved_micros,${actual}) where request_key=${requestKey}`;
      return;
    }
    await sql`update os_ai_budget_reservations set status='recorded',recorded_at=now(),
      input_tokens=${Number(usage.inputTokens)},output_tokens=${Number(usage.outputTokens)},actual_micros=${actual},
      charged_micros=${actual},anomaly=anomaly or ${actual > Number(row.reserved_micros)},
      error_code=case when ${actual > Number(row.reserved_micros)} then 'AI_BUDGET_USAGE_EXCEEDS_RESERVATION' else null end
      where request_key=${requestKey}`;
  });
}
