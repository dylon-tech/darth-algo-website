# Darth Algo secure broker connectivity plan — 2026-10-28

Status: architecture proposal, no live execution enabled. Existing TradingView products, customers, pricing and access unchanged.

## Broker integration sequence
1. Alpaca OAuth: US equity/ETF and eligible crypto, paper first. Commercial third-party application and other-user live access require Alpaca approval.
2. Coinbase Advanced Trade: crypto market data and trading, subject to supported third-party authorization/permissions and partner requirements.
3. Tradier: equities/ETFs/options; public third-party apps require Partner status and OAuth. Futures unavailable.
4. Interactive Brokers: broader asset coverage including futures; third-party vendor compliance approval and appropriate authorization are prerequisites.

Official references:
- https://docs.alpaca.markets/us/docs/using-oauth2-and-trading-api
- https://docs.alpaca.markets/us/v1.1/docs/about-connect-api
- https://docs.tradier.com/overview/authentication
- https://ibkrcampus.com/docs/web-api/trading/getting-started/trading-access-for-third-parties
- https://www.interactivebrokers.com/docs/
- https://www.coinbase.com/de/developer-platform/products/advanced-trade-api

## Beginner UX
Search symbol -> view live/delayed labeled chart and Darth Algo signals -> connect broker -> read-only positions -> paper mode -> manually confirm previewed order. Auto execution is a separate, opt-in capability after approval and extensive validation.
Visible controls: market, strategy (Auto/Reversal/Trend), Paper/Live status, position size, Buy/Sell, Close, Emergency stop. Hide advanced configuration behind Advanced settings. Never auto-switch paper to live.

## Permissions and security
- Start read-only; separately request trading permission with explicit informed consent. No withdrawal/transfer permissions.
- OAuth authorization code with PKCE where supported; CSRF state; exact redirect allowlist; short-lived tokens where possible; token rotation and encrypted secrets in a managed secret store.
- Never store brokerage passwords or API secrets in browser localStorage, logs, analytics or source control.
- Per-user and per-broker account isolation, role-based access, device/session revocation, MFA for sensitive actions, connection revoke/disconnect.
- Distinct credentials, endpoints, and visually obvious labels for sandbox/paper vs production.
- Backend-only order submission, idempotency keys, order preview, status reconciliation, audit logs, deduplication, retries with safeguards, circuit breakers, rate limits, stale-data detection.
- No orders if market data is stale, connection is unhealthy, risk engine fails closed, or symbol is unsupported.

## Risk engine
Default paper trading. For live: per-order notional/quantity cap, max positions, daily loss limit, per-instrument limits, stop/exit plan, trading hours and user-defined allowed markets. Server-side pre-trade checks and emergency kill switch. Broker-side protective orders where supported, not assumed.
Never promise fills, uptime, win rate or profits. Show slippage, fees and market data entitlements.

## Staged release gates
0. Chart and signal data integrity: licensed feed, correct symbol mapping, timestamps, exchange/session/timezone, corporate actions/rolls, WebSocket reconnect and backfill, delayed/live badges, latency telemetry.
1. Read-only broker connect: OAuth, account/positions/balances and disconnect, penetration/security testing.
2. Paper orders: end-to-end order preview, simulated execution, risk checks, audit trails, failure drills, backtest/out-of-sample validation.
3. Live manual orders: broker commercial approvals, legal/compliance review (including whether investment adviser, broker-dealer, or CTA/CFTC/NFA requirements apply), restricted pilot, explicit per-order confirmation, support/runbooks and incident monitoring.
4. Optional live automation: separate opt-in, user-controlled limits, independent risk engine, paper-forward track record, rollback, emergency stop, kill-switch testing and ongoing monitoring.

## Acceptance criteria
- No cross-account order leakage; no duplicate order on network retry; stale quotes block trading.
- Reconnects never silently resend orders; every order resolves to a broker-confirmed status.
- User can revoke access and disable live execution promptly.
- User can distinguish simulated from real positions and data, and understand permissions.
- Any broker integration without vendor approval remains unavailable for public live trading.

## Next engineering tickets
1. Design broker-agnostic interface: authorize, refresh, account list, balances, positions, quote entitlement, preview, submit, cancel, reconcile, disconnect.
2. Implement Alpaca paper OAuth proof-of-concept using test credentials and backend secret management.
3. Build data integrity monitor and chart feed licensing review.
4. Threat-model order path and implement fail-closed risk policy.
5. Draft compliance and partner approval checklist before public live access.
