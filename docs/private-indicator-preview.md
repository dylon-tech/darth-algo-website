# Private TradingView preview handoff

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
