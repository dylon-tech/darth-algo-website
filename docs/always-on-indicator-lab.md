# Always-on Darth Algo Indicator Lab

Extends the existing production business OS, private Telegram bot, Neon/Postgres
queue, model budget and Vercel schedules. No workstation daemon is required.
Existing media authorization and customer-facing bot are preserved.

## Execution

- `owner-work` runs every minute. It recovers private Telegram updates and notices
  even when AI is disabled, synchronizes Lab output and decisions, then runs the
  existing content/publishing/coordinator loop.
- `AI_OS_INDICATOR_LAB_ENABLED=true` enables the additive Lab. Set
  `AI_OS_INDICATORS_PER_DAY` to 1–3 (default 1). Existing AI/autonomy/paused settings
  and atomic daily/monthly budget reservations still control paid calls.
- A New York calendar-day key admits at most that many prototype attempts,
  including revisions. Only one Lab job is pending at a time. Persistent keys
  survive redeploys and overlapping scheduler calls. Evidence/quality failures can
  produce fewer candidates; the system never fabricates output to meet a quota.
- Public YouTube observations reuse the existing collector. The additional daily
  sample reads TradingView community metadata, public advertised pricing and
  public trader-discussion titles. It strips scripts/code blocks, stores bounded
  metadata, rejects redirects and records blocked sources as unavailable. This is
  partial coverage, not a universal social crawler or proof of market demand.
- The existing Research worker returns one structured original Pine v6 prototype.
  Source URLs must come from observed evidence. Existing inventory is supplied to
  discourage repeats. A normalized logic hash catches simple renamed duplicates;
  it is not proof of global originality.
- Static checks screen version, indicator declaration, plots, confirmed-bar
  signals, alerts, external imports and obvious future-data patterns. They do not
  compile Pine, simulate its behavior, or prove non-repainting/profitability.
- Good candidates create immutable seven-day approval records and private
  Telegram Approve/Revise/Decline cards. Full source is owner-session protected at
  `/owner/indicators/:id`. Revision notes are fed into a new daily slot; approval
  never transfers to edited code. Failed QA and duplicates remain auditable.

## Release boundary

TradingView's documented publishing workflow uses Pine Editor and chart review.
No supported automated compiler/publisher integration is configured here. The
Lab therefore prepares source, explanation, sources and a test checklist; it does
not claim it published to TradingView or generated a real chart screenshot.

After owner approval, an authorized operator must compile the exact source,
verify at least two symbols/three timeframes and closed-bar alerts, save a real
TradingView chart snapshot, and publish through the authorized account.
Review originality, usefulness, description, vendor requirements and limitations:

- https://www.tradingview.com/pine-script-docs/writing/publishing/
- https://www.tradingview.com/support/solutions/43000590599-script-publishing-rules/
- https://www.tradingview.com/support/solutions/43000549951-vendor-requirements/

Record the result with owner-bearer `POST /api/owner/indicators`:

```json
{
  "id": "candidate UUID",
  "sourceHash": "exact SHA-256 from the private preview",
  "tradingviewUrl": "https://www.tradingview.com/script/ID-Title/",
  "checks": {
    "compiled": true,
    "replay": true,
    "notes": "Actual symbols, timeframes, alert/replay checks and limitations observed",
    "screenshotUrl": "https://www.tradingview.com/x/CHARTID/"
  }
}
```

The endpoint authenticates the operator, rechecks the approval/payload/source
hash and QA, and records the evidence as **operator attestation**, not automated
verification. It cannot verify that a supplied URL contains the approved code.
Only then does `/indicators` show the product. Paid price recommendations are
hypotheses; this workflow does not create a Stripe price or grant paid access.
Do not put prototype source or credentials into public catalog data.

## Monitoring and recovery

- Every-five-minute `owner-health` checks worker freshness, old queue entries,
  disabled/budget states and unconfirmed notices. Telegram alerts fire on state
  changes; no repetitive healthy updates.
- `/api/health/agents` exposes only a coarse status, returning 503 when attention
  is needed. The independent GitHub Actions schedule checks it every 15 minutes.
  Repository Actions notifications must be enabled by the owner to receive its
  failure notices during a complete hosting outage. GitHub schedules can be late.
- Model requests and external sends retain the existing uncertain-outcome policy:
  no blind retry of potentially accepted paid requests or published posts.
  Safe internal handoffs and read-only reconciliation replay idempotently.
- Pause in Telegram stops new jobs and submissions; already-started requests may
  finish. Set the Lab flag false to disable only Lab generation. Database rows are
  additive and retained when rolling back a deployment.

## Verification

`npm run build`; `npx tsc --noEmit`; `node tests/indicator-lab.test.cjs` with
`OS_TEST_PGLITE_MODULE` set to an installed PGlite module. Regression checks cover
Telegram panels/private authorization, reconnect and content handoffs. The Lab
test exercises production functions against PGlite with mocked queue/delivery
adapters. It does not prove distributed locks, live model quality, Pine behavior
or actual TradingView publication. Inspect production `indicator_lab_tick` logs
for generation, handoff and `cardsDelivered`, and provider logs for live delivery.

Existing analytics, support/retention and affiliate agents remain bounded by their
actual source adapters. They do not acquire outreach, payouts, customer-account
mutation or TradingView fulfillment permissions through this change.
