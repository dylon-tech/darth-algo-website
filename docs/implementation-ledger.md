# Darth Algo implementation ledger

Updated: 2026-09-22 UTC. Owner-facing time zone: America/New_York.

This ledger records verified evidence, not intended state. `live` requires a provider or deployment receipt; `tested` means an offline or local test passed; `blocked` names the exact dependency.

| Workstream | Owner | Status | Dependency | Evidence | Acceptance test | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Source repository | Operations | live | GitHub | `dylon-tech/darth-algo-website`, main at `bbd303b` during audit | Connected repository is readable and writable | Keep main as source of truth |
| Production build | Operations | live | Node/Next.js | Vercel production deployment `dpl_GWsUjAY7S5BKmQYySJKiN7GoDTSG` reached READY for commit `b551b71`; public home and `/owner` return 200 | Clean compile, production READY, routes respond | Continue runtime error monitoring |
| Durable OS schema | Operations | tested | Production `DATABASE_URL` | PGlite-backed schema, queue, approval, handoff, Telegram, content, and indicator tests | Full safe-fixture suite passes | Observe production migration and heartbeat |
| Owner command center | Operations | tested | Owner runtime configuration | `/owner`, PWA manifest, session and private-route tests | Phone-sized authenticated command creates durable job | Verify on production iPhone Safari |
| Recurring executor | Operations | live with attention | Vercel cron plus production flags | Independent production `/api/cron/owner-work` runs every minute and `/api/cron/owner-health` runs every five minutes; current public health is `attention` | Fresh cloud heartbeat and successful cron HTTP result | Resolve the exact health issues shown in authenticated owner view |
| Premium carousel workflow | Content | live preparation verified; awaiting scheduled send | Provider acceptance at scheduled windows | Deployment dpl_5iAZFJHGyssiYCKh2kgSkoDk79Vz READY; September 23 morning exact cinematic asset ready on all three networks | Actual provider receipts at 9 AM and 3 PM ET | Evening review verifies both slots |
| Indicator prototype workflow | Research | partial | Hosted TradingView session | Production log records one candidate; private testing is blocked, release executor is not connected, and social discovery is waiting for credits | TradingView compile/replay evidence attached to exact source hash | Run supervised private validation; do not release yet |
| Customer support/retention | Support | tested | Support inbox adapter for outbound work | Deterministic routing and retention tables/tests | Verified inbound event creates deduplicated case; resolution cancels follow-up | Connect/verify inbox executor |
| Native reusable skill | Operations | installed | Skills directory | Version `1.0.0` validates and is saved to the reusable skill directory | Validator passes and installed package retains workflow references | Refresh Skills view if it is not immediately visible |
| Supabase | Operations | intentionally retired; not authoritative | All discovered projects inactive | Production runtime is executing successfully against its configured Postgres/Neon database; no Supabase project is referenced | None; excluded from production health | Do not resume or migrate without explicit source-of-truth evidence |

## Stop conditions

- Do not publish, message customers, change offers, spend money, or release an indicator without the existing exact-scope authorization and provider readiness gates.
- Do not retry an uncertain external outcome until readback or reconciliation establishes that the first attempt did not succeed.
- Do not represent queued, configured, compiled, or statically screened work as live execution.

## Content correction — 2026-09-22

Workflow: Premium carousel + creative QA; skill version 1.0.0. Dedupe key: DA-CONTENT-20260922-RETIRED-TEMPLATE-v4.

- Founder evidence: screenshots of today's navy/gold carousel with generic hooks. Standing instruction is premium black/red with actual full-color logo, TradingView context, prominent product, device mockups and CTA.
- Verified code defect: daily_social_ready cache was reused without any template-version check. The newer renderer alone could not refresh saved images. Old generic slide copy remained active. Rendering also exposed missing nested-SVG logo output and ineffective bold typography.
- Fix: version daily assets and caption jobs; rebuild only unsent retired campaigns under both publishing locks; expire superseded unsent approvals; preserve immutable assets and all provider attempts/receipts; block additional sends from attempted legacy campaigns. Next day's campaign uses the current renderer.
- Creative: product-led five-theme rotation, premium black/red, actual raster logo on every slide, bundled licensed bold font, owned chart captures, phone product mockup, explicit TradingView context and relevant /links CTA. No fabricated performance.
- Tested: PGlite-backed concurrent migration, no provider writes during replacement, expired approvals, new payload dedupe, legacy attempt holds, existing three-platform/Telegram receipt and lost-response safeguards; caption limits; TypeScript and changed-file lint. Rendered campaign images inspected locally.
- Deployment and actual next-post receipt must be verified separately. Do not label a generated preview as a published replacement.

