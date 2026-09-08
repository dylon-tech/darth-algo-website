# Darth Algo owner operating system

An additive private workspace in the existing Next.js application. It reuses the
existing Postgres client, Neon database, aggregate growth/affiliate tables, and
existing OpenAI / Vercel Gateway request pattern. No new runtime dependency.

## Implemented

- `/owner`: cookie-authenticated Command Center with overview, departments,
  conversations, immutable proposal decisions, activity, and connection checks.
- CEO and seven specialist reasoning workers: Growth, Content, Support,
  Affiliates, Analytics, Research, Operations. Each receives a scoped mandate,
  actual aggregate evidence and recent conversation. Workers create internal
  deliverables, evidence-linked task assignments, and action proposals.
- Durable Postgres jobs, tasks, runs, conversations, briefs, approvals, private
  Telegram inbox/outbox, owner routing state and application activity records.
- One model run at a time, up to 12 attempted calls per rolling 24 hours,
  35-second provider timeout and 2,500 output-token limit. These bounds are not
  a monetary budget. AI is disabled until provider/model and usage are authorized.
- Private Telegram command routing to every department, statuses, pause/resume,
  cancellation, briefs, and exact-proposal Approve/Revise/Decline buttons.
- Deterministic daily CEO source briefs from real connected sources, without AI.
- Owner-triggered processing and optional daily production cron processing.
  Jobs persist through restarts; uncertain delivery/run outcomes require review
  before retry. No blind retry of potentially accepted provider calls.

A completed task means its internal deliverable was saved. No external business
executor is connected: approval does not publish, spend, refund, change accounts,
fulfil TradingView access, or message customers. Research has no browsing tool;
Content has no media-generation tool. Departments cannot claim those actions ran.

## Access and setup

Use the existing database and a dedicated private deployment first. All flags
below default off. Never use `NEXT_PUBLIC_` for secrets.

| Setting | Purpose |
|---|---|
| `AI_OS_ENABLED=true` | Enable private owner access |
| `AI_OS_OWNER_KEY` | Random secret, at least 32 characters |
| `AI_OS_AI_ENABLED=true` | Permit bounded AI requests after usage authorization |
| `AI_OS_MODEL` | Account-verified model; provider/model for Gateway |
| `OPENAI_API_KEY` / `AI_GATEWAY_API_KEY` | Existing supported provider credentials; Vercel OIDC is also supported but access must be verified |
| `AI_OS_AUTONOMY_ENABLED=true` | Permit one scheduled internal job per day |
| `AI_OS_DAILY_BRIEF_ENABLED=true` | Enable daily source brief cron |
| `AI_OS_TELEGRAM_ENABLED=true` | Enable private Telegram ingress/delivery |
| `AI_OS_TELEGRAM_TOKEN` | Dedicated private BotFather bot token |
| `AI_OS_TELEGRAM_OWNER_ID` | Owner's numeric Telegram user ID |
| `AI_OS_COMMUNITY_BOT_ID` | Existing customer bot's numeric ID; must differ |
| `AI_OS_TELEGRAM_WEBHOOK_SECRET` | Random 32–256 character Telegram webhook secret |
| `AI_OS_PUBLIC_URL` | Stable HTTPS origin reachable by Telegram |
| `CRON_SECRET` | Reuse existing cron authorization secret |

1. Set owner access only on the intended preview branch. Open `/owner` and sign
   in via a one-use private device setup link. It creates an HttpOnly, same-site-strict 180-day cookie, renewed when the app opens;
   the browser never stores it in local storage. Rotation invalidates sessions.
2. Connections checks are read-only and work before schema initialization. Use
   Initialize OS tables to create additive `os_*` records in this deployment's
   database. No source tables are created or altered by these adapters.
3. Verify aggregates, real queue persistence, decision boundaries and logout
   before enabling AI. Preview Neon branches are snapshots, not continuous
   production feeds. Missing sources are unavailable, never synthetic zeroes.
4. Configure the separate private bot and check it. Connect private bot webhook
   validates the bot ID and refuses to replace a different existing webhook.
   Telegram must reach the endpoint without Vercel platform authentication;
   the webhook independently requires its secret and exact private owner ID.
   Send `/start` from the owner account before delivery can succeed.
