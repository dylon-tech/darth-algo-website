# Native renderer — implementation and activation history

November 16 update: the existing $5/UTC-month, $0.05/attempt and 100-attempt authorization is preserved; verify its actual configuration and usage before a hosted attempt. The original preparation record below is historical, not withdrawal of that approval.

The reusable native editor now uses a settled centered camera, larger borderless captions at measured phrase-audio boundaries, reading holds, a readable outro and an unchanged final quarter-second cover. Original procedural transition accents are included. Optional existing hip-hop music is read only from `DARTH_RENDER_PRIVATE_ASSET_DIR` outside the repository, after exact size/SHA256 verification against `v15-private-assets.json`; no URL fetch or public media bundle is added. The approved ZIP's `sound_revision/assets/hiphop.wav` must be provided privately as `v15-approved-hiphop.audio`. Missing music is reported explicitly. No hosted private asset upload is implemented by this change.

Narration remains Kokoro am_michael, with ONNX telemetry disabled before session creation. These are derived drafts, not full v15 fidelity or approved ElevenLabs narration. Measured phrase takes are not word alignment. Current captures remain still images, not a stabilized moving chart recording. Results remain Checking and require creative review. The local smoke command accepts the exact approved template ZIP and writes a changed review clip outside the repository, without API calls, upload, or publication.

This patch is complete code for the existing Vercel project, prepared against main `1d9d5a19359bbbea718549d0a72d0db6661d1d68` (tree `2edd2da974ec6154443bf98822cb39fff32b568a`). It must remain on its separate preparation branch until explicit additional-rendering approval. No hosted preflight, owner job, external send, or publish operation was run while preparing it.

## Implemented path

The authenticated owner route and existing owner-work cron establish a 300-second request lifetime. The cron begins native planning before its legacy integrations. `after(Promise)` immediately keeps the started dispatch alive alongside legacy work. An attempt requires at least 280 seconds remaining before claiming, under the reservation lock, and before its single HTTP invocation. A late unreserved claim returns to Queued without consuming an attempt. The native function has a 230-second cooperative render/download deadline, 265-second callback deadline, and 300-second platform duration; the dispatcher waits at most 275 seconds.

The serialized queue permits one active native media job. Each exact job/lease/version is reserved before invocation. Service HMAC tokens bind audience, mode, job, lease, worker, deployment SHA and request bytes; the durable nonce must be consumed before heavy imports or downloads. A preflight token cannot claim or mutate calendar work. Private chunks, hashes, original bytes and terminal receipt retries use the existing owner media storage. Owner edits win; returned files enter Checking for creative review. Publishing is unchanged.

Twelve explicit reviewed lessons map the UI, TypeScript validation and Python renderer to the same genuine product sources. Altered ideas or scripts require source review before a billable attempt. Readiness follows the reviewed runtime fingerprint, not an unrelated website commit or a 24-hour idle timer. Runtime changes or a real uncertain host failure show a recoverable blocker while preserving the owner's On intent. Automatic recheck is limited to one reserved check per runtime profile and UTC month; manual checks show their $0.05 reservation.

## Proposed allowance and activation

The proposal is up to **$5 per UTC month of additional rendering**, with no new subscription. The database retains **$0.05 per exact attempt**, including setup, failures and unknown outcomes, and rejects the 101st monthly reservation. This is an application allowance using conservative reservations, not a hard cap on the total Vercel bill. No automatic refund, increase, provider subscription or paid AI API is implemented.

After approval:

1. Review/apply this patch and its tests on the prepared branch. Preserve existing site fixes. Do not copy or decrypt owner credentials.
2. Keep the existing project CPU/memory settings. Fluid compute intentionally hides AWS_LAMBDA_FUNCTION_MEMORY_SIZE; its absence cannot verify or reject an allocation. The handler accepts iad1 and cle1, the configured/observed US regions with identical reviewed rates. It still checks signed invocation and a consumed server nonce before heavy work. Do not label an allocation as measured. Inspect billed usage after the first bounded preflight/video before unattended production.
3. Record the approval identifier and configure production-only `AI_OS_MEDIA_RENDERER_MONTHLY_USD=5`, `AI_OS_MEDIA_RENDERER_APPROVAL_ID=<approval UUID>`, and `AI_OS_MEDIA_RENDERER_ENABLED=true`. Both runtimes inherit the existing server `AI_OS_OWNER_KEY`; no new copied credential is needed. Missing or different values fail closed.
4. Deploy the reviewed patch. Root Python requirements, entrypoint and function configuration are included; no further integration code is required. Verify the actual Python bundle is below 500MB and the configured duration/region match.
5. Use Content → Agent → Check render connection once. This reserves $0.05 and validates actual narration, source images, video encoding and full decode on the host. Then generate one reviewed video and verify the private receipt, duration, billed usage and owner playback before leaving the five-day agent unattended. Each separate attempt uses its own $0.05 reservation.
6. Stop new work by removing the enable flag or pausing creation. The ledger never resets on deployment. Do not replace the private app runtime with GitHub Actions; Actions runs software tests only.

## Evidence and remaining host check

The local November13–17 pack contains five original images and five narrated 1080×1920/60fps videos with separate covers, full decode and audio QA. A one-CPU quantized benchmark with cached runtime files but a fresh process measured 8.041s setup/preflight plus 109.348s render/QA, total **117.389s**. Cold network download time and actual Vercel package/native compatibility remain unverified until the approved hosted check. Fixed release URLs, byte counts and SHA256 pins cover about 278MB of runtime files in `/tmp`; deadline-safe locking/downloads and subprocess termination are tested.

Narration uses Kokoro am_michael, which differs from the approved v15 ElevenLabs JackJohn voice. These are v4/v15-derived drafts requiring ear/style review. The current scripts also need a later creative pass to teach features more directly with fewer repeated caveats. No finished file is labeled creatively approved by machine checks.

Local validation includes real SQL queue/allowance races, request lifetime deferral, cross-language HMAC verification, nonce-before-import, exact callback scope, original-byte uploads, receipt replay, owner edits, owner-Off queue recovery, all 12 lesson mappings, deploy/idle continuity, bounded recheck, and no new reserve after allowance exhaustion.

Primary references: [hybrid Python/Next](https://vercel.com/kb/guide/how-to-use-python-and-javascript-in-the-same-application), [function limits](https://vercel.com/docs/functions/limitations), [memory configuration](https://vercel.com/docs/functions/configuring-functions/memory), [usage pricing](https://vercel.com/docs/functions/usage-and-pricing), [Actions terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features).

November 13 host compatibility: official function-limit documentation confirms AWS memory variables are unavailable under Fluid. Runtime logs for the deployed Python function identify cle1 even though deployment metadata reports iad1. Both are $0.128/CPU-hour and $0.0106/GB-hour at review. A 300-second 4 GB/2-vCPU render is approximately $0.02487 before dispatch, callbacks and transfer; the five-cent reservation remains an allowance, not an exact bill. No project allocation or monthly allowance was changed. See https://vercel.com/docs/functions/limitations and https://vercel.com/docs/functions/usage-and-pricing.
