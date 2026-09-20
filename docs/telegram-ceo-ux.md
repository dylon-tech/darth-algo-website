# Telegram CEO desk

Updated 2026-09-20 from the owner's screenshots and request for fewer messages.

## Patterns applied

- Telegram recommends inline buttons and editing the current keyboard for navigation: https://core.telegram.org/bots/features#inline-keyboards
- grammY demonstrates nested menus, Back navigation, and handling outdated menus: https://grammy.dev/plugins/menu#navigation-between-menus and https://grammy.dev/plugins/menu#outdated-menus-and-fingerprints
- SendPulse connects clearly named business menu choices to specific flows: https://sendpulse.com/knowledge-base/chatbot/telegram/menu

These are implementation patterns, not evidence that a particular design increases sales. No new bot platform or paid dependency was added.

## Behavior

Six home choices: Overview, My team, Posts, Needs me, Ideas, Settings. Two primary actions per agent. Advanced website connection and pause controls live in Settings. Every reply identifies its agent; Home routes subsequent text to CEO.

Navigation and direct work results edit one durable panel. Changing agents can start a new panel. Session/revision checks keep old jobs from replacing another agent's panel or a newer view. Duplicate clicks reuse queued work. Results remain available under Last result with pagination. External execution continues through existing publishing safeguards.

A deleted/non-editable Telegram message may be replaced once after a definitive provider rejection. Ambiguous timeouts never trigger a send fallback. Existing historical messages are not deleted.

Routine background reports, publishing confirmations and failures are summarized in the scorecard/digest. A private login link is still sent separately with protected content; bearer links never enter the outbox. Other approval records remain reviewable in the owner dashboard.

The briefing runs at 9 AM America/New_York, deduplicated by local date. The minute worker catches up after downtime. The separate daily route checks both 13:00 and 14:00 UTC and the local hour for daylight saving time.

Active subscribing customers are unique Stripe customer IDs with at least one active subscription, for the whole connected live account. Trials and past-due counts are separate and may overlap those customers. Counts require complete pagination and live-mode verification, with a 15-minute cache. Lifetime ownership and actual TradingView access remain unverified. Published-post totals count distinct app publication records with confirmed provider timestamps for the local date.

## Validation

PostgreSQL-engine tests cover message targets, edit/send behavior, replay and task deduplication, agent isolation, CEO reset, unknown delivery handling, unique-customer counting, daily brief deduplication, and retained private login behavior. Telegram and Stripe are mocked in tests; deployment logs verify real message edits and digest delivery.
