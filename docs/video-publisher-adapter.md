# Gated website video publisher (not activated)

This adapter is deliberately OFF. No real provider call, upload, publication, credit purchase, credential read or runtime activation was performed while implementing/testing it.

## Supported protocol

Owner-authenticated `/api/owner/founder-video-publication`:

- `GET ?itemId=UUID`: sanitized saved ledger; no source tokens, signed provider video URL or credentials.
- POST `prepare`: `itemId`, `expectedVersion`, `publishAt` (ISO instant), explicit `settings`. Reads website account/schema capability only; saves exact version/mediaSHA/caption/title/time/settings. No implicit TikTok privacy/comments/music/rights/AI choices, YouTube privacy/title, or Instagram regular/Trial/AI choices. This does not upload or approve publication.
- POST `consentImport`: `id`, `expectedHash`, `confirmImport:true`. UI must disclose sending this exact media to vidIQ for import. Persists consent/claim before upload, never publishes. Only verified MP4/MOV source at most4,000,000 bytes is supported. Larger assets fail with `VIDEO_LARGE_SOURCE_UNVERIFIED`.
- POST `prepareDraft`: `id`. Checks a known import ID or creates one shared YouTube/TikTok draft once ready. Persisted arguments plus unchanged provider revision establish settings/media identity omitted from provider readback. The UI must show the saved exact caption/settings/media and provider revision before the next step.
- POST `approve`: `id`, `expectedHash`, `providerRevision`, `confirmApproved:true`. Fresh account parity and draft revision checked. Approves this exact media, both draft destinations, Instagram path/label choices and time. No write to social platforms occurs in this step.
- POST `check`: `id`. Executes only previously approved due work, then checks existing IDs. Never bypasses approval or creates a replacement after an uncertain result.
- POST `discard`: `id`, `expectedHash`, `confirmDiscard:true`. Revokes a known unpublished local plan/draft and scoped export, allowing regeneration. Does not delete imported provider media/drafts. Uncertain actions or any publish attempt cannot be discarded to bypass reconciliation.

All POSTs enforce owner session, same-origin JSON and bounded12KB byte-level body reads. General Content mutations are locked after import consent until safe discard, including save, review, regenerate, archive, hold and unlock. Earlier photo/legacy delivery guards remain in force.

`/api/founder-video-source/[id]/[token]` is an expiring capability for the consented exact version. GET/HEAD include exact Content-Length with buffered body below4MB; invalid, expired, changed, discarded, or disabled sources return404. Private/no-store/no-referrer/nosniff headers apply. Deployed byte/header preservation still requires a real runtime test before activation; native32MB support is explicitly not claimed. A verified large-file streamed source or separately authorized private storage could extend this later without silently exposing private originals.

## Activation prerequisites

- `VERCEL_ENV=production` and `FOUNDER_VIDEO_PUBLISHING_ENABLED=true` (not set by this change).
- Existing website OAuth connection actually exposes the required schemas and the selected exact account IDs; Instagram `publishingAvailable=true` is mandatory, not inferred from `canPublish`.
- `FOUNDER_VIDEO_MCP_SCHEMA_SHA256`: operator-reviewed JSON mapping all eight canonical `vidiq_*` tool names to their stable sorted-schema SHA256 values. A fresh discovery or owner approval cannot self-authorize an unreviewed schema. Structural/cost checks additionally reject unsupported schemas or paid routes.
- An owner-approved test asset and deployed source verification. No website UI or cron wiring is activated by these files alone.

`executeDueFounderVideoPublications()` can be wired into the owner-work cron only after these checks. It processes at most two saved publications per call. Each write has a persisted claim, fresh account/settings/schema checks and immediate pre-call global-pause/version/deadline checks. Initial sends stop15min after the approved time; an existing provider container can finish processing later. Provider IDs and receipts are retained. Unknown import/draft/publish calls are never automatically repeated. Read-only receipt checks are capped6 per stage, automatic sessions12 per publication over24h, with persisted30s minimum spacing; exhaustion requires owner attention. These are implementation bounds, not claims of unlimited provider quota.

## Explicitly blocked provider paths

YouTube verification returns an owner-action state. The current verified contract has no website verification URL/handoff transport, so the adapter does not invent one or replay publication. Instagram hosted ready videos with returned container IDs can continue within approval. A conversion response returning only an MCP job ID stops with owner attention because a reliable structured prepared-to-publish signal is not verified. It never interprets arbitrary provider message text as approval.

Receipt confirmation requires exact saved destination/account identity and a native post URL; private, unlisted or linkless deliveries are not claimed publicly visible. YouTube watch links preserve the video ID. Notices appear only inside website Inbox through `os_messages`; no phone push, email or ChatGPT delivery is implied.

## Tests

Mocked MCP and PGlite tests cover actual transport schema/cost/account gates; exact consent→import→draft→revision approval→publication; idempotent claims, unknown outcomes, late sends, session/receipt budgets, source hash/Content-Length/expiry, real owner cookie/CSRF/body limits, and general Content mutation guards. No synthetic passing test establishes real account authorization, deployment readiness, or successful social publication.

Approval also binds the saved designed cover ID and SHA256 and requires a verified image cover, matching creative review requirements. The current provider calls do **not** upload or apply that cover: every snapshot explicitly returns `coverApplied:false` and `previewSelection:'platform_selected'`. The owner UI must distinguish the saved preview cover from the platform-selected posted thumbnail. No thumbnail upload tool, paid transformation or unsupported cover promise is included.
