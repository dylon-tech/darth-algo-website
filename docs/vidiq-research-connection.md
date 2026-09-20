# Server-side social research

The owner connects vidIQ using a scoped MCP API key at `/owner/connections`, using the existing owner session. This is a separate OAuth consent from ChatGPT's connector. The existing every-minute production cron checks the connection once per New York calendar day before starting Indicator Lab work.

- Fixed provider: `https://mcp.vidiq.com/mcp`; fixed callback: `https://www.darthalgo.com/api/owner/connections/vidiq/callback`.
- Public client registration, PKCE S256, ten-minute single-use state and an independent HttpOnly, Secure, SameSite=Lax browser nonce. Initiation and disconnect require owner authentication and same-origin requests. The normal Strict owner cookie intentionally stays Strict; the cross-site callback is bound to the authenticated initiation by the nonce.
- Access and refresh tokens are encrypted with AES-256-GCM using a domain-separated derivation from the existing server-only owner key. Rotating that key requires reconnecting vidIQ. Tokens never appear in status responses or logs. Refresh and disconnect are serialized; a cancelled OAuth attempt cannot restore a disconnected account.
- One five-credit discovery call per day maximum, after the zero-credit balance call verifies at least five credits. One daily database row claims the attempt. Reservation survives ambiguous outcomes, process crashes and provider errors. No automatic purchases, retries or video-watch calls. Reconnecting does not reset a daily reservation. Credit costs rely on vidIQ's documented five-credit search tariff; revisit this cap if the provider changes pricing.
- An exhausted balance is checked again the following day. Results use public Instagram/TikTok post URLs and bounded metadata. Views, titles and captions do not prove demand or video viewing. TikTok tool availability and useful results must be checked live: the provider's public help page and exposed tool list currently disagree.
- Missing/failed discovery remains unavailable evidence. Growth can return BUILD_NONE and block unsupported builds. New social evidence does not retroactively regenerate an already completed daily brief or incur additional AI runs.
- Disconnect removes stored credentials and pending OAuth state. It cannot cancel an external request already submitted. Revoke the server's grant in vidIQ Account Settings → MCP if desired.

Verification: `tests/vidiq-research.test.cjs` exercises encryption, state/browser binding, callback replay, cross-site mutation rejection, refresh, disconnect, zero credits, daily cap, uncertain outcomes, pause, and source provenance with PGlite and mocked provider responses. It does not prove a real account connection or paid discovery. Set `OS_TEST_PGLITE_MODULE` to the installed PGlite entry point to run it.

TradingView unattended compilation, screenshots, replay and approved publishing still require a hosted browser worker and a user sign-in in that worker. This integration does not transfer the local browser session, publish indicators, or claim the worker is active.


## Provider registration restriction and supported key connection
Live registration on September 20 returned HTTP 400, `redirect_uri is not allowed.` for the DarthAlgo.com callback. Generic OAuth compatibility in the older help article did not establish that this callback was allowed. The public setup page https://vidiq.com/mcp/ documents API keys as Bearer tokens and links https://app.vidiq.com/account/settings/mcp for key creation.

The Connections page now directly links to those settings and offers an owner-only password field. PUT requires same-origin authentication, validates input, performs only initialization, tool discovery and the free balance call, then stores the key encrypted. Invalid/unverifiable replacements preserve the existing credential. Keys never appear in responses or logs. Zero credits is a successful connection with research waiting. The recurring five-credit cap is unchanged. The legacy OAuth endpoint now reports the specific provider restriction without exposing provider bodies.

Tests include the real provider error shape, rejected cross-site key saves, invalid lengths, failed verification preserving the old connection, encrypted persistence, redacted status, successful zero-credit verification and no paid calls during setup. A real user key is still required to verify the complete live connection.
