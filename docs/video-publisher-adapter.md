# Gated website video publisher (not activated)

This adapter is deliberately OFF. No real provider call, upload, publication, credit purchase, credential read or runtime activation was performed while implementing/testing it.

## Supported protocol

Owner-authenticated `/api/owner/founder-video-publication`:

- `GET ?itemId=UUID`: sanitized saved ledger; no source tokens, signed provider video URL or credentials.
- POST `prepare`: `itemId`, `expectedVersion`, `publishAt` (ISO instant), explicit `settings`. Reads website account/schema capability only; saves exact version/videoSHA/coverSHA/caption/title/time/settings and video+cover import consent scope. No implicit TikTok privacy/comments/music/rights/AI choices, YouTube privacy/title, or Instagram regular/Trial/AI choices. This does not upload or approve publication.
- POST `consentImport`: `id`, `expectedHash`, `confirmImport:true`. UI must disclose sending this exact video AND designed cover to vidIQ for import. Persists consent/claim before upload, never publishes. Verified MP4/MOV source defaults to at most4,000,000 bytes. Larger assets fail with `VIDEO_LARGE_SOURCE_UNVERIFIED` unless the separate exact-deployment stream-verification gate is satisfied; that optional path is capped32MiB and remains unverified live.
- POST `prepareDraft`: `id`. Checks a known video import ID, imports the consented cover exactly once with zero-credit `upload_image`, then creates one shared YouTube/TikTok draft once ready. The cover library ID is set only as YouTube `thumbnailImageId`, never as shared media or a TikTok/Instagram field. Persisted arguments plus unchanged provider revision establish settings/media identity omitted from provider readback. The UI must show the saved exact caption/settings/media and provider revision before the next step.
- POST `approve`: `id`, `expectedHash`, `providerRevision`, `confirmApproved:true`. Fresh account parity and draft revision checked. Approves this exact media, both draft destinations, Instagram path/label choices and time. No write to social platforms occurs in this step.
- POST `check`: `id`. Executes only previously approved due work, then checks existing IDs. Never bypasses approval or creates a replacement after an uncertain result.
- POST `discard`: `id`, `expectedHash`, `confirmDiscard:true`. Revokes a known unpublished local plan/draft and scoped export, allowing regeneration. Does not delete imported provider media/drafts. Uncertain actions or any publish attempt cannot be discarded to bypass reconciliation.

All POSTs enforce owner session, same-origin JSON and bounded12KB byte-level body reads. General Content mutations are locked after import consent until safe discard, including save, review, regenerate, archive, hold and unlock. Earlier photo/legacy delivery guards remain in force.

`/api/founder-video-source/[id]/[token]` is an expiring capability for the consented exact version. GET/HEAD include exact Content-Length; the default is a buffered body below4MB. The implemented optional64KiB-chunk stream path can serve up to32MiB only behind the exact-commit runtime-verification marker described in [video-source-transport.md](./video-source-transport.md). Invalid, expired, changed, discarded, or disabled sources return404. Private/no-store/no-referrer/nosniff headers apply. The authenticated synthetic probe helps check deployed headers/bytes without real media, but neither that probe nor local tests prove vidIQ acceptance. No live verification marker, private storage service, subscription or public-original fallback was added.

## Activation prerequisites

- `VERCEL_ENV=production` and `FOUNDER_VIDEO_PUBLISHING_ENABLED=true` (not set by this change).
- Existing website OAuth connection actually exposes the required schemas and the selected exact account IDs; Instagram `publishingAvailable=true` is mandatory, not inferred from `canPublish`.
- `FOUNDER_VIDEO_MCP_SCHEMA_SHA256`: operator-reviewed JSON mapping all nine canonical `vidiq_*` tool names to their stable sorted-schema SHA256 values. A fresh discovery or owner approval cannot self-authorize an unreviewed schema. Structural/cost checks additionally reject unsupported schemas or paid routes.
- An owner-approved test asset and deployed source verification. The phone UI is wired, but publishing is not activated and no video cron dispatch is wired by this change.

