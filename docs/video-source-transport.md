# Large video source transport: implemented, unverified live

Default remains **4,000,000 bytes**. The optional stream path permits at most32MiB, the existing media ceiling. It emits64KiB chunks with exact Content-Length after full stored-byte length/SHA verification. The capability remains scoped to consented immutable video/version, expiring, private/no-store and disabled when publication is OFF. No storage service, public originals, new subscription or paid upload is introduced.

Vercel's official guide recommends streamed responses for responses larger than4.5MB: https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions . vidIQ's current video_upload tool requires public HTTPS download, Content-Length, and compatible MIME, with299MB maximum. That provider maximum does NOT prove this deployed transport works.

The optional path requires all of:
- production runtime;
- `FOUNDER_VIDEO_SOURCE_TRANSPORT=stream_verified_v1`;
- `FOUNDER_VIDEO_SOURCE_VERIFIED_SHA` exactly equal to the full40-character `VERCEL_GIT_COMMIT_SHA`.

No flag was set. Any new commit invalidates the previous readiness marker. Neither the website owner's approval button nor tests can set it.

Before an operator marks an exact deployment verified, an owner-approved test video above4MB must be exported through its scoped consented capability. Verify deployed GET/HEAD status200, MP4/MOV MIME, preserved Content-Length, exact SHA256 and expiry/disabled404, then verify receiving-provider import completes with the same expected source. Do not publish as a transport test. Do not print/store capability tokens in diagnostics or public artifacts. A failure leaves the4MB limit intact; do not silently fall back to public storage or drop the required header.

Local synthetic tests exercise7.5MB streamed bytes, size bounds,64KiB pulls, correct hash/header/HEAD and commit-gate invalidation. Those tests are not evidence of Vercel proxy behavior or actual vidIQ acceptance. Real verification cannot run while the feature and deployment remain unapproved/off.

The owner-authenticated GET/HEAD `/api/owner/founder-video-source-probe` supplies a deterministic7,500,001-byte synthetic file and SHA256 header. It does not access real media or any provider and cannot activate anything. This permits checking the exact deployment's proxy/header/byte behavior before setting a large-source marker, without a circular dependency on importing a real video. After that diagnostic passes, the separately consented real import still needs provider acceptance verification before claiming readiness. Do not treat the marker alone as evidence that provider ingestion or posting succeeded.