## Mandatory social reference pack — 2026-09-22

Workflow: Company context and policy + creative QA; skill 1.0.0. Dedupe key: DA-SOCIAL-REFERENCES-20260922-v1.

- Founder decision: “from now on” all agent social posts should use the approved photos as references, including Instagram, X and Threads.
- Four approved images packaged as durable JPEG reference copies, preserving full dimensions; manifest records source PNG hashes and reference JPEG hashes. These are visual references, not publication receipts.
- Recurring Content model requests now include two bounded thumbnails selected from the four reference images (cover plus a deterministic rotating companion), preserving the existing image and spend limits alongside the shared mandatory direction. Brand rules, agent prompts and trusted company context require the same reference version. Text-only promotional fallback removed from instructions.
- Fresh-publication hold remains in both the scheduled and direct daily executor paths. Existing v4 is not renamed as approved. No new social send or paid image generation is part of this change.
- Next execution dependency: matching final campaign images must be connected to the publisher and reviewed by exact hash before fresh sends resume. Attaching references to a planning/caption worker does not install an image-generation engine.

- Validation: reference JPEG SHA-256 hashes match the manifest; all four photos participate in deterministic bounded Content inputs; existing budget-envelope checks, TypeScript and changed-file lint passed. Production deployment and runtime execution require separate readback.

## Twice-daily reviewed publishing — September 22, 2026

Work ID DA-TWICE-DAILY-20260922-v1; darth-algo-operations skill 1.0.0. Latest founder authorization: prepare the system and post once in the morning and once in the afternoon. Implemented 9 AM and 3 PM Eastern, slot-specific deduplication, four-hour spacing, finite windows, preserved historical readback, reviewed image/caption digest checks, JPEG storage/delivery, and one confirmed community preview per slot. Whop uses the same slots for its existing text-only Home delivery. Initial four reviewed campaigns cover September 23–24. The rejected renderer has no path into new campaigns; missing queue assets hold the slot rather than repeating old artwork.

Creation is replenished through a bounded ChatGPT photo-producer task using built-in imagegen and the actual reference pack; no new paid image API. Production owns all external publication. Configuration, deployed preparation, an unattended producer run and confirmed publication must be verified separately.

Validation: PGlite integration passed concurrent slot dedupe, exact JPEG bytes, changed-caption rejection, morning/afternoon boundaries, DST, two Whop sends, two community previews, prior uncertain receipt blocking, and missing-art hold; receipt/cache/backoff regression checks passed. TypeScript and changed-file lint passed. Photo Queue automation 6ab30e257d448191a18af03213eefe71 created enabled for morning preparation; evening review updated to verify both slots. Its first unattended creative run is pending; no new public post has been sent during this setup.

Deployment handoff: implementation committed as `bd713c34c140c3ad8b666f38288d861c1556f4bf`. At 23:28 UTC September 22, main readback matched, but Vercel had not registered a deployment or GitHub status for that commit. Current production still uses `f178f827`. Retrying the standard Git contents push; do not call this cutover live until the exact production deployment and prepared campaign are observed.

Verified production readback — 2026-09-22 23:30 UTC: `d2cf5ff8b52b543a8329c89444b6bdea329ce40a` is READY in deployment `dpl_5iAZFJHGyssiYCKh2kgSkoDk79Vz`. At 23:29:38 UTC the real cron returned `prepared_for_daily_window`, day 2026-09-23, slot morning, creativeVersion cinematic-reviewed-2026-09-22-v5, X/Instagram/Threads all ready_for_daily_window, assetsReady true, communityReadiness ready, and Whop connection_checked_waiting_for_window. Stored image URL returned HTTP 200 with exact f262eae43638… SHA; public health returned 200 healthy. This verifies live scheduled preparation, not a future publication. First scheduled new-style post is September 23 at 9 AM Eastern; four reviewed posts cover the first two days. Photo producer is enabled; first unattended generation remains pending. Git Contents API update_file successfully triggered deployment where a Git ref-only update did not; producer instructions now require the queue append via Contents API after asset upload.

