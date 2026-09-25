# HQ World

Operations workflow: deployment verification, Darth Algo Operations skill 1.0.0.
Baseline/rollback commit: `5f524cfcee3f89d0c63fbde9b8245e9b4997f793` (production verified September 25, 2026).

## Entry and controls

`/owner/world` requires the existing signed owner session on the server. The dashboard adds an optional HQ World link. The last chosen view is remembered in local storage, without redirecting the owner away from existing links. `/owner` remains the fallback.

The campus uses the existing `/api/owner/dashboard` snapshot, `/api/owner/command` job/message/pause controls, and unchanged content and approval APIs. No new database, credentials, scheduler, publication destination or worker is created. Eight departments map to the existing nine named roles. Publishing is an existing workflow, not an invented tenth agent.

Give Work and Message save a real `os_jobs` request and display its ID. Run now asks the existing bounded worker to check one eligible queued job. Acknowledgment is not completion. Existing AI enablement and budget policies still apply. Pause controls future job admission; in-flight provider calls may finish. Content Disapprove/Remake/Approve replacement retain exact-version, locking and hold rules. Remake can create a brief; the existing server still lacks a finished-art renderer. No new paid renderer was added.

Indicator source, real preview evidence, upload and release review stay in the protected Indicator Lab. Support/retention and welcome decisions stay in their existing protected workspaces. No customer contact or indicator release is triggered by entering a room.

## State and freshness

45-second dashboard polling while visible, 18-second timeout, one in-flight read, at least 10 seconds between automatic refreshes, and rejection of older snapshots. Hidden tabs stop refreshes and rendering; foreground return resynchronizes. Manual refresh/action readback is explicit. Base rate is at most 80 snapshot requests per visible hour per tab; opened existing work panels retain their existing polling rates. Private snapshots stay in memory. No service-worker caching of private records is introduced.

Online requires a running job/run younger than five minutes. Snapshot freshness expires after 90 seconds. Paused, blocked, error, missing setup and stale/unverified evidence are separate. In-flight work can remain Online while future admission is paused. No percentages are invented for jobs. Event IDs deduplicate the bounded feed; there are no sale or job-completion celebrations on snapshot reload.

The world uses confirmed monthly equivalent bills only; estimated and missing bills remain separate. Income remains the existing complete-page USD live Stripe gross-receipts calculation, before refunds/fees, with source dates. Customer totals remain unique active subscribers and separate trials. No existing numeric revenue progression definition was found; world milestones use explicitly labeled rolling 30-day USD gross receipts, $1,000 then triple. Milestones never gate a business control.

## Rendering, editability and access

Pinned Phaser 3.90.0, client-only dynamic import; the existing Next.js 15.5.19/React 19 stack is unchanged. The official current template uses Phaser 4/Pages Router and optional telemetry; it was inspected as a bridge/lifecycle reference, not copied wholesale. No template telemetry or demo code is included.

16px tiles, local atlas, eight furnished cutaway rooms, room picking, existing-agent sprites, four-direction original walking variations, grid pathfinding, depth ordering, bounded camera, drag/pinch/zoom, keyboard panning and accessible HTML department controls. Movement is decorative and never starts or delays a job. Rendering targets 30 fps to limit device usage; this is a cap, not a measured physical-device claim. Reduced motion stops walking. WebGL context loss and texture failure leave the HTML controls accessible; reload tears down/recreates the engine. All listeners, observers and the game are cleaned up on unmount.

Edit `public/hq-world/campus.tmj` in Tiled; keep `campus.tmj.json` identical for the typed map lookup. `scripts/build-hq-assets.py` rebuilds the tile atlas, original sprites and map from extracted official Kenney archives using Pillow. Exact archive URLs/hashes, used source files and modifications are in `public/hq-world/asset-manifest.json`. All source notices are retained. No fonts are redistributed.

## Feature flag / rollback

Set existing-host environment variable `HQ_WORLD_ENABLED=false` and redeploy to hide the dashboard link and protect the world with a disabled screen. The optional world is available when unset. Existing owner APIs/agents are unaffected. For full rollback, revert this feature's commit/merge or promote the previous verified production deployment. No data migration is needed or reversed.

## Costs

$0 software/art purchases; Phaser/template MIT and Kenney CC0. Existing Vercel Pro hosting, database, authentication and workers are reused. No subscription, paid account, trial, credit purchase or extra public test post is created. Existing AI charges remain governed by the pre-existing worker approvals and budget caps; no paid generation is needed for the world itself.

Live read-only hosting inspection confirmed Pro and remaining included infrastructure credit before release. Standard Linux GitHub Actions on this already-public repository are the free CI path: https://docs.github.com/en/actions/reference/runners/github-hosted-runners . These facts do not promise unlimited free hosting or 24/7 AI. World asset transfer, database reads and function invocations use the existing hosting allocation; account on-demand auto-pause was not enabled and no billing settings were changed.

## Verification

See `scripts/hq-world-model.test.cjs` and `.github/workflows/hq-world-validation.yml`. Browser CI runs Chromium desktop and WebKit at 393×852, using isolated test PostgreSQL for command writes, with explicitly labeled synthetic financial/agent snapshots. It tests authentication/origin checks, eight rooms, real saved task IDs, concurrent duplicate delivery, pause/resume, bounded worker requests, browser-close queue durability, back navigation, draft persistence, failed requests/reconnect, old response rejection, reduced motion, renderer fallback, loading bytes and frame timing. It records screenshots/video; those are test evidence, never production metrics or actual iPhone evidence.

Existing Business app and iPhone workflows cover PostgreSQL version-bound content decisions, concurrent holds, remakes, revisions, approval rollback, financial/editorial consistency and the original dashboard. `tests/business-os-integration.mjs` exercises the actual durable worker/handoff code with an isolated PostgreSQL engine and mocked AI responses, with no external provider call. Live signed-in owner action verification remains separate from these tests.
