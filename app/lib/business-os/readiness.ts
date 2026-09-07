import { db } from "../affiliate-db";
import { collectEvidence } from "./sources";

const requiredTables = ["os_device_links", "os_runs", "os_tasks", "os_approvals", "os_activity", "os_messages", "os_control", "os_jobs", "os_telegram_updates", "os_telegram_state", "os_outbox", "os_callback_actions", "os_briefs"];

// Read-only preflight: no schema initialization, AI request, or external action.
// Configuration presence is deliberately separate from verified connectivity.
export async function readiness() {
  const [evidence, store] = await Promise.all([
    collectEvidence(),
    (async () => {
      try {
        const tables = await db()`select table_name from information_schema.tables
          where table_schema = 'public' and table_name in ${db()(requiredTables)}`;
        const present = new Set(tables.map(row => row.table_name));
        const missingTables = requiredTables.filter(name => !present.has(name));
        return { status: "verified" as const, tablesPresent: missingTables.length === 0, missingTables,
          scope: "Table existence only; does not validate write permissions, schema constraints, or a successful CEO run." };
      } catch {
        return { status: "unavailable" as const, tablesPresent: null, missingTables: null,
          scope: "Database schema could not be inspected; no schema changes attempted." };
      }
    })(),
  ]);
  const ai = {
    enabled: process.env.AI_OS_AI_ENABLED === "true",
    credentialPresent: Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
    modelConfigured: Boolean(process.env.AI_OS_MODEL),
    connectivity: "not_tested",
  };
  return {
    checkedAt: new Date().toISOString(), mode: "read_only_preflight",
    environment: process.env.VERCEL_ENV || "local",
    dataScope: process.env.VERCEL_ENV === "preview" ? "Preview database branch copy; not a continuous production feed." : "Configured database and Stripe account; source-specific scopes apply.",
    evidence, store, ai,
    configuration: { databaseUrlPresent: Boolean(process.env.DATABASE_URL), stripeKeyPresent: Boolean(process.env.STRIPE_SECRET_KEY),
      privateTelegramTokenPresent: Boolean(process.env.AI_OS_TELEGRAM_TOKEN), ownerTelegramIdPresent: Boolean(process.env.AI_OS_TELEGRAM_OWNER_ID),
      communityBotIdPresent: Boolean(process.env.AI_OS_COMMUNITY_BOT_ID), privateWebhookSecretPresent: Boolean(process.env.AI_OS_TELEGRAM_WEBHOOK_SECRET),
      privatePublicUrlPresent: Boolean(process.env.AI_OS_PUBLIC_URL), autonomyEnabled: process.env.AI_OS_AUTONOMY_ENABLED === "true",
      privateTelegramEnabled: process.env.AI_OS_TELEGRAM_ENABLED === "true", dailyBriefEnabled: process.env.AI_OS_DAILY_BRIEF_ENABLED === "true" },
    blockers: [
      ...(store.status === "unavailable" ? ["OS_STORE_UNAVAILABLE"] : store.tablesPresent ? [] : ["OS_TABLES_MISSING"]),
      ...evidence.filter(source => source.status === "unavailable").map(source => `SOURCE_UNAVAILABLE:${source.id}`),
      ...(!ai.enabled ? ["AI_DISABLED"] : []),
      ...(!ai.credentialPresent ? ["AI_CREDENTIAL_MISSING"] : []),
      ...(!ai.modelConfigured ? ["AI_MODEL_MISSING"] : []),
      "AI_CONNECTIVITY_NOT_TESTED",
    ],
  };
}