5. Authorize and verify one bounded real model run, then enable AI and review
   the saved output. Enable daily work/briefs only on the reviewed production
   configuration. Keep the existing customer webhook and cron separate.

`/api/owner/command` uses owner sessions; mutations require same-origin JSON.
The existing `/api/owner/ceo` interface remains available for bearer-authenticated
CEO status, readiness, initialization, bounded runs and exact-hash decisions.
There is no external execute endpoint. Approval expiry is 24 hours; revised
proposals need new approval. An approval is not reusable for another payload.

## Scheduling and Telegram

The existing customer cron remains at 14:00 UTC. New owner source brief and work
crons are at 13:00 and 14:00 UTC, respectively, behind separate flags. Current
Hobby scheduling runs daily, may occur within the selected hour and does not run
on preview deployments. This is not a continuous worker service. Each scheduled
work invocation processes one queued job (or assigns one queued task / CEO
review). Owner requests and Telegram updates also trigger bounded processing.
Large notice queues can require more invocations to drain; unconfirmed sends are
shown for manual review. Source briefs use America/New_York calendar dates.

Telegram commands: `/agents`, `/ceo`, `/growth`, `/content`, `/support`,
`/affiliates`, `/analytics`, `/research`, `/operations`, `/status`, `/approvals`,
`/brief`, `/pause`, `/resume`, `/cancel <job-id>`, `/help`.
Private ingress is `/api/owner/telegram/webhook`; customer ingress remains
`/api/telegram/webhook`. Both bot identity and chat identity must be distinct
from the community routing. Updates, callbacks and owner notices are deduplicated.

## Remaining integration gates

Stripe requires a valid account credential to verify subscriptions. Windows
TradingView fulfillment needs a private authenticated bridge to the actually
running version. Existing Make content workflows and support/retention records
need authenticated source adapters. None is represented as connected yet.
Provider-specific external executors still require exact approved scope,
provider idempotency, reconciliation, cancellation and spend limits before use.

Before production activation, review the preview, connect the missing providers,
verify one real private Telegram delivery and AI run, and authorize production
promotion. No paid upgrade, customer action or public launch is implied by setup.
Database administrators can edit activity; it is application-append-only, not a
cryptographic audit system. Use existing database backups and restricted roles.

## Verification

- `npx tsc --noEmit` and `npm run build`.
- `node --experimental-strip-types --test tests/business-os-policy.test.ts`.
- `node tests/business-os-security.mjs`: signed-session tampering, expiry,
  key rotation, origin checks, private-owner Telegram acceptance/rejection.
- `OS_TEST_PGLITE_MODULE=<external-pglite-module> node tests/business-os-storage.mjs`:
  additive schema, restart persistence, active-job uniqueness, deduplication,
  outbox ordering and approval state constraints. Test dependency stays outside
  this repository; production retains the existing Postgres client.

