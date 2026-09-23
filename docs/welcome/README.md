# Welcome Agent — implementation and activation record

Work ID DA-WELCOME-20260923-v1. Darth Algo Operations skill 1.0.0, support/access/retention + deployment verification. Owner request authorizes future eligible welcomes after verified activation, not paid upgrades, coupon changes with unresolved terms, profile edits or unsolicited messages.

## Current boundary

Implemented in the actual `dylon-tech/darth-algo-website` Next.js app, under the existing Growth role. The older Sites HQ was inspected but is not the minute-scheduled production executor. Production account/domain mapping was read through connected Vercel (team `team_sIKksDBosphCvs8tIxBVVIq6`, project `prj_gq8pTAjZ9fOAvUCWNBWEDAHXOfzm`, custom domain `www.darthalgo.com`). Live cron logs on 2026-09-23 confirmed existing SQL-backed jobs and Telegram desk activity. No inactive Supabase database was used. No credentials copied into this record.

**NOT LIVE FOR MESSAGING:** No messaging provider is connected or configured. `productionAdapters` is deliberately empty. There is no fabricated follower webhook, generic webhook labeled as a provider integration, DM scraping or session-cookie bot. The deterministic SQL engine is tested with isolated adapter fixtures; real provider-native configuration, supported telemetry mapping and actual adapter registration remain pending account access. Resume and Send Test explain these blockers and do not simulate delivery. This is deployed preparation plus tracking, not completed autonomous messaging.

`app/lib/welcome/inventory.ts` is the compact capability record. All three accounts require verified messaging identity, permissions, cost and eligibility before a sender is selected. Manychat sign-in was observed; X console redirected to sign-in; TikTok Business Center showed its public landing page. Buffer publishing access is not DM authorization. No historical follower list imported. Public profiles and the 9 AM/3 PM approved publishing schedule are unchanged.

## Live Stripe audit — 2026-09-23 UTC

Connected account: `acct_1TeNcILAuZzjYekv`, Darth Algo, **live mode**. Only live mode was exposed; no sandbox was available.

`WELCOME`: promotion `promo_1UIgHgLAuZzjYekvpsP5oKRF`, active, first-time-transaction restriction, no expiration, no minimum purchase, no promotion-level global cap. Underlying coupon `2FKdHuBU`: **25%**, `duration=once`, no product restriction, **max_redemptions=1 total**, zero redeemed at audit. This is not one redemption per customer: the coupon can be used once in total. No Stripe configuration changed.

Owner-approved replacement terms (2026-09-23, explicit reply “aprove”): 25% once on the first paid purchase/invoice, first-time customers, no product exclusions, no expiry, no global redemption cap. Reuse customer-facing WELCOME by deactivating the old promotion and creating a replacement backed by a new coupon only after safe sandbox validation; preserve the old coupon and existing redemptions. No other coupons/subscriptions/prices/access rules change. No stacking claimed; confirm Checkout's one-discount behavior and eligibility in sandbox. No permanent recurring discount proposed. Approval is recorded; it is not evidence that the live configuration was changed or tested. Rechecking the connected Stripe accounts after approval still exposed only the live Darth Algo account; sandbox access remains required.

| Pricing path | Live Payment Link | Promotion field | Trial |
|---|---|---|---|
| Scalper | plink_1Tyg0pLAuZzjYekvhYgHWXC3 | enabled | none |
| Swing | plink_1Tyft1LAuZzjYekvqixm10uS | enabled | 2 days |
| Pro | plink_1TygGILAuZzjYekvYZn3MlFn | enabled | none |
| Lifetime | plink_1TygExLAuZzjYekv4n6JuwO3 | enabled | one-time |

All four checkout URLs match the pricing-page links. Existing live webhook `we_1UBOI4LAuZzjYekvMzRkZRLi` targets `/api/stripe/affiliate-webhook`, enabled for checkout.session.completed, invoice.paid, charge.refunded, API 2026-05-27.dahlia. Its signing configuration is reused; not replaced. Other Make endpoints and access automations were preserved.

