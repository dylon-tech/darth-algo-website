# Shared daily photo publishing

Owner instruction, September 20, 2026: include Threads; use the same post on X, Instagram and Threads; replace the standalone community educational post with one daily preview and link to the social post. Videos remain owner-produced.

## Result

- One immutable three-image campaign and one caption, shared verbatim across all three networks.
- The Content agent writes a fresh shared caption hook using current research evidence, recent captions and owner topic/style suggestions. Existing AI budget limits still apply. Unsupported or unavailable output falls back to the recorded-chart lesson caption; a queued job has up to 30 minutes before that fallback.
- Five rotating owned-chart lessons: context, signals, risk planning, tools and community. Real product screenshots remain unaltered; captions identify recorded examples. Every caption points to the links page.
- Daily window opens at 9 AM America/New_York. One campaign per platform/day and at least 20 hours between automatic platform submissions. Existing recent posts can delay the first campaign after cutover. Channels publish independently; connecting Threads later can deliver that day's saved campaign without resending X/Instagram.
- X and Instagram retain their pinned account IDs. Threads must match the exact darth.algo handle, or an explicitly configured BUFFER_THREADS_CHANNEL_ID. Missing, ambiguous, disconnected, locked or paused channels are blocked.
- Community: one first-slide preview plus buttons to actual confirmed published post URLs. Uses the existing community education topic. It can link the first confirmed platform without waiting for disconnected platforms. It does not send a separate lesson or link to an unpublished draft.
- Old unsent independent X/Instagram approvals are superseded; accepted deliveries are reconciled. The legacy education trigger calls the new preview workflow and cannot force an extra send.
- Telegram queue, today's posts, CEO brief and owner receipt view include Threads.

## Reliability

Existing activity/approval tables retain exact payload hashes, immutable asset hashes, standing authorization and provider receipts. Transactional advisory locks serialize preparation and claim operations. Attempts are committed before external writes. A lost Buffer or Telegram response is flagged for review and never blindly retried. Provider readback must match caption, channel, image order and alt text. Public post links must use the matching platform's HTTPS post URL format.

No new credentials, schema migration, paid service or public posting endpoint. Pause continues to stop new sends. Photo generation uses the existing owned-chart renderer.

## Validation

- Full Next production build and TypeScript check passed.
- PGlite integration exercises concurrent preparation/submission, exact same content on all three platforms, account selection, immutable bytes, pause, readback, validated social links, daily community dedupe, legacy education replacement and lost-response handling.
- Existing legacy manual handoff contract remains tested with the new policy explicitly disabled in that isolated fixture; default policy is separately asserted to suppress it.
- Photo-plan tests cover five themes, Eastern midnight/DST, caption limits and owned assets. Five covers and all signal slides were rendered; the signal cover was visually inspected.
- Queue/hash-route tests cover the new executor and legacy assets. Competitor parser coverage retained separately.
- External services are mocked in integration tests. Production activation and Threads login are verified separately; tests do not establish a real Threads publication.

Buffer reference: https://developers.buffer.com/reference.html