Primary platform references: [Telegram Bot API](https://core.telegram.org/bots/api),
[Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[cron behavior](https://vercel.com/docs/cron-jobs/manage-cron-jobs).


## Phone app and remembered device access

The owner UI no longer asks for a key, passcode or passkey. An authenticated
administrator can POST `{"operation":"device_link"}` to `/api/owner/ceo` with
its existing bearer credential after initializing the schema. The returned
private setup URL grants owner access once, expires after 24 hours, and replaces
any previously unused setup link. Never publish or log its token. Post the
fragment token to `/api/owner/session` with `operation: connect` on the same
origin after the owner taps Connect this device. Consumption is atomic; expired,
used, revoked, malformed and key-rotated links cannot authenticate.

The device cookie lasts 180 days and renews on authenticated session checks.
Signing out, clearing browser data, expiry after inactivity, or rotating the
server owner key requires reconnecting. Rotation also invalidates outstanding
setup links. The legacy bearer/key API remains for secure administration.
Use a stable deployment origin: cookies are scoped to that host. Moving from
preview to production will require connecting once on the production host.

The `/owner` manifest and PNG icons enable a standalone Home Screen web app.
Connect in Safari first, then Share → Add to Home Screen → Open as Web App → Add.
Modern iOS copies cookies during installation. No private data is cached offline
and background agents/notifications are not enabled by installing the app.
This is a web app, not an App Store distribution. Installation must be performed
on the owner's phone. The browser install prompt is used where available.

References: [Apple Home Screen web apps](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios),
[WebKit cookie transfer](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/).

## Pixel owner headquarters

The owner UI has Home, My agents, Messages, Approvals and Results. Each of the
8 roles has a distinct pixel character, a separate conversation and local draft,
role-specific suggested messages, and a Give work board. The 24 assignment
presets live in `app/owner/work-assignments.ts`. Assigning one sends its full
instructions through the existing durable message queue and requests the worker.
An already queued/running identical preset is disabled in the current UI.

Watch work displays persisted per-department events: source checks, preparation,
validated response, saved tasks, approval proposals, completion and failures.
It refreshes every five seconds while the Messages page is visible. These are
observable workflow events, not simulated activity, screen streaming, or model
reasoning. The UI never treats registration/configuration as a successful run;
it drops the Working label for stale runs or stale dashboard updates.

AI access remains a runtime prerequisite. Requests saved with AI off or work
paused wait in the queue. A busy worker may leave requests queued until a later
worker invocation; this is not a continuous background fleet. Existing Hobby
cron cadence has not been changed. No production or paid AI activation is
included in this UI update.

The owner requests OpenAI-powered agents with business editing capabilities.
They do not inherit ChatGPT connector credentials or this assistant's tool
runtime. No external write executor is connected today. Future business tools
must use dedicated runtime credentials, durable exact-action approvals for
spending/publishing/customer-sensitive changes/refunds/account changes, and
logged execution outcomes. A saved approval is not a completed business edit.
Customer-facing Telegram and private owner access remain separate.
# One-time owner-approved pilot (September 8, 2026)

The owner approved $1 total for the eight already queued internal starter jobs.
Owner-bearer POST `operation: pilot_run` executes at most one eligible job per
request, only in Preview. It uses GPT-5.6 Luna directly, keeps general AI/autonomy
flags off, respects pause and existing single-job/single-run locks, and records
a permanent $0.125 budget reservation before each of at most eight attempts.
Only the original `darth-starter-20260907-<department>` job keys are eligible.
Replays do not create a new run. Failed or uncertain attempts are not refunded
or automatically retried. Nothing schedules this operation. No external editing
tools are attached.

The full serialized provider request is limited to 100,000 bytes and output to
2,500 tokens. At verified Luna standard rates ($0.20/$1.20 per million input/output
tokens), a conservative byte-as-token bound plus 25,000 input framing tokens is
$0.028 per attempt, below the $0.125 reservation. These reservations are a local
spending guard for this pilot, not a provider account-wide billing limit. Stop
after the eight jobs or any provider failure and review before further spending.

## Shared business knowledge

`knowledge.ts` adds `business_knowledge` to every evidence snapshot. Product names,
prices, cadence, features and workflows come directly from the storefront's
`products.ts`, avoiding a second catalog. Source-tagged onboarding, acquisition,
affiliate and billing summaries were reviewed against their repository pages on
2026-09-08. Re-review those summaries when the referenced pages change. This is
website-source knowledge, not live checkout verification or customer entitlement.
No customer identities or credentials are included. Knowledge and delivery prompt
improvements have passed TypeScript/security checks but have not had another paid
model evaluation; the original eight-attempt pilot remains exhausted.

Remaining activation dependencies: separate private Telegram bot token and owner
ID, verified community bot ID for separation, production owner runtime configuration,
and an explicit recurring AI spending ceiling backed by durable budget enforcement.
Routine AI remains disabled. No external write executor is connected.


## Coordinated runtime — September 8 integration

The new optional coordinator turns persisted agent results into durable handoffs.
When enabled, each successful specialist response can assign another department;
the receiving job gets the sending agent's actual deliverable plus recent team
outputs as labeled internal evidence. A specialist with no requested follow-up
gets a bounded default review route (for example Content → Operations, Research
→ Growth). Maximum depth is three and maximum workflow tasks is sixteen. Same-
department handoffs are rejected. Shared drafts never constitute owner approval.

The coordinator dispatches queued tasks and daily department assignments with
stable keys, then performs at most one bounded job per tick. Database locks and
unique keys prevent duplicate claims. Failed/unknown calls are not automatically
retried. Existing 12-attempt rolling-day limit remains. Pausing stops new work;
an in-flight provider request may finish, but the result commit rechecks pause.

`POST /api/owner/worker` is dedicated bearer authenticated with AI_OS_WORKER_KEY.
`scripts/owner-worker.mjs` is a continuous supervisor client: it waits 30 seconds
between bounded ticks and requires no browser to stay open. Start with
`node scripts/owner-worker.mjs` on an approved always-on host; `--once` verifies
one tick. The supplied `business-os/Dockerfile.worker` supports a restart-managed
container. Build from the repository root. Do not run duplicate supervisors.
The worker's only secrets are its dedicated worker key and any platform access
mechanism; the OpenAI/database keys remain on the application deployment.
Vercel Preview authentication may separately prevent supervisor access. Use an
approved stable private host with reachable independently protected API routes.

The existing Vercel Hobby daily cron was not increased and is not a continuous
worker. A daemon running only in a temporary Codex workspace is not a production
host. No long-lived external host, production promotion or recurring paid run
was enabled during this implementation.

### Budget activation contract

All flags default off. Reuse the owner's already configured OpenAI key. Set
AI_OS_MODEL to the existing verified gpt-5.6-luna model. Only after explicit
recurring-spend approval set AI_OS_RECURRING_SPEND_APPROVED=true and both
AI_OS_DAILY_BUDGET_USD / AI_OS_MONTHLY_BUDGET_USD. Daily/monthly periods are UTC.
Every direct Responses request gets an atomic $0.125 reservation before network
access. This conservative capacity is held even when actual completed usage is
lower. Unknown charges carry into later periods; anomalous usage blocks further
spend. Limits bound this runtime's reservations, not the whole OpenAI account or
hosting bills. The existing one-time $1 pilot grants no recurring allowance.

The guard accepts only the bounded existing text-only request envelope and priced
model. No images, browsing/tool fees, gateway costs or extra paid services are
silently added. Worker checks fail closed before dequeue when budget cannot be
verified. The authoritative reservation is inside a database transaction.

### Actual tool coverage

- Existing database aggregate and website-knowledge adapters remain available.
- Existing live Stripe adapter still requires STRIPE_SECRET_KEY on the deployment.
- ChatGPT-connected Gmail, Metricool, web and rendering tools are not runtime
  credentials. Seven scheduled ChatGPT specialists were not migrated or paused.
- This integration provides automatic internal collaboration, not external
  publishing, support sending, web browsing or finished media generation.
- Existing approval proposals remain non-executable until dedicated provider
  adapters and exact-action execution/reconciliation are implemented and tested.
- Private Telegram remains separately configured and disabled until verified.

Owner Home and Messages show persisted handoffs and a fresh worker heartbeat.
Enabled alone never earns a healthy/live label. Old deployments without the new
schema show setup pending. Initialize the additive OS schema on an isolated
preview before activation; never assume a successful build has done this.

### Integration verification

`node tests/business-os-budget.test.mjs` verifies fail-closed limits, duplicate
keys, concurrent reservation contracts, unknown-cost holds and anomaly handling.
`OS_TEST_PGLITE_MODULE=<path> node tests/business-os-coordination.mjs` checks real
local Postgres-compatible schema/deduplication, handoff payloads and persistence.
`node tests/business-os-worker.mjs` exercises the actual daemon against a local
HTTP fixture. These offline tests do not prove live model quality, production
Postgres locking, external publishing, private Telegram or always-on deployment.


### Existing-host activation option

The verified Vercel team is Hobby. Its cron limit is daily, so the current
vercel.json remains unchanged. The existing authenticated owner-work route now
uses coordinationTick when the new coordination flag is on. After explicit
approval of Vercel Pro pricing and recurring model budget, the reviewed
business-os/vercel.continuous.example.json can replace vercel.json to trigger
one coordinator tick per minute on production. This reuses the existing host
and CRON_SECRET; it does not need the standalone daemon or Telegram to run.
Do not run both transports. The model remains idle between queued jobs and
stops at durable capacity limits. Hosting usage is billed independently of
OpenAI; configure platform spend management before activating this option.
Pro is currently listed at $20/month, taxes and usage beyond included credits
may apply: https://vercel.com/pricing . Cron support is documented at
https://vercel.com/docs/cron-jobs/usage-and-pricing . No upgrade was purchased.