The Pro checkout was opened from the actual attributed pricing page, without completing payment. No personal/payment information entered and no customer charged. See evidence record for the final UI result. Trial-to-paid and paid/refund end-to-end tests remain blocked on a connected Stripe sandbox. Official documentation describes ignoring coupons on zero-cost invoices; this is not substituted for an account-level test.

## Files and durable runtime

- `app/lib/welcome/schema.ts`: additive `os_welcome_*` tables in existing `DATABASE_URL`; advisory-lock migration, no destructive alterations.
- `engine.ts`: contact keys scoped to platform/account/stable recipient; event PK dedupe; automatic-stage uniqueness independent of template; fresh explicit requests independent of automatic lifecycle; support escalation; bounded claims/retries; pause/window/eligibility/consent/discount preflight; accepted/delivered/unknown separated.
- No registered sender means no production external messaging call is possible. Native provider owners bypass backend sending. Native delivery/pause/STOP telemetry cannot be fabricated; native controls must be added through a verified supported interface or handled in the provider before assigning ownership.
- Existing `/api/cron/owner-work` performs initialization, expiry/retention checks and bounded payment reconciliation before the AI flag. No new scheduler or paid model calls.
- Existing authenticated Stripe route captures only event/type/object IDs in a persistent inbox. Signature verification precedes capture. Old affiliate processing remains. New inbox failures return retryable 503 rather than acknowledge lost analytics; Stripe replays are idempotent.
- `/api/owner/welcome` uses existing signed HttpOnly owner cookie, same-origin mutation checks, bounded bodies, private no-store responses. `/owner/welcome` and an overview card use real logo and existing black/red theme.
- One Welcome Agent paragraph appended to the existing daily Telegram brief. No new Telegram schedule or duplicate daily notification.

## Attribution and accounting

UTMs precede #pricing. Browser-tab sessionStorage holds an opaque random visit ID; no name, email, social ID or email gate. Existing allowlisted Payment Links receive `client_reference_id=daw_<uuid>`; parameters do not apply coupons. Links still work if telemetry fails. The existing campaign label reference remains fallback.

Visits are unique **browser tabs**, not people. Checkout starts are observed outbound clicks, not proof Stripe created a Session. Valid source labels are client-controlled observations, not causal evidence. Visit storage is 90 days. Source attribution is 30 days, single-tab and browser dependent; no cross-device matching. A first paid trial invoice must fall inside the attribution window. Code-only purchases with unknown source stay separate.

Canonical subscription accounting key is invoice ID; Checkout never counts a subscription payment separately. One-time checkout with invoice uses that invoice ID, otherwise Session ID. PaymentIntent and live captured charge are independently read before counting cash. Zero trial/free invoices never count. Bounded, paginated customer history is used to verify first-paid status; missing history is null, not false. One-time guest purchases without a stable Stripe customer ID have unavailable first-paid identity. Complete live-charge pagination is required for identified customers; tied timestamps are treated as uncertain. Partial allocation, unsupported payment types, missing pages or tax/refund ambiguity fail closed to review.

Net is collected after discounts, excluding tax, minus refunds excluding known refunded tax. Full refunds yield zero. Partial refunds with unknown tax allocation yield **unavailable**, never guessed net revenue. Stripe fees and operating costs are not deducted. No profit or incremental lift claim. Current payment coverage is intentionally unavailable until a controlled successful payment and refund webhook sequence is verified. Pending/needs-review inbox records remain inspectable. Async delayed-payment confirmation requires adding its documented event to the existing endpoint and handler after approval/configuration; not currently claimed covered.

## Activation checklist (operator work after minimal owner actions)

