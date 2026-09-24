# Command Center completion pass — September 24, 2026

Work ID DA-COMMAND-CENTER-20260924; Darth Algo Operations 1.0.0; deployment-verification contract.

## Scope and preservation

Existing repository `dylon-tech/darth-algo-website`, Vercel project `prj_gq8pTAjZ9fOAvUCWNBWEDAHXOfzm`. Baseline `945b014` is READY deployment `dpl_E2kvSFDRUWKkVTUT4KuF1CuwYze5`, with `www.darthalgo.com` alias. Authoritative database remains the existing Postgres connection. No duplicate scheduler, database, public product, checkout, price, access, protected indicator, or permission changes.

The existing iPhone presentation now uses Home, Agents, Studio, Lab and Inbox. Money details remain under Home and the existing money deep links. Old studio, queue, team, agents, money and bills links round trip; lab/indicators and inbox/approvals aliases are added. Existing advanced controls, Video Lab, conversations, queue, source/testing pages, connections and research remain accessible.

Inbox reads the existing persisted approvals and messages, submits exact payload hashes through the existing authenticated command endpoint, and opens persistent agent conversations. All three decisions are visible; Revise requires feedback. Indicator release directs the owner to source and validation evidence. No new publication or indicator executor is introduced. The server's existing transaction rechecks status, hash and expiry. Errors/timeouts require readback rather than claiming completion.

Lab cards use only stored exact-source chart captures. No screenshot or financial history is invented. Capture absence remains explicit. The gallery remains private. The full source and original tests/release workflow stay at their existing routes.

Expenses / Income now compares the 30-day revenue window with a prorated 30-day recurring expense budget (365.25-day year). This is a budget ratio, not invoice cash flow, debt-to-income or net profit. Missing MRR, payouts and all-time customers are explicitly unavailable instead of inferred from receipts.

## Button-to-outcome matrix

| Control | Persisted/visible outcome | Evidence / limit |
| --- | --- | --- |
| Home / Agents / Studio / Lab / Inbox | URL, active screen, scroll memory | Navigation model regression and WebKit fixture gate |
| Money cards, chart metrics / range / scrub | Same source data, selected period / exact values | Existing finance tests; no invented points |
| Save bill | Owner activity record, recalculated budget | Existing authenticated endpoint and CSRF tests |
| Message / Give Work | Existing durable job and agent conversation | Preserved worker; existing isolated UI/DB tests |
| Inbox Approve / Revise / Decline | Existing approval ID + exact hash; version recheck | Server contract preserved; no success from mere HTTP 200 |
| Inbox message | Correct scoped agent conversation | UI fixture gate |
| Lab card | Exact draft page, source and evidence | Authorized API; unchanged full source access |
| Disapprove | Existing unsent campaign hold and declined approvals | Transaction/concurrency fixture gate |
| Remake | Durable internal brief; original remains held | BLOCKED for final artwork: no finished-image renderer in deployed worker |
| Video create | Existing production brief | BLOCKED for finished video: no deployed final rendering executor |
| Fix agents | Bounded existing recovery request | Preserved; live recovery evidence requires owner login |
| Pause / Resume | Existing global control directly in the settings sheet | Server-confirmed state; in-flight calls may finish; no changes to worker permissions |
| Provider publish | Existing exact asset checks and per-provider receipt paths | Not triggered as an external test in this run |

## Acceptance status

PARTIALLY COMPLETE until authenticated production journeys and media executor gaps are resolved. Do not call this the fully autonomous acceptance release.

Local production build, TypeScript, changed-code lint, 12 routing regressions, 26 existing presence/video/queue model checks, CEO health/auth/expense tests and actual finance-window tests passed. Browser CI uses isolated synthetic data; it is not a real iPhone or live business result. CI/deployment receipts will be appended after checks.

The cloud browser's actual `/owner` screen is signed out and requests the existing Telegram `/connect` device flow. No credentials were extracted or session forged. Owner-only authenticated testing needs that supported connection. TradingView login, Whop posting permission, welcome trigger eligibility, provider credits and remaining live integration state must be re-read after owner authentication; historical blockers are not claimed repaired.

## Known unfinished requirements

- Finished image remake and playable video need an authorized server-side renderer, storage and visual QA handoff; the existing worker returns briefs. Do not reinstate the retired renderer to fake compliance or treat built-in chat generation as a deployed API.
- All required external receipts, customer fulfillment, retention, welcome sending and platform cadence cannot be freshly certified from an unsigned browser.
- Financial feed exposes receipts and unique active subscriber IDs; MRR, processor payouts, all-time paying customers and invoice-synced bills remain unverified.
- Existing submission-wide campaign hold still cannot cancel a destination after any provider claim; per-destination cancellation/removal needs reconciliation work before it can be promised.
- Existing daily queue is repository-backed and incomplete beyond reviewed campaigns. A durable media-producing pipeline requires more than changing UI labels.

## Design and rollback

Current Apple HIG consulted: https://developer.apple.com/design/human-interface-guidelines/materials and https://developer.apple.com/design/human-interface-guidelines/accessibility. System fonts, 44px controls, focused material navigation, reduced motion and private in-memory feeds preserve the previous release's accessibility work. No Apple font distribution or native App Store claim.

Rollback: revert this commit through the same Git/Vercel pipeline or promote baseline READY deployment. No destructive migration is required; indicator capture schema initialization uses existing additive routines.