## Welcome Agent — September 23, 2026

Work DA-WELCOME-20260923-v1, skill 1.0.0. Added one deterministic workflow under Growth in the actual Next.js owner system: SQL event/contact/outbox state, STOP and request dedupe, bounded sender engine with uncertain-outcome hold, isolated provider adapter contract, Stripe event inbox/reconciliation, browser-tab attribution, private phone card/controls, one daily-brief section, and additive cron initialization. No provider messaging adapter is connected; no social message or promotional post sent. Detailed audit, capability inventory, proposed coupon repair, tests, retention and rollback are in `docs/welcome/`.

Live Stripe inspection found WELCOME active at 25% once, first-time customers, but its coupon has **one redemption total**. Offers stay blocked pending owner approval of the replacement terms and sandbox checkout/trial validation. Manychat, X Developer and TikTok Business Center sign-ins/account eligibility remain outstanding. Local SQL/fixture tests, existing campaign/security regressions and production build passed; those do not establish a live platform trigger. Deployment/runtime evidence is recorded separately after publication.

2026-09-23 approval update: owner approved the exact WELCOME replacement terms in `docs/welcome/proposed-discount.json`. Approval is no longer outstanding. Connected Stripe access still exposes live mode only; sandbox checkout/trial validation and provider connections remain activation gates. No live coupon mutation or promotional send occurred.

## Instagram Welcome Agent connection — September 23, 2026, 10:14 UTC

Work DA-WELCOME-20260923-v1, Darth Algo Operations 1.0.0; support/access/retention + deployment verification. Authenticated Manychat settings confirm @darth.algo, Free plan (0/25 contacts), and Follow-to-DM unavailable due to Meta account restriction. Created and reloaded real native DRAFT `content20260923101152_967121`: exact case-insensitive WELCOME → one offer within the messaging window. Native STOP/Unsubscribe action observed, not recipient-tested. No live message, new post, plan upgrade or Stripe mutation.

Dashboard records this one-time manual observation, assigns Manychat as sole Instagram provider owner while paused/ineligible, exposes the native flow link, refuses unsupported provider controls, and retains unavailable metrics. Removed stale one-total-redemption and connection instructions. Owner now handles promo configuration. Activation needs final offer validation and an owner-controlled messaging test recipient. Provider autonomy and support handoff remain unverified. Desktop evidence saved; mobile evidence still unavailable. Local validation and deployment receipt follow separately.

Validation for `233f4d8b4566f7de12006e186e3e8a0fcca24597`: TypeScript, production build and isolated PGlite/adapter regression suite passed, including native-owner control blocking, unavailable telemetry and one-time observation preservation. Real recipient tests remain pending. This Contents API receipt submits the update through the existing production Git integration; READY and cron readback are still required.


## Indicator capture handoff — 2026-09-23

Work DA-INDICATOR-CAPTURE-20260923, operations skill 1.0.0. Commit `28a7de8349eaa443087df3493b7b87f4daaa1dee` adds private per-source image storage, authenticated image serving and uploads, gallery thumbnails, capture context and separate compiler/replay/reopening states. A bounded per-version capture worker now follows the legacy check in the existing five-minute indicator-browser cron. It uses the existing hosted-browser allowance, refuses saved named scripts and personal layouts, never clicks Save script or Publish, and holds authentication/session conflicts. Owner uploads cannot claim worker provenance or advance release approvals.

Verified locally: TypeScript, production build, capture storage/auth/CSRF/version/provenance/scheduler/pause/retry tests, and Indicator Lab regression tests. Corrected the old duplicate-logic fixture count after removal of the historical seed from public source; duplicate candidates remain rejected. Existing Swing/Scalp/Pro/Lifetime prices, billing and access paths were not modified.

