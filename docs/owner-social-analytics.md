# Owner social analytics

`GET /api/owner/social-analytics` is owner authenticated, private/no-store, and has no mutation method. Content Analytics reads the existing encrypted website vidIQ connection. ChatGPT's connection is a separate authorization; this feature never transfers it or activates publishing.

The only allowed tool calls are `vidiq_social_account_list`, `vidiq_instagram_owner_insights`, and `vidiq_social_post_list` (their unprefixed MCP aliases are accepted). Current official tool descriptions specify zero credits per call. Discovery validates the used input fields, required arguments, explicit zero-credit price, and rejects a write annotation, duplicate tool, changed price, or unsupported schema. At most three free read calls and three discovery pages occur per request; transport retries are disabled and the network session has a 28-second deadline. Concurrent requests are coalesced. No private provider result is retained in browser storage or a global cache.

Instagram uses one active OAuth account with the exact business handle and insights scope. It displays at most 20 source Reels, with six shown initially; per-Reel measures are lifetime values, not a date-window total or revenue. Null/malformed measures remain unavailable. Other account identities must match the business handle; a TikTok display name without a username is insufficient and remains unavailable.

The bounded receipt page covers the last 30 days and next six days for verified accounts. It excludes undated drafts and posts sent through Metricool/native/Buffer. Counts refer only to returned destination rows. A dated draft is not scheduled, a completed delivery is not independent proof of public visibility, and an unknown outcome must be reconciled before retry. This read path never clears or retries historical failures.

TikTok, YouTube and Threads performance is explicitly unavailable: the currently exposed detailed YouTube/TikTok lookups cost credits and there is no free app-side Threads reader. No new spending authorization is inferred. Existing website account authorization and actual live tool availability still require authenticated production verification.

Tests cover authorization and private headers, absent/expired connection, exact free tool allowlist, price/schema drift, account/scope parity, independent reader failure, malformed numbers/URLs, receipt window matching and deduplication, and truthful presentation. Mocked tests do not establish a live provider connection or a successful deployment.
