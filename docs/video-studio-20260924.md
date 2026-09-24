# Darth Algo: video studio + iPhone experience

## Evidence used

Both linked tutorial transcripts were retrieved in full. This is transcript-based analysis, not a claim that their full visual demonstrations were manually watched.

- Zinho Automates, "I Let ChatGPT-6 Astra Build My Own Higgsfield AI (Copy This)": https://youtu.be/CN6BhyERbas . Relevant sections: 04:07 dashboard, 04:45 video models, 10:07 library, 10:46 spend cap/storage/concurrency, 14:06 structured prompts and image-first production.
- Iman Gadzhi, "Give Me 28 Minutes, I'll Give You 10,000 Hours of ChatGPT Knowledge": https://www.youtube.com/watch?v=w-lkP9XcZfg . Reusable instructions, reference-driven iteration, connected tools, focused agents, verification, and recurring workflows. The video's first-name heuristic is NOT a reliable hallucination detector and is not adopted.
- Connected Metricool Instagram Reel metadata returned seven older Reels dated August 4–24, 2026. Themes: chart clarity, potential signals, trend context and risk levels. This is a limited retrieved sample, not a complete account audit or proof of a winning format. Video frames were not individually watched for every Reel.
- Live product-source imagery: /indicators/signal-context-alt.png, /indicators/scalper-execution.png, /indicators/swing-trend-cloud.png; actual logo /darth-algo-social-logo.png. All from the official Darth Algo site.

## Applied in this patch

The existing /owner app is extended, not replaced. FinanceChart, Stripe/customer/bill records, agent recovery, research suggestions, approval controls, and the publishing queue remain in place.

- Three source-backed video concepts with editable headline, voiceover, visual direction, and scene duration.
- Silent four-scene storyboard timing preview. No generated candles or invented P&L.
- Browser-tab draft persistence, clearly labeled as not cross-device. Text export and clipboard copy.
- Existing authenticated /api/owner/command content-agent job endpoint; existing budget/permissions and worker continue to govern the actual internal job.
- Deterministic SHA-256 request keys. An unchanged brief reuses the same job key after timeouts or page reloads, rather than blindly enqueueing a duplicate.
- Real saved job receipts displayed separately from rendered-video and published-post states. No auto-posting, new recurring schedule, or paid-video generation is enabled.
- A separate 18-second review clip with AI voiceover, actual chart imagery, full-color logo, clear CTA, and trading-risk disclosure. The rendered example does not change when the storyboard is edited.
- Phone-oriented quick actions; less duplication on the home screen; meaningful tab URLs and back navigation; refresh animation; reconnection and visibility refresh; offline feedback; 44px touch targets and 16px form fields; reduced-motion styles.

## Review clip

Provider-hosted original: https://d2ol7oe51mr4n9.cloudfront.net/user_3GjCrDqrkf77RLg2koyExGkjpYm/6ded79a2-b566-4396-a90f-189cc7668dcc.mp4

18 seconds, 1080x1920, 24fps, H.264 + AAC. Produced as a review draft using deterministic motion/compositing and an AI-generated voiceover. Not generative market data, a live trade, proof of profit, or an automatically published campaign. English VTT cues are draft segment timing, not a verified word-level alignment. The source voiceover is approximately 15.384 seconds; the edit includes an end-card hold. Generated video was technically probed in the media tool before delivery.

## What is not implemented here

An autonomous paid rendering service is not wired into this new workspace. It must not pretend to be connected because a ChatGPT Higgsfield connector exists. Higgsfield API billing is separate from website/MCP credits, according to current official documentation:
https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api
https://higgsfield.ai/blog/generate-ai-videos-higgsfield-api

Before enabling app rendering: verify server-side provider credentials, get a current model/configuration quote, define an owner-approved budget, atomically reserve spend for concurrent jobs, implement idempotent request reconciliation, persist outputs to owned storage before provider expiry, and verify completion before presenting a playable result. Do not hard-code promotional prices or assume that a website subscription funds API calls. Keep text/logos/chart data in deterministic overlays; use generative motion for non-evidentiary B-roll only. Failed/unknown outcomes must not cause blind resubmission. No API credential belongs in client code or browser storage.

## Validation

Local commands: `node --experimental-strip-types --test scripts/video-studio.test.mjs`; TypeScript transpile diagnostics. These do not establish a full Next.js build or device test.

Branch workflow independently runs npm install, model tests, full TypeScript checking, scoped lint, a no-secrets production build, and synthetic Chromium checks at 393px and 1280px. It verifies private API 401 responses without an owner session, mock-only content receipts, same-key retries across reloads, draft persistence, back navigation, offline feedback, and overflow. Fixtures use no real customer data or live writes.

A physical iPhone/Safari test and an authenticated production end-to-end job execution are separate checks; do not claim them from synthetic browser tests. Do not call a queued internal brief a finished video or a posted campaign.
