# Owner website sign-in

Status: prepared, disabled until owner identity and provider delivery are verified.

The existing /owner website supports a single owner email through the existing Neon Managed Better Auth endpoint. The browser requests an email code and enters it on the same website. Telegram is no longer presented as a required sign-in step. Existing owner cookies and private setup links remain compatible.

Required production-only configuration:
- AI_OS_EMAIL_LOGIN_ENABLED=true
- AI_OS_OWNER_EMAIL: exact founder-confirmed mailbox, no wildcard/domain grant
- Existing NEON_AUTH_BASE_URL and AI_OS_OWNER_KEY remain server-only.

Verify Neon email sign-in/delivery and trusted origin https://www.darthalgo.com in the existing account. No provider subscription, sender purchase or new allowance is authorized by this change. Do not enable email login until the owner mailbox is selected. Never copy codes or private keys into chat/logs.

The managed provider generates/verifies OTPs; this application binds attempts to a 10-minute HttpOnly browser challenge. A durable ledger restricts requests to one/minute and five/hour for the configured identity, and five verification attempts/challenge. Failed or unknown sends retain their reservation. Exact verified provider identity is required before issuing the existing owner cookie; the provider token is discarded. No public signup grants dashboard access. No passwords, OTPs or provider tokens are stored in application tables.

Check before production acceptance:
1. Exact owner identity and managed email delivery configured.
2. Real owner requests code and signs in using secure browser handoff; no agent reads the code.
3. Reload, private API access, logout, return visit and iPhone Home Screen launch.
4. Reuse the dashboard checkpoint for media preflight/production acceptance. Login fixtures do not establish real account access or active generation.

Tests: tests/owner-email-login.test.cjs uses isolated real SQL with a synthetic provider; no emails are sent. TypeScript and production build also required. UI uses numeric keyboard, one-time-code autofill, explicit labels and existing responsive styles. Physical iPhone use remains pending.

References checked 2026-11-16:
https://neon.com/docs/auth/guides/plugins/email-otp
https://better-auth.com/docs/plugins/email-otp
