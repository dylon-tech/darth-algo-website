# Hosted private chart runner

The existing Browserbase connection now has a finite scheduled runtime check for the previously authorized Opening Range Fakeout private prototype. `/api/cron/indicator-browser` runs every five minutes with CRON_SECRET authentication and a 180-second function limit. The approved allowance is now three sessions total; the 15-minute session timeout is unchanged. The owner explicitly approved one extra 15-minute session on September 20 after the original two were used. Attempt history is preserved; this grants exactly one remaining start, not a reset. No upgrade or recurring browser purchase is enabled.

One initial job is inserted for the known source hash when the Lab is enabled, production is active, the OS is unpaused and Browserbase is connected. A database claim prevents concurrent work. Completed and blocked jobs do not retry automatically; interrupted jobs become blocked. The owner can explicitly requeue from `/owner/browser` while a sign-in session is active. Unknown creation/termination outcomes keep their reservation.

The runner checks the exact account and dedicated layout, reconnects once under the owner’s existing session-displacement authorization and stops on repeated session contention, reads source via Pine Editor's Copy operation and compares SHA-256, verifies numeric range output on standard AAPL 1/3/5/15-minute charts, restores five minutes, saves and reloads, then verifies the source again. It uses the existing encrypted Browserbase credential and context. Connection URLs, keys, clipboard source and provider error text are not returned or logged. The driver never edits source, enters login details, places a trade or publishes.

Owner flow: Start sign-in session → sign in to TradingView inside the live window → Finish sign-in & test. The scheduled runner executes and sends one outcome notice. An account login in another browser does not establish login in the hosted context. Exhausted pilot starts are displayed honestly; no hidden reset exists.

## Scope

This is an executable **saved-private-chart runtime checker**, not a complete indicator release executor. A successful result does not certify semantic signal behavior, compiler diagnostics, alerts, replay, educational examples, publication or Community discovery. After a successful exact-source check, it imports this existing prototype with a null research run and explicit owner-private-import provenance. It attaches the already observed supervised compile/replay evidence, including the stated unverified cases. The Lab downloads the actual inspected snapshot, records its byte digest and prepares an approval package. No synthetic Research result is created, and no approval is granted automatically. New candidate testing/provisioning and approved public script/educational publication remain unfinished. Release package gates remain in force.

## Validation

PGlite tests exercise the production queue/state code with mocked browser interactions: duplicate claims, pause, source-keyed evidence, login loss, masked errors, interrupted jobs, exhausted allowance and cron authentication. Existing hosted-browser tests retain encrypted-key, CSRF, context and pilot-cap checks. These tests are not live TradingView execution evidence. Inspect `indicator_browser_tick` and the owner browser status for the real outcome after deployment.

References: Browserbase [Playwright connection](https://docs.browserbase.com/welcome/quickstarts/playwright), [session retrieval](https://docs.browserbase.com/reference/api/get-a-session), and [persistent contexts](https://docs.browserbase.com/platform/browser/core-features/contexts).

Live deployment PR85 ran at 19:20 UTC September 20 and returned TRADINGVIEW_LOGIN_REQUIRED. The hosted profile was not verified, and no candidate import or publication occurred. The owner needs a TradingView session in the hosted profile before the runtime check and source-bound package handoff can complete.
