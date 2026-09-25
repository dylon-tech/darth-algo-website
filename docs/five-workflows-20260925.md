# Five-workflow completion pass

Work DA-FIVE-WORKFLOWS-20260925; Darth Algo Operations 1.0.0. Baseline main `fedf572`. The existing five-tab interface, products, prices, customer access and 9 AM / 3 PM America/New_York policy are preserved.

## Implemented and locally checked

- Content cards read destination-specific receipts, IDs, safe public links and timestamps. Reviewed media and receipt version bindings are distinct. Acceptance, uncertainty and publication remain distinct. Recent retained campaigns remain inspectable.
- Disapprove acquires the same publication locks and holds future claims, including unsent destinations of a partially dispatched campaign. Already dispatched approvals retain their state so readback continues. Remake cannot rewrite an attempted campaign. Unknown writes are never automatically replayed.
- The existing private Needs You ledger includes current Whop, native Welcome test and offer-duration blockers, and exact draft-review dependencies. Requests have deduplicated keys and resume steps. A failed dependency read aborts reconciliation instead of falsely resolving prior blockers. Inbox exposes these existing records.
- Retention scans separate cancellations from detected payment problems. Active/trial status closes stale outreach without claiming recovered payment or revenue. Historical observations are retained. Current invoice/customer checks can produce an immutable, deduplicated private draft at `/owner/retention`. Email history, suppression, support and access remain explicit pre-send gates. This route has no send action.
- Runtime observation storage now accepts the existing retention/open-loop services. One bounded aggregate/versioned readback per production revision/day records actual receipts, static Pine checks, capture provenance and limitations through the existing minute worker. No customer addresses or Pine source are logged.

## Acceptance limits

| Workflow | Remaining end-to-end gate |
| --- | --- |
| Command Center | Production browser device connection; true finished-image Remake renderer/producer handoff remains absent. |
| Twice-daily content | Existing provider readback supports X/Instagram/Threads; Whop requires actual permitted publication and readback. Community acceptance is not recipient read proof. |
| WELCOME | Native draft, final offer configuration, designated consenting test recipient, duplicate/STOP evidence and activation. |
| Indicator | Exact private TradingView compile, chart/replay checks and source-bound capture after hosted login. No public release authorized. |
| Retention | Controlled test recipient, complete provider history/suppression/access verification, exact sending approval and guarded Gmail executor handoff. No real-customer email is sent by this change. |

Local regression uses isolated PostgreSQL/PGlite and mocked provider data; CI additionally exercises concurrent Postgres publication holds and WebKit/Chromium UI fixtures. Neither establishes signed-in production or physical-iPhone validation. Full build/type checks and changed-source lint are release gates. Existing image-tag lint warnings predate this change.

## Provider references

- Stripe subscription statuses: https://docs.stripe.com/billing/subscriptions/overview — active status alone does not establish settlement of all invoices; trial is not payment.
- Whop forum access: https://docs.whop.com/developer/guides/forums
- Manychat follower-trigger limits: https://help.manychat.com/hc/en-us/articles/23096654243740-Follow-to-DM-on-Instagram-Say-Hi-to-New-Followers-BETA

## Rollback

Revert this release through the same reviewed Git/Vercel workflow. New retention-review storage is additive; retain it and the original activity/receipt ledgers. No destructive migration or billing/access mutation is included. Restoring prior UI does not undo a post or email already sent by an existing provider.
# Daily private brief

The existing deduplicated daily notice now starts with saved published links, completed-job previews, bounded retention coverage and specific owner blockers. It preserves the same owner channel and schedule. Read failures explicitly report unavailable evidence. No new notification schedule was added; live delivery of the revised brief remains to be observed at its next scheduled run.
