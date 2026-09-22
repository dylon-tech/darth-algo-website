# Darth Algo implementation ledger

Updated: 2026-09-22 UTC. Owner-facing time zone: America/New_York.

This ledger records verified evidence, not intended state. `live` requires a provider or deployment receipt; `tested` means an offline or local test passed; `blocked` names the exact dependency.

| Workstream | Owner | Status | Dependency | Evidence | Acceptance test | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Source repository | Operations | live | GitHub | `dylon-tech/darth-algo-website`, main at `bbd303b` during audit | Connected repository is readable and writable | Keep main as source of truth |
| Production build | Operations | live | Node/Next.js | Vercel production deployment `dpl_GWsUjAY7S5BKmQYySJKiN7GoDTSG` reached READY for commit `b551b71`; public home and `/owner` return 200 | Clean compile, production READY, routes respond | Continue runtime error monitoring |
| Durable OS schema | Operations | tested | Production `DATABASE_URL` | PGlite-backed schema, queue, approval, handoff, Telegram, content, and indicator tests | Full safe-fixture suite passes | Observe production migration and heartbeat |
| Owner command center | Operations | tested | Owner runtime configuration | `/owner`, PWA manifest, session and private-route tests | Phone-sized authenticated command creates durable job | Verify on production iPhone Safari |
| Recurring executor | Operations | live with attention | Vercel cron plus production flags | Independent production `/api/cron/owner-work` runs every minute and `/api/cron/owner-health` runs every five minutes; current public health is `attention` | Fresh cloud heartbeat and successful cron HTTP result | Resolve the exact health issues shown in authenticated owner view |
| Premium carousel workflow | Content | held for creative replacement | Matching final campaign assets and visual QA | Owner rejected v4; fresh sends blocked while existing receipts remain reconcilable | Complete matching campaign, exact hashes and provider receipt | Connect checked cinematic assets before resuming |
| Indicator prototype workflow | Research | partial | Hosted TradingView session | Production log records one candidate; private testing is blocked, release executor is not connected, and social discovery is waiting for credits | TradingView compile/replay evidence attached to exact source hash | Run supervised private validation; do not release yet |
| Customer support/retention | Support | tested | Support inbox adapter for outbound work | Deterministic routing and retention tables/tests | Verified inbound event creates deduplicated case; resolution cancels follow-up | Connect/verify inbox executor |
| Native reusable skill | Operations | installed | Skills directory | Version `1.0.0` validates and is saved to the reusable skill directory | Validator passes and installed package retains workflow references | Refresh Skills view if it is not immediately visible |
| Supabase | Operations | intentionally retired; not authoritative | All discovered projects inactive | Production runtime is executing successfully against its configured Postgres/Neon database; no Supabase project is referenced | None; excluded from production health | Do not resume or migrate without explicit source-of-truth evidence |

## Stop conditions

- Do not publish, message customers, change offers, spend money, or release an indicator without the existing exact-scope authorization and provider readiness gates.
- Do not retry an uncertain external outcome until readback or reconciliation establishes that the first attempt did not succeed.
- Do not represent queued, configured, compiled, or statically screened work as live execution.

## Content correction — 2026-09-22

Workflow: Premium carousel + creative QA; skill version 1.0.0. Dedupe key: DA-CONTENT-20260922-RETIRED-TEMPLATE-v4.

- Founder evidence: screenshots of today's navy/gold carousel with generic hooks. Standing instruction is premium black/red with actual full-color logo, TradingView context, prominent product, device mockups and CTA.
- Verified code defect: daily_social_ready cache was reused without any template-version check. The newer renderer alone could not refresh saved images. Old generic slide copy remained active. Rendering also exposed missing nested-SVG logo output and ineffective bold typography.
- Fix: version daily assets and caption jobs; rebuild only unsent retired campaigns under both publishing locks; expire superseded unsent approvals; preserve immutable assets and all provider attempts/receipts; block additional sends from attempted legacy campaigns. Next day's campaign uses the current renderer.
- Creative: product-led five-theme rotation, premium black/red, actual raster logo on every slide, bundled licensed bold font, owned chart captures, phone product mockup, explicit TradingView context and relevant /links CTA. No fabricated performance.
- Tested: PGlite-backed concurrent migration, no provider writes during replacement, expired approvals, new payload dedupe, legacy attempt holds, existing three-platform/Telegram receipt and lost-response safeguards; caption limits; TypeScript and changed-file lint. Rendered campaign images inspected locally.
- Deployment and actual next-post receipt must be verified separately. Do not label a generated preview as a published replacement.

## Mandatory social reference pack — 2026-09-22

Workflow: Company context and policy + creative QA; skill 1.0.0. Dedupe key: DA-SOCIAL-REFERENCES-20260922-v1.

- Founder decision: “from now on” all agent social posts should use the approved photos as references, including Instagram, X and Threads.
- Four approved images packaged as durable JPEG reference copies, preserving full dimensions; manifest records source PNG hashes and reference JPEG hashes. These are visual references, not publication receipts.
- Recurring Content model requests now include two bounded thumbnails selected from the four reference images (cover plus a deterministic rotating companion), preserving the existing image and spend limits alongside the shared mandatory direction. Brand rules, agent prompts and trusted company context require the same reference version. Text-only promotional fallback removed from instructions.
- Fresh-publication hold remains in both the scheduled and direct daily executor paths. Existing v4 is not renamed as approved. No new social send or paid image generation is part of this change.
- Next execution dependency: matching final campaign images must be connected to the publisher and reviewed by exact hash before fresh sends resume. Attaching references to a planning/caption worker does not install an image-generation engine.

- Validation: reference JPEG SHA-256 hashes match the manifest; all four photos participate in deterministic bounded Content inputs; existing budget-envelope checks, TypeScript and changed-file lint passed. Production deployment and runtime execution require separate readback.
