# HQ World

Operations workflow: deployment verification, Darth Algo Operations skill 1.0.0.
Baseline/rollback commit: `5f524cfcee3f89d0c63fbde9b8245e9b4997f793` (production verified September 25, 2026).

## Entry and controls

`/owner/world` requires the existing signed owner session on the server. The dashboard adds an optional HQ World link. The last chosen view is remembered in local storage, without redirecting the owner away from existing links. `/owner` remains the fallback.

The campus uses the existing `/api/owner/dashboard` snapshot, `/api/owner/command` job/message/pause controls, and unchanged content and approval APIs. No new database, credentials, scheduler, publication destination or worker is created. Eight departments map to the existing nine named roles. Publishing is an existing workflow, not an invented tenth agent.

Reusing a request key for different work is rejected; exact retries return the original saved job.

Give Work and Message save a real `os_jobs` request and display its ID. Run now asks the existing bounded worker to check one eligible queued job. Acknowledgment is not completion. Existing AI enablement and budget policies still apply. Pause controls future job admission; in-flight provider calls may finish. Content Disapprove/Remake/Approve replacement retain exact-version, locking and hold rules. Remake can create a brief; the existing server still lacks a finished-art renderer. No new paid renderer was added.

Indicator source, real preview evidence, upload and release review stay in the protected Indicator Lab. Support/retention and welcome decisions stay in their existing protected workspaces. No customer contact or indicator release is triggered by entering a room.

## State and freshness

45-second dashboard polling while visible, 18-second timeout, one in-flight read, at least 10 seconds between automatic refreshes, and rejection of older snapshots. Hidden tabs stop refreshes and rendering; foreground return resynchronizes. Manual refresh/action readback is explicit. Base rate is at most 80 snapshot requests per visible hour per tab; opened existing work panels retain their existing polling rates. Private snapshots stay in memory. No service-worker caching of private records is introduced.

Online requires a running job/run younger than five minutes. Snapshot freshness expires after 90 seconds. Paused, blocked, error, missing setup and stale/unverified evidence are separate. In-flight work can remain Online while future admission is paused. No percentages are invented for jobs. Event IDs deduplicate the bounded feed; there are no sale or job-completion celebrations on snapshot reload.

The world uses confirmed monthly equivalent bills only; estimated and missing bills remain separate. Income remains the existing complete-page USD live Stripe gross-receipts calculation, before refunds/fees, with source dates. Customer totals remain unique active subscribers and separate trials. No existing numeric revenue progression definition was found; world milestones use explicitly labeled rolling 30-day USD gross receipts, $1,000 then triple. Milestones never gate a business control.

## Rendering, editability and access

The September 25 studio upgrade replaces the miniature Phaser presentation with original React/SVG architectural illustrations. All important labels are HTML, rendered at native device resolution. No WebGL, raster text, game-loop dependency or paid assets are required. The old CC0 atlas/map and license manifest remain archived, but no longer load in HQ World. The original illustrations are editable in `app/owner/world/room-art.tsx`; styling and state-driven animation live in `studio.module.css`.

The focused room view shows larger characters, distinct equipment for each department, current saved requests, reported stages, completed output, and real campaign artwork where available. Whole campus shows eight selectable illustrated rooms. Previous/next room, enlarge, motion pause, and readable department tabs work with touch or keyboard. Messages, assignments and existing department workspaces remain available beside the scene. Publishing is a workflow without an invented agent.

Character and screen motion runs only while the fresh adapter reports actual running work. This is an illustration of saved worker state, not live screen capture, tool-call telemetry, a completion percentage or access to hidden model reasoning. A running content agent may be developing a brief; it is never presented as an unsupported live artwork renderer. Idle, stale, paused and completed state stop work motion. A manual motion control, OS reduced-motion preference and hidden-tab pause suspend animation without pausing server work.

## Feature flag / rollback

Set existing-host environment variable `HQ_WORLD_ENABLED=false` and redeploy to hide the dashboard link and protect the world with a disabled screen. The optional world is available when unset. Existing owner APIs/agents are unaffected. For full rollback, revert this feature's commit/merge or promote the previous verified production deployment. No data migration is needed or reversed.

## Costs

$0 software/art purchases; Phaser/template MIT and Kenney CC0. Existing Vercel Pro hosting, database, authentication and workers are reused. No subscription, paid account, trial, credit purchase or extra public test post is created. Existing AI charges remain governed by the pre-existing worker approvals and budget caps; no paid generation is needed for the world itself.

Live read-only hosting inspection confirmed Pro and remaining included infrastructure credit before release. Standard Linux GitHub Actions on this already-public repository are the free CI path: https://docs.github.com/en/actions/reference/runners/github-hosted-runners . These facts do not promise unlimited free hosting or 24/7 AI. World asset transfer, database reads and function invocations use the existing hosting allocation; account on-demand auto-pause was not enabled and no billing settings were changed.

## Verification

See `scripts/hq-world-model.test.cjs` and `.github/workflows/hq-world-validation.yml`. Browser CI runs Chromium desktop and WebKit at 393×852, using isolated test PostgreSQL for command writes, with explicitly labeled synthetic financial/agent snapshots. It tests authentication/origin checks, eight rooms, real saved task IDs, concurrent duplicate delivery, pause/resume, bounded worker requests, browser-close queue durability, back navigation, draft persistence, failed requests/reconnect, old response rejection, native-scale SVG, active/idle lifecycle motion, motion pause, reduced motion, loading bytes and frame timing. It records screenshots/video; those are test evidence, never production metrics or actual iPhone evidence.

Existing Business app and iPhone workflows cover PostgreSQL version-bound content decisions, concurrent holds, remakes, revisions, approval rollback, financial/editorial consistency and the original dashboard. `tests/business-os-integration.mjs` exercises the actual durable worker/handoff code with an isolated PostgreSQL engine and mocked AI responses, with no external provider call. Live signed-in owner action verification remains separate from these tests.


Security audit: the baseline had a critical Next.js AVIF image-optimization advisory and high sharp/nanoid advisories. Updated Next.js to 15.5.26 and supported sharp/nanoid resolutions. Post-patch production audit has no critical findings; an existing PostCSS high advisory and Next.js transitive moderate warning remain because the maintenance release pins PostCSS 8.4.31. No untrusted CSS is introduced by this feature, and no forced unsupported override or major framework migration was made. Sources: https://github.com/advisories/GHSA-2xp9-vwfh-vxw4 and https://nextjs.org/blog/nextjs-security-update-september-22-2026 .