`executeDueFounderVideoPublications()` can be wired into the owner-work cron only after these checks. It processes at most two saved publications per call. Each write has a persisted claim, fresh account/settings/schema checks and immediate pre-call global-pause/version/deadline checks. Initial sends stop15min after the approved time; an existing provider container can finish processing later. Provider IDs and receipts are retained. Unknown import/draft/publish calls are never automatically repeated. Read-only receipt checks are capped6 per stage, automatic sessions12 per publication over24h, with persisted30s minimum spacing; exhaustion requires owner attention. These are implementation bounds, not claims of unlimited provider quota.

## Owner UI

The video editor contains a button-first posting panel. It performs no account lookup or provider call on mount. A deliberate setup check loads the saved ledger/capability; explicit blank creator choices must be completed before preparing a plan. The import checkbox/button names both the video and saved cover for cover-aware snapshots and remains separate from final publication approval. The saved cover is displayed, with YouTube-requested versus TikTok/Instagram-platform-selected preview disclosure; actual thumbnail application is not claimed. Legacy snapshots lacking cover consent retain their old video-only disclosure and cannot silently acquire cover-import permission.

Final approval is exact-version/hash/provider-revision bound. Approved work can be manually checked; the UI does not claim that video cron scheduling is running. Known unpublished plans may be discarded; uncertain provider outcomes do not show an automatic retry. Video import locks the general creative editor until a safe discard, so a regenerated file cannot replace an already-approved provider draft.

## Explicitly blocked provider paths

YouTube verification returns an owner-action state. The current verified contract has no website verification URL/handoff transport, so the adapter does not invent one or replay publication. Instagram hosted ready videos with returned container IDs can continue within approval. A conversion response returning only an MCP job ID stops with owner attention because a reliable structured prepared-to-publish signal is not verified. It never interprets arbitrary provider message text as approval.

Receipt confirmation requires exact saved destination/account identity and a native post URL; private, unlisted or linkless deliveries are not claimed publicly visible. YouTube watch links preserve the video ID. Notices appear only inside website Inbox through `os_messages`; no phone push, email or ChatGPT delivery is implied.

## Tests

Mocked MCP and PGlite tests cover actual transport schema/cost/account gates; exact consent→import→draft→revision approval→publication; idempotent claims, unknown outcomes, late sends, session/receipt budgets, source hash/Content-Length/expiry, real owner cookie/CSRF/body limits, and general Content mutation guards. No synthetic passing test establishes real account authorization, deployment readiness, or successful social publication.

Approval binds the saved designed cover ID/SHA256, MIME and byte count and requires a verified PNG/JPEG cover at most4,000,000 bytes. Consent covers both video and cover. The cover has its own random expiring capability at `/api/founder-video-cover/[id]/[token]`; its token cannot read the video and vice versa. Cover import has a durable pre-call claim and saved imageId; an uncertain response never repeats. Old plans without explicit cover consent cannot import a cover and must be discarded/re-prepared where safe.

YouTube requests that imported library image through its documented `thumbnailImageId` destination setting. The request and unchanged provider draft revision bind the final approval. TikTok and Instagram expose no supported cover field in the verified current tools, so their previews remain platform-selected. Snapshots retain `coverApplied:false` (actual application unverified), `previewSelection:'per_platform'`, and `coverAssignment` describing the requested YouTube thumbnail versus platform-selected TikTok/Instagram previews. No paid conversion, unsupported cover setting or verified-application claim is included.

Contract references: [official vidIQ publishing media guide](https://github.com/vid-io/vidiq-mcp/blob/d4b0e3780f1b976241b0e9766e6ca140a75abc67/skills/vidiq-publishing/references/platforms-and-media.md) plus discovered `vidiq_upload_image`/`vidiq_social_post_draft_create` metadata checked2026-11-15. The [YouTube thumbnails API](https://developers.google.com/youtube/data/reference/rest/v3/thumbnails/set) has its own restrictions; this adapter's4MB cover bound is a conservative buffered-server transport limit, not a claim that every image within it will be accepted by YouTube.
