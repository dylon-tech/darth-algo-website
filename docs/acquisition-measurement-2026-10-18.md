# Bounded first-party acquisition measurement

Work ID DA-MEASUREMENT-20261018-v1. Darth Algo Operations skill 1.2.0.
Status: implemented and tested locally; production activation/readback is separate.

## What changed

- Exact public destinations `/`, `/links`, `/compare`, `/alternatives`, `/start`, and the three product pages send an anonymous page/tab observation to the existing app and Postgres. No analytics SDK, new vendor, credential, paid tier, customer message, payment, price or checkout-flow change.
- Random tab IDs rotate after 24 hours; repeat tab/page/campaign observations are deduplicated. Checkout clicks are stored separately from visits and are never called completed Stripe sessions. Traffic is not declared human or qualified merely because it appeared.
- Signed-in owner requests, owner/admin paths, preview deployments, localhost and explicit `?measurement=test` sessions are excluded. The browser tab remains excluded after opening owner/admin or a test link. Signed-out owner traffic in a different tab/browser cannot reliably be identified.
- Collector data contains only an anonymous random ID, exact allowlisted path, known source and bounded controlled campaign/content labels. It does not store IP, user agent, referrer, raw query/URL, names, emails, TradingView usernames, customer or payment identifiers. Unknown free-text campaign/content values become `unregistered` before transmission, collector requests suppress the Referer header, and raw fields are rejected if submitted raw.
- Maximum 500 new observations per UTC day and 15,000 retained rows; 30-day retention, pruned on new visits and at the top-of-hour tick of the existing authenticated owner-work schedule (within an hour while that schedule is healthy). Capacity-hit days are visible, not treated as zero traffic. Query results cap at 500 groups and disclose truncation. These application caps bound storage, not an absolute infrastructure-spend guarantee during abusive requests.
- Owner-only `/api/owner/acquisition` returns aggregate visits and separately available Stripe observations. Existing business evidence includes this same visit snapshot. An unavailable database or Stripe source is reported unavailable, never zero.

## Checkout and subscription interpretation

Existing source/campaign references are preserved through same-tab navigation and only the four existing allowlisted Stripe Payment Links are decorated. Existing affiliate and welcome references are never overwritten by this change. Untagged sessions remain unknown.

The existing Stripe checkout snapshot retains initial positive paid checkouts, trial starts and zero-payment sessions separately. A bounded read of complete invoice histories for up to 20 tagged subscriptions within an eight-second read budget adds the first eligible positive recurring invoice marked paid for each subscription, including trial-to-paid. A trial requires a verified trial end and a post-trial recurring invoice; upfront/setup-fee invoices during the free trial are excluded. Later recurring invoices are renewals and excluded from acquisition counts. Missing pages, missing payment timestamps, ties, multiple sessions for one subscription and unsupported invoice reasons remain unavailable or ambiguous. The original campaign reference is read from the Checkout session; no subscription metadata, invoice, webhook configuration or payment state is mutated.

First-paid-subscription invoice counts may overlap initial paid-checkout counts: **never add them**. They are not first-ever paid-customer counts or independently verified new cash/net revenue. Amounts retain their currency, include tax and exclude refund/dispute/fee deductions. Existing accounting stays authoritative for money received. The 30-day attribution window and same-tab/browser limit are explicit; historical visits and untagged purchases cannot be reconstructed.

## Future links

Use short controlled campaign IDs in a newly reviewed artifact: for example `?utm_source=x&utm_campaign=2026-10-19-morning&utm_content=caption` on the matching product URL. Source is a client-supplied label, not proof of platform delivery or causal lift. Supported controlled campaign forms are dated morning/afternoon IDs, existing `post-<32 hex digits>` IDs and `default`, `welcome25`, `links`, `tool-comparison`; controlled content labels are empty, `profile`, `link_in_bio`, `caption`, `bio`, `welcome_test`.

Existing reviewed captions are not rewritten. Bare links and in-app browsers that strip tags remain source unknown. Instagram bio traffic is not automatically attributed to a particular post. Do not compute a click-to-purchase conversion rate from unjoined page/tab counts and Checkout sessions.

## Cost and verification boundary

This adds no paid product, dependency or worker. Existing hosting included-credit headroom was checked privately before implementation; this public record does not contain billing/account details. Application traffic still consumes existing hosting/database resources. Do not enable a paid analytics tier or increase spend under this work.

Tests use isolated PGlite storage and mocked Stripe/browser surfaces only. They cover strict input/privacy allowlists, owner/preview/test exclusion, concurrent/repeated dedupe, retention and capacity, unauthenticated rejection, group-only outputs, client storage/network failures, original checkout destination and affiliate preservation, trial-to-paid versus zero/renewal/historical-unknown/test/ambiguous invoices, and incomplete invoice pagination without suppressing otherwise available checkout data. PGlite fixtures do not prove multi-process PostgreSQL locking or live ingestion.

Before calling measurement live: verify the exact production commit is READY; read the authenticated owner snapshot (unavailable until the first accepted observation initializes this collector); confirm owner/test requests are excluded; observe a naturally arriving visitor record after activation. Do not manufacture a visitor or purchase to make the dashboard nonzero. Historical zero visits means missing measurement, not no traffic. Revert only this collector/client/source change if it disrupts navigation; keep additive tables and existing payment evidence intact.
