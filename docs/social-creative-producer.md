# Cinematic social production and delivery

Owner decision: September 22, 2026. Skill: darth-algo-operations 1.0.0. Work ID: DA-TWICE-DAILY-20260922-v1.

The production app is the only social publisher. It prepares the next eligible campaign, opens morning delivery at 9 AM and afternoon delivery at 3 PM America/New_York, and sends the same reviewed image(s) and caption to X, Instagram and Threads. Whop receives campaign copy through its existing Home-feed adapter. Telegram receives one image preview and confirmed social links per slot. The submission windows close at noon and 6 PM; an outage must not cause a burst of missed posts later. Uncertain responses require reconciliation before another submission on that social channel. A four-hour spacing safeguard replaces the retired twenty-hour rule.

## Source and creation contract

The ChatGPT photo producer creates and reviews artwork using the built-in image generation capability and the owner's four actual photo references. It replenishes the repository queue; it never calls Buffer, Metricool, Telegram or Whop publishing APIs. This split prevents a duplicate publisher and does not authorize separately billed image APIs, new subscriptions, credits or paid overages.

1. Read `content-system/brand-rules.md`, `docs/trusted-company-context.json`, `app/lib/business-os/social-campaign-queue.ts`, and `public/creative-references/cinematic-2026-09-22/manifest.json` from current main in `dylon-tech/darth-algo-website`.
2. Inspect the actual reference images before image generation. Use matching references as image inputs. Original cover is a style reference only; its historical screen label is not proof of a real trade. New generated screens must say "Illustrative display"; conceptual community screens must say "Community preview".
3. Keep the next two Eastern calendar days supplied with one morning and one afternoon campaign. Fill the earliest missing future slots, at most two new campaigns per run. Preserve existing campaign entries and all attempted/published versions. Never silently reuse the same image, copy a prior campaign to another date, or overwrite history. If the target buffer is already complete, finish quietly.
4. Create fresh portrait 4:5 artwork with built-in imagegen: cinematic faceted black/glass, red rim lighting, metallic silver/red headlines, oversized angled devices, compact feature panels, actual full-color Darth Algo logo, mobile-readable type and a clear official CTA. Vary subject and composition. No old headline/paragraph/flat-chart card layout. Product claims must come from the current company sources. No invented profits, performance, testimonials, membership counts or offers.
5. Inspect the actual final image at phone scale. Check typography, crop, logo, device/chart legibility, truthful screen labels, supported feature copy, destination and reference match. Revise failures before adding a review record. Style approval alone does not establish review of an unseen final image.
6. Save the final PNG or JPEG (at most 8 MB) under `public/social-campaigns/YYYY-MM-DD/<descriptive-name>-<first-12-SHA256>.jpg` or `.png`. Export/encoding changes require hashing and review of the resulting file. Keep copy under 280 characters including a verified official destination, appropriate illustrative/risk wording, and one relevant hashtag.
7. Append the entry to `app/lib/business-os/social-campaign-queue.ts`. This is a typed array of plain JSON objects after `export const socialCampaignQueue:ReviewedCreative[] = `. Each entry uses a unique id, day (YYYY-MM-DD), slot (morning|afternoon), theme, text, assets [{path,sha256,altText,mimeType}], and review {referenceVersion,sha256,reviewer,reviewedAt}. `review.sha256` is SHA-256 of UTF-8 `JSON.stringify({text:entry.text,assets:entry.assets})`, preserving asset order and field order. Reference version is `cinematic-owner-references-2026-09-22-v1`. Record the reviewer and actual timestamp only after visual review.
8. Read current main again before writing. Commit only the new image files and appended queue records using GitHub blobs/tree/commit/ref, non-forced fast-forward. If main moved, preserve other changes and rebuild the tree. Existing standing authorization covers this bounded content-only append and its automatic deployment. It does not authorize unrelated code edits, new channels or changes to scheduling/safety policy.
9. Validate queue structure/hashes and read Vercel deployment for that exact commit. Prepared, committed, deployed and published are separate states. The production app will ingest only the matching reviewed bytes. Missing or changed assets remain held and visible as `creative_assets_required`.

If built-in image generation or an authenticated connector is unavailable, save a precise blocker and notify the owner once; never buy capacity, declare a draft published or silently fall back. Scheduled task configuration is not evidence of a successful unattended generation run.

## Initial queue

September 23: morning clarity cover (screen label corrected to Illustrative display); afternoon Pro.
September 24: morning trade levels; afternoon community.
These are four distinct, visually inspected single-image posts. Future entries may have one to three images, identical across the three social platforms.