A supervised real Session VWAP capture was made in TradingView on the dedicated preview layout. The screenshot is held privately outside this public repository. The owner website browser is signed out; the shared TradingView browser reports a competing active device. Saving the unreleased source in TradingView was rejected by approval review and was not retried. The new worker uses temporary unsaved editor text. Production READY status, scheduler execution and the actual capture outcome require fresh post-deployment readback; queue entries are not successful captures.


## Agent and publication incident recovery — 2026-09-23

Work DA-RECOVERY-20260923; Darth Algo operations 1.0.0. Production cron was healthy, but all eight early daily runs failed locally with AI_INPUT_LIMIT at 04:01–04:08 UTC. Added byte-bounded, omission-labelled model context while retaining complete run snapshots, exact safe failure codes, one deduplicated internal recovery job per incident failure, and corrected the roster size after Indicator Builder was added. Indicator structured output now has its existing 5,000-token allowance admitted by the unchanged dollar/request budget guard. No price, access, budget or publish permission changed.

Production evidence also shows Threads waiting_for_prior_receipt and Whop HTTP 400 at 13:00 UTC, followed by unknown. A bounded read-only provider diagnostic records unresolved receipts and matching post IDs; it does not resend or clear uncertainty. Publishing repair/readback remains in progress.

Validation: production build, bounded UTF-8 context checks, budget guards, and real PGlite queue/service/model/handoff regression passed. Provider is mocked in tests. Fixed stale fixture assumptions for multimodal inputs and nine-role roster. Source commit 33467043abdaa63b9d35024c24a51a5307ebd674. Production recovery completion must be verified from actual runs after deployment.


### Verified recovery and remaining provider gates — September 23, 2026

The deployed bounded-context fix completed actual internal model runs for Growth (23:03:38 UTC), Content (23:04:38), Analytics (23:05:38), Research (23:06:38), Operations (23:07:38), CEO (23:08:38), Support (23:09:38), Affiliates (23:10:38), and Indicator Builder (23:11:38). Production cron records pair each department's agent_context_ready with owner_work_tick succeeded. This verifies saved internal work, not successful external sends or a new compiled Pine draft. Historical failed runs remain intact.

Threads was blocked by the September 21 receipt: the network converts the first hashtag into a Topic and does not retain alt text. Exact readback now admits those documented transformations while preserving word, link and image identity checks. Terminal content discrepancies are recorded separately and cannot silently mark content verified. Unknown outcomes still hold the channel. Production commit 9dfec841a819ce772635a727d6bb99749c9d67e3 in READY deployment dpl_wnv32gM9zXm5MrKYBourpbhh9DD7 returned social_incident_catchup threads sent/published:true at 23:19:38 UTC. Only September 23's latest missed afternoon campaign was admitted by the expiring incident window; the full missed backlog was not sent.

Whop's exact provider rejection at 23:19:38 UTC was HTTP 400: Actor is missing all required permissions: forum:post:create. Reading the account does not establish write permission. No successful Whop publication is claimed. The current change classifies this recorded denial, holds future writes per credential, exposes the blocker in Connections and health, and adds an owner-only same-origin permission-update acknowledgement. It resumes a next scheduled attempt; it does not mark permission or delivery verified. Actual publication requires independent exact post/content readback with forum:read. Existing uncertain writes are never replayed. Buffer errors cannot stop Whop reconciliation or vice versa.

TradingView's deployed capture scheduler remains blocked by TRADINGVIEW_LOGIN_REQUIRED. The gallery now surfaces the real blocker instead of generic pending. All three original draft concepts and their complete versioned source remain private in the owner database. No simulated chart, approval-as-publication claim, persistent TradingView script save, new paid indicator, price/access change or budget increase was introduced.

Validation: production build; Whop adapter, owner authentication and CSRF tests; PGlite publishing concurrency, exact reviewed assets, topic normalization, lost-response hold, receipt reconciliation, permission block and owner recheck dedupe. Provider tests are mocked; live evidence above is from actual production logs. Final permission-card deployment and receipt URL readback are recorded in the private recovery report after deployment. Existing Welcome messaging remains held for native draft/offer/test validation; it is not one of the recovered internal department runs.
