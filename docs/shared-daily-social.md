# Shared morning and afternoon social campaigns

Owner authorization: September 22, 2026. Policy `owner-twice-daily-2026-09-22-v3` supersedes the one-post/day schedule.

- 9 AM and 3 PM America/New_York, every day. The same campaign goes to X DarthAlgos, Instagram darth.algo and Threads darth.algo for each slot. Morning and afternoon have distinct artwork and copy.
- Only reviewed cinematic artwork from `social-campaign-queue.ts` is eligible. Each review is bound to the reference version and exact caption/asset digest. Every downloaded byte is checked against its SHA-256 hash before storage and delivery.
- No legacy renderer, palette-only reskin, text-only social fallback or automatic recycling when the queue is empty.
- Morning window: 9 AM–noon; afternoon: 3–6 PM. No missed-slot catch-up bursts. Four-hour platform spacing, separate date/slot keys, transactional locks, exact-payload checks and attempt receipts prevent duplicate sends.
- Already accepted historical payloads retain their original policy IDs and can be reconciled. Retired creative cannot create a new submission.
- Whop Home receives campaign copy through its existing adapter. Its text-only output is not represented as an image post.
- Telegram community gets one preview and actual confirmed social links per slot. No separate daily lesson or duplicate ChatGPT publisher.
- The photo producer only appends reviewed assets to the queue; the deployed app alone sends posts. See `social-creative-producer.md` for the complete creation contract and no-additional-spend boundary.

Read `daily_social_status` and provider receipts for the date/slot. A saved asset, active cron, deployment, or empty Buffer queue is not proof of publication.