1. Obtain secure Manychat sign-in, inspect @darth.algo, Unified onboarding, beta eligibility, current plan/free capacity and permissions. Configure exact opener + non-URL button + offer, with no extra reminder. If unavailable, label keyword fallback honestly. Confirm STOP cancels queued sends before go-live.
2. Obtain X developer console access, verify identity/DM permissions and event subscription; estimate cost from actual rates. No credits bought. Use inbound WELCOME only.
3. Inspect TikTok verified business status, Advanced Access, region and relevant commercial policies. Prefer keyword (500 characters) over first-chat field (250). Submit approved-length content for moderation only when eligible; pending review is not live. If unavailable prepare CTA for owner approval, no publishing.
4. Replacement coupon terms are owner-approved; do not request the same approval again. Connect Stripe sandbox, reproduce all eligible prices/link behavior, test trial clock to first paid invoice, stacking and restrictions. Only then change live WELCOME and recheck checkout. `verifyWelcomeDiscount` intentionally stays not-ready until account-level tests are integrated.
5. Assign exactly one sending owner per platform; add provider-specific authenticated ingress/replay verification and official adapter if backend owned. The internal signature helper is not a public provider endpoint. Native ownership requires supported status synchronization; unavailable fields stay null.
6. Owner supplies/authorizes an owner-controlled test recipient through secure provider UI. Capture provider event/message IDs, redacted account evidence and actual accept/deliver state. Verify restarts, permissions expiry, cancellation and rate limits. No prospect test messages.
7. Verify real Stripe paid and refund events, mark analytics coverage with activation time; expose available metrics instead of placeholder nulls. No historical follower or prospect import.

## Monitoring, deletion and rollback

- Monitor production `welcome_tick` every minute; expected currently blocked/PROVIDER_CONNECTION_AND_DISCOUNT_REVIEW with zero sendingAdapters. Any `unavailable` needs operator review. Dashboard sending health and analytics coverage are separate.
- Discount read cache 15 minutes; no additional paid capacity. Unverified/expired credentials or eligibility pause sending. No provider expiry date is inferred from environment variables.
- Sending claims older than two minutes become unknown. Reconcile the provider receipt; never reset unknown to queued without evidence of non-acceptance. Definite rejection retries at most four attempts with backoff/rate-limit delay; preflight failure is safe to retry because no send occurred.
- STOP sets persistent scoped suppression and cancels queued offers. Already handed-off network sends cannot be recalled. A later WELCOME does not silently re-subscribe. Re-consent requires a supported explicit process.
- Retain event IDs/body for 90 days; prune message bodies and recipient IDs after 90 days of inactivity unless unresolved. Retain minimal hashed suppression/lifecycle tombstones while this automation operates to prevent re-contact. Do not merge identities across platforms. Purchase records follow existing billing retention.
- Verified deletion request: pause affected scope; delete pending rows, event history, support text and recipient ID for the exact contact key; retain only justified suppression/lifecycle tombstone. Operator must also use provider deletion mechanisms. No unauthenticated deletion endpoint.
- Rollback: first pause all Welcome Agent platform rows and any configured native workflow; then revert only the Welcome Agent commit(s) through normal Git/Vercel. Retain additive tables/receipts/tombstones. Never drop billing or existing app tables. For urgent analytic-hook regression, revert its import/capture line and cron hook without touching affiliate behavior. Existing global app pause is respected.

## Tests

`OS_TEST_PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node tests/welcome/workflow.test.mjs`

PGlite verifies actual PostgreSQL SQL semantics and disk restart, with transactions serialized in the fixture. Distributed multi-connection locking is a remaining production test gate. Provider network calls mocked. TypeScript and production Next build run separately. Safe Stripe sandbox tests and native account tests are **not** covered by passing local assertions.

## Official references rechecked 2026-09-23

