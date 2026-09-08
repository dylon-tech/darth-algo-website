import { pilot } from "./pilot-policy";

// Operator configuration is required; the previous $1 pilot is not recurring consent.
// UTC limits count verified usage plus conservative unresolved request holds.
export type RecurringBudgetPolicy = {
  model: string; dailyMicros: number; monthlyMicros: number;
  reservationMicros: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
};

export function usdToMicros(value: string | undefined): number {
  if (!value || !/^(0|[1-9]\d{0,5})(\.\d{1,6})?$/.test(value)) throw new Error("AI_BUDGET_INVALID_LIMIT");
  const [whole, fraction = ""] = value.split(".");
  const micros = Number(whole) * 1_000_000 + Number(fraction.padEnd(6, "0"));
  if (!Number.isSafeInteger(micros) || micros <= 0) throw new Error("AI_BUDGET_INVALID_LIMIT");
  return micros;
}

export function recurringBudgetPolicy(env: NodeJS.ProcessEnv = process.env): RecurringBudgetPolicy {
  if (env.AI_OS_RECURRING_SPEND_APPROVED !== "true") throw new Error("AI_RECURRING_SPEND_NOT_APPROVED");
  const dailyMicros = usdToMicros(env.AI_OS_DAILY_BUDGET_USD);
  const monthlyMicros = usdToMicros(env.AI_OS_MONTHLY_BUDGET_USD);
  if (env.AI_OS_MODEL !== pilot.model) throw new Error("AI_BUDGET_UNPRICED_MODEL");
  return { model: pilot.model, dailyMicros, monthlyMicros,
    reservationMicros: Math.ceil(pilot.reservationUsd * 1_000_000),
    inputUsdPerMillion: pilot.inputUsdPerMillion, outputUsdPerMillion: pilot.outputUsdPerMillion };
}

export function assertRecurringEnvelope(bodyText: string, provider: string, policy: RecurringBudgetPolicy) {
  if (provider !== "openai") throw new Error("AI_BUDGET_UNPRICED_PROVIDER");
  const bytes = Buffer.byteLength(bodyText);
  if (bytes > pilot.maxRequestBytes) throw new Error("AI_BUDGET_REQUEST_LIMIT");
  const body = JSON.parse(bodyText);
  const allowed = new Set(["model", "store", "instructions", "max_output_tokens", "reasoning", "input", "text"]);
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).some(key => !allowed.has(key)) || body.model !== policy.model
    || body.store !== false || typeof body.instructions !== "string"
    || !Number.isSafeInteger(body.max_output_tokens) || body.max_output_tokens < 1
    || body.max_output_tokens > pilot.maxOutputTokens
    || body.reasoning?.effort !== "none" || Object.keys(body.reasoning).length !== 1
    || !Array.isArray(body.input) || body.input.length !== 1
    || body.input[0]?.role !== "user" || typeof body.input[0]?.content !== "string"
    || Object.keys(body.input[0]).some(key => !["role", "content"].includes(key))) {
    throw new Error("AI_BUDGET_UNBOUNDED_REQUEST");
  }
  // UTF-8 bytes upper-bound text tokens; 25k tokens allow for API/schema framing.
  // No images, tools, prior response context, or other billable modalities permitted.
  const upperMicros = Math.ceil((bytes + 25000) * policy.inputUsdPerMillion
    + body.max_output_tokens * policy.outputUsdPerMillion);
  if (upperMicros > policy.reservationMicros) throw new Error("AI_BUDGET_RESERVATION_TOO_SMALL");
}

export function usageMicros(usage: { inputTokens: unknown; outputTokens: unknown }, inputRate: number, outputRate: number) {
  if (![usage.inputTokens, usage.outputTokens].every(value => typeof value === "number" && Number.isSafeInteger(value) && value >= 0)) {
    throw new Error("AI_BUDGET_UNKNOWN_USAGE");
  }
  const micros = Math.ceil(Number(usage.inputTokens) * inputRate + Number(usage.outputTokens) * outputRate);
  if (!Number.isSafeInteger(micros) || micros < 0) throw new Error("AI_BUDGET_UNKNOWN_USAGE");
  return micros;
}
