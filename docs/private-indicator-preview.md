# Private TradingView preview handoff

## Version captures — September 23, 2026

Work `DA-INDICATOR-CAPTURE-20260923`, operations skill `1.0.0`.

The owner gallery now accepts actual PNG/JPEG captures independently of complete
release validation. Images live as bounded private database records, never public
repository files. The source hash, image hash, symbol/feed, interval, settings,
visible-range information, capture time, data context and provenance are retained.
Authenticated image routes reject stale versions and unauthenticated requests,
and return no-store, nosniff and sandbox headers. Owner uploads remain labeled
owner submissions; they cannot certify agent validation or create approval cards.

`POST /api/owner/indicators/captures` accepts multipart `id`, `sourceHash`, `image`
and JSON `metadata`. Cookie writes require same-origin checks. The existing owner
bearer can record `origin=assisted_browser`; browser uploads cannot claim worker
provenance. Images are limited to 2 MB and 12 captures per source version. Duplicates
preserve their original provenance. The authenticated detail view offers this form.

The existing five-minute indicator-browser cron now also runs a distinct,
per-candidate capture worker after the legacy check is idle. It schedules up to
three latest distinct draft names, binds jobs to exact hashes, observes global
pause, reserves a worker lease, uses the existing Browserbase start allowance,
and stops on authentication, active-session or configuration conflicts. It never
attaches to an owner's reserved sign-in session or raises the allowance. Interrupted
runs are held for review. Owner retries are capped at three browser attempts per
version, and queue status is displayed as queue status.

The worker opens only the owner-created `Darth Algo Indicator Lab Preview` layout
under `Darth_Algo`. It requires standard candles and an untitled Pine editor,
cleans only that dedicated test layout, fills and reads back the full exact source,
adds it to the chart, and records before/after raster captures after TradingView
confirms insertion. It never clicks Save script, Publish, alerts or trading
controls. A saved named editor blocks the run. Compiler insertion does not complete
replay/repaint/reopening validation; exact visible dates and feed delay status are
marked unavailable when not readable. Selector or context uncertainty blocks capture.

Local validation: type check and production build; isolated Postgres tests for
image authorization, CSRF, byte readback, source binding, duplicates, provenance,
separation from release approval, pause, worker blocking and bounded retries. A
supervised real Session VWAP chart screenshot exists outside the public repository.
The cloud owner browser was signed out and TradingView reported an active session
on another device. Production rollout and autonomous capture readback must be
recorded separately; these local tests are not evidence of a successful hosted capture.

The earlier complete-release evidence contract below remains strict and separate.

Owner flow: build privately, compile/replay, capture actual chart, let owner try, obtain publication approval, publish. This change records the private testing artifact; it does not automate TradingView or represent test completion by itself.

An authorized operator or connected browser worker must save the script and a dedicated layout inside the authorized TradingView account, reopen the saved layout, and verify the current indicator loads. Record only observed URLs. Preserve existing user layouts. Do not use the generic /chart/ URL as a completed preview.

POST /api/owner/indicators using the existing owner bearer authentication:

- action: record_private_preview
- id: candidate UUID
- sourceHash: SHA-256 of the exact candidate source
- preview.chartUrl: observed https://www.tradingview.com/chart/<layout-id>/
- preview.screenshotUrl: actual https://www.tradingview.com/x/<capture-id>/
- preview.compiled, replay, reopened: true only after each check actually succeeds
- preview.notes: concrete test evidence (30–2000 characters)

The server stamps checkedAt and attestedBy. It rejects incomplete evidence, generic/external URLs, wrong source versions, failed static checks, and candidates outside pending/approved status. It saves evidence and an audit event without granting publication approval or publishing. URLs and operator attestation do not independently prove screenshot contents or continuing chart state.

The authenticated candidate page shows the saved chart link and screenshot link only when evidence matches the current source hash. Actual captured image embedding remains future work; screenshot URLs here are TradingView viewer pages, not raw image resources. The existing release evidence and approval checks remain unchanged.

No production migration or activation was performed during implementation. Schema addition is idempotent and runs with the existing Lab schema initializer.

## Names and owner-facing explanations

Use Darth Algo plus a recognizable setup or function, such as Opening Range Fakeout. Names must match implemented behavior; do not use unexplained fantasy names or imply order flow/liquidity detection without supporting inputs. Each private candidate preview should pair an actual current-source TradingView capture and saved chart link with a concise walkthrough: what it does, color/marker legend, exact trigger, practical use, supported settings, and limitations. Explain missing-signal conditions and closed-bar timing. Never use a generated chart image as implementation evidence. Only show candidates that actually exist.

The complete-package workflow in indicator-release-packages.md supersedes the earlier source-only approval flow. Chart evidence is a prerequisite; an actual instruction image and educational worked example must also be recorded before approval cards are sent.