- https://help.manychat.com/hc/en-us/articles/23096654243740-Follow-to-DM-on-Instagram-Say-Hi-to-New-Followers-BETA — Meta eligibility, Unified onboarding, Free/Pro availability, once per follower, recipient weekly limit, 24-hour opt-in window.
- https://help.x.com/en/rules-and-policies/x-automation — explicit request and opt-out, not a follow/open inbox.
- https://docs.x.com/x-api/getting-started/pricing — DM read/received $0.010, create $0.015; $0.025 inbound+reply estimate before extras; actual account rate/credits unverified. No X spend authorized.
- https://docs.x.com/x-api/direct-messages/manage/introduction — documented DM API, not connected in this release.
- https://ads.tiktok.com/help/article/navigate-auto-message-business-accounts?lang=en — Advanced Access and Verified Business Account.
- https://ads.tiktok.com/resources/help/article/how-to-set-up-auto-messages-for-business-accounts?lang=en — 250/500-character limits and 1–5 business-day moderation. Account-specific regional/commercial approval unverified.
- https://docs.stripe.com/billing/subscriptions/coupons — promo vs coupon, duration, redemption restrictions.
- https://docs.stripe.com/payment-links/url-parameters — supported client_reference_id handoff; no discount application implied.
- https://docs.stripe.com/changelog/2013-10-29/coupons-apply-invoice-total-balance — zero-cost behavior; does not replace sandbox trial test.

Incremental spend initiated: $0 new subscriptions, $0 paid social API calls, $0 language-model calls. Existing hosting/database usage may incur plan-dependent charges; exact incremental hosting bill is not observable. No plan upgraded or auto-recharge enabled.

## Release verification checkpoint

2026-09-23: implementation commit `83f16e4dc10013c95d13c652cdf4fcb5e7c1d0b3`. Final local production build, TypeScript, Welcome SQL/fixture suite, campaign attribution and owner-security regressions passed. The Pro checkout's WELCOME field was filled/applied but the visible total remained $29; no confirmed discount application is claimed. No payment submitted. Mobile frame testing was blocked by the browser URL security policy; no physical-device or mobile viewport result is claimed. Production deployment/cron receipt is the next verification step.

## Verified production receipt — 2026-09-23 03:38 UTC

Release `157679ecc3b8013840fb05bc3d8a12051abd62fc`, Vercel `dpl_3jctxwo9ffLFZoRvDfes1HCHW3Ur`, READY and aliased to www.darthalgo.com. Production minute cron returned HTTP 200 at 03:35 and 03:36 UTC; actual SQL tables existed and `welcome_tick` reported blocked/PROVIDER_CONNECTION_AND_DISCOUNT_REVIEW, sendingAdapters=0, processed=0. Existing Telegram desk and media scheduling continued in the same tick.

Production browser check: `/owner/welcome` rendered the real logo/card and refused private status without the existing owner session. No authentication bypass. A marked test visit (`utm_content=welcome_test`) reached #pricing at viewport top 88px; both visit and checkout-click endpoints returned HTTP 200. The actual Pro checkout URL retained `client_reference_id=daw_<opaque UUID>`, instagram/welcome25/welcome_test parameters. Test visits are excluded from attribution. No payment submitted; no paid-conversion evidence or real social-message ID exists. Mobile viewport and authenticated dashboard screenshots remain unverified due to browser/session limitations.

## Follow-up verification — 2026-09-23

Owner replaced the promotion manually. Latest live promotion `promo_1UIlmDLAuZzjYekvvCsDu6xz` / coupon `ZwoOLN0B`: active WELCOME, 25%, first-time transactions only, no global cap, no expiry or product restrictions. **Duration remains forever**, conflicting with the approved once/first-paid-invoice terms. No assistant Stripe mutation occurred. Existing approval covers the once replacement after safe sandbox validation; no repeat commercial approval is needed. Only live Stripe mode is connected. The deployed verifier now identifies duration, percentage, first-time restriction, cap, expiry and product restriction mismatches explicitly; checkout/test evidence is still required even if configuration matches.

Manychat now renders its channel onboarding screen. Selected Instagram and opened the supported Connect via Meta route; account connection and identity are not yet established. Meta offered Continue with Instagram. The subsequent Instagram authorization document rendered its footer but no credential inputs; automated sign-in cannot proceed from that incomplete form. Manual handoff is required to complete this connection. No terms acceptance, permissions grant, paid plan, native workflow or promotional send was performed.
