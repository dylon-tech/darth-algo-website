# Darth Algo business OS — Phase 1

This is an additive CEO orchestration layer in the existing Next.js application.
It reuses `app/lib/affiliate-db.ts`, the existing Stripe connection, and the
existing direct OpenAI / Vercel AI Gateway authentication pattern. There are no
new production dependencies. The public site, existing Telegram webhook,
affiliate logic, customer access bot and cron configuration are unchanged.

## Implemented

- Owner-only, disabled-by-default API: `/api/owner/ceo`.
- CEO reads source snapshots, produces an evidence-referenced brief, queues work
  by department, and records concrete approval proposals.
- Eight department definitions. Only CEO has a runnable reasoning loop in Phase 1;
  specialist definitions are **registered, not running workers**.
- Postgres tasks, conversations, runs, snapshots, activity and approval records.
- Read-only aggregate adapters for existing growth events, affiliate records and
  current Stripe subscriptions. Missing/error/test/incomplete sources are unknown,
  never synthetic values. No raw customer identities are passed to the model.
- Exact-payload approval fingerprints, owner-only decisions, 24-hour expiry,
  deduplication, transaction locking, idempotent runs and bounded AI work.
- No external action executor. Approval records **do not** spend, publish, refund,
  change access or send messages. Future executors must validate scope, latest
  state, exact approved payload, expiry, revocation and provider idempotency.

## Enable only after a private deployment review

Reuse the existing deployment's `DATABASE_URL` and AI credentials. New settings:

| Setting | Purpose |
|---|---|
| `AI_OS_ENABLED=true` | Enables the owner API; absent/false returns 404 |
| `AI_OS_OWNER_KEY` | Separate random owner secret, at least 32 characters; never a public/client variable |
| `AI_OS_AI_ENABLED=true` | Allows explicit owner-triggered model runs; keep off until AI usage is authorized |
| `AI_OS_MODEL` | Required model verified in the existing provider account; use `provider/model` for Gateway |

No credentials are created or included. Local verification does not call paid AI.
Owner requests require `Authorization: Bearer <owner secret>` and JSON.
Before initialization, GET `/api/owner/ceo?view=readiness` checks the actual
read-only source adapters and OS table existence. It works with AI disabled and
does not create tables or call a model. It reports missing connections separately
from verified empty results, and credential presence separately from AI
connectivity. HTTP 200 means the report was collected, not that the CEO is live.
This endpoint uses the same owner authentication and no-cache headers as status.
POST `{ "operation": "initialize" }` creates only `os_*` tables in the existing
database under a transaction. Read-only adapters never create or alter source
tables. Use an existing private database; do not expose it publicly.

GET returns actual stored statuses/history. POST
`{ "operation": "run", "message": "Review the business and prioritize today's work" }`
requires a new `Idempotency-Key` (8–120 letters, digits, underscores or hyphens).
Retry with the same key to inspect/reuse the original attempt. Failed attempts
require a new key for a deliberate retry. A running request is not completion.
At most one run is active and 12 attempts are allowed per rolling 24 hours.
Each run makes one bounded AI request. This is not a monetary budget guarantee.

POST `{ "operation": "decide", "id": "<approval UUID>", "payloadHash": "<hash returned by GET>", "decision": "approved", "note": "Owner decision" }`
records a decision. Alternatives are `declined` and `revision_requested`.
Revisions require a new proposal and approval; the original payload is immutable
through this API. There is intentionally no execute endpoint.

## Phases and acceptance gates

1. **CEO foundation (this change):** run against a private database, verify
   unavailable-source handling, source aggregates, restart persistence and owner
   auth; authorize a real model smoke run before calling it live.
2. **Specialist workers:** add bounded department tools and job leases, evidence
   of completed work, cancellation/recovery and per-department access. Reuse the
   content Make scenarios and existing support workflows. Queue assignment is
   not proof of execution.
3. **Integrations:** reconcile Stripe with the running Windows TradingView bot.
   Use a private authenticated bridge; do not expose localhost access-control
   endpoints on the internet. Reuse the actual deployed bot version, not an old
   archive. Connect support and Make records; review attribution gaps.
4. **Private Telegram:** separate BotFather bot/token/webhook, owner numeric-ID
   allowlist and private-chat-only checks. Never reuse the customer bot token or
   replace its webhook. Add agent routing, exact-version Approve/Revise/Decline,
   deduplicated alerts and a daily America/New_York CEO brief after one verified
   owner delivery. The current customer `/api/telegram/webhook` is separate.
5. **Controlled executors:** provider-specific approved actions, spend limits,
   scope validation, cancellation, retry reconciliation and emergency stop.
6. **Command Center:** private visual layer over these same real records and
   source adapters. No fabricated agents-working animations or seed revenue.

## Verification

`npm ci --ignore-scripts`, `npx tsc --noEmit`, `npm run build`.
`node --experimental-strip-types --test tests/business-os-policy.test.ts` checks
the authorization boundary, evidence validation and execution prohibition.
`tests/business-os-storage.mjs` verifies schema/state constraints against a
temporary Postgres-compatible PGlite database when that test-only package is
installed outside this repository. Production uses the existing Postgres client.

Current limits: no deployed private command bot, specialist workers, scheduler,
external executor, durable customer-support adapter, or verified fulfillment
bridge. Activity is application-append-only; database administrators can edit it.
Use database role restrictions and backups before production. A conversation
with Codex is not a continuously running hosted agent.
