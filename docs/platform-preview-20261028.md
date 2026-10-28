# Darth Algo platform development preview

Task: DA-PLATFORM-20261028-v1. Darth Algo Operations 1.2.0; deployment verification workflow. Founder authorized a new separate platform with unchanged existing TradingView products, prices and access; development branches/staging only. This change adds `/platform` and `/api/platform/candles`. It does not edit checkout, product records, Stripe, account access, social publishing, owner operations, or existing Pine source.

## Working in this version

- Responsive black/red market workspace; searchable starter catalog of 14 stock, cryptocurrency and futures markets, and 1m/5m/15m/30m/1h/4h/day TradingView charts. The provider owns chart data and attribution. UI labels data delayed/provider-dependent; the application does not claim a live market feed or extract data from the widget.
- Public Coinbase Exchange candle adapter for BTC-USD, ETH-USD and SOL-USD with symbol/interval allowlists, timeout, 30-second cache, schema validation, ascending timestamps, completed-candle filtering and explicit unavailable/stale states. Supported snapshots: 1m/5m/15m/1h/day. No credentials or trading endpoint.
- CSV import of 25–2,000 completed OHLCV bars. Separate original research definitions detect symmetrical bullish/bearish range sweeps, trend breaks, inferred order blocks, FVG and inverted FVG zones. Scalp/Swing/Pro are research lookback profiles (8/20/14), not reimplementations of the existing protected Pine indicators. Auto prefers a qualifying reversal, otherwise checks trend breakout; the other strategies limit the rule family. Only completed supplied bars are used. Candidate observations are not a validated trading strategy, backtest, or win-rate claim.
- Four original Academy lessons with historical, already-owned product screenshots, saved lessons and progress. Progress is local to the browser.
- Manual paper journal with a $50,000 starting balance, long/short plans, required stop/target, dollar-per-point contract math, total entered fees, maximum risk and remaining daily loss budget checks, one open plan, explicit manual close and CSV export. P&L is hypothetical and based on user-entered unverified prices. Stops/targets do not auto-fill; no broker is connected. Local storage is not an account security boundary or cross-device sync. Daily boundary: UTC.
- Separate proposed $19.99/month platform Pro membership and five free monthly premium analysis previews are documented in the UI. They are not charged, activated or enforced. Existing TradingView product prices are unchanged.

## Not complete / release blockers

- Licensed stock/futures OHLC for native analytics; TradingView widget rendering does not grant programmatic access to its data.
- Validated port of protected Pine logic, compile/replay/non-repaint checks, market/session backtests and out-of-sample results. No private code was copied into this public repository.
- Authenticated customer accounts, encrypted server-side journal/progress storage, server-side subscription/usage entitlement enforcement, billing setup and founder activation approval.
- Secure paper-broker adapter and OAuth/secret storage, order idempotency, reconciliation, fail-closed environment validation. Real-money trading remains unimplemented and unauthorized.
- Advanced performance analytics (expectancy, drawdown, profit factor) beyond current balance, closed P&L, win rate and trade count.

## Validation

`node tests/platform-engine.test.mjs` covers long/short reversal symmetry under all profiles, strategy filtering, schema/timestamp errors, FVG inversion, stable historical prefix results, source immutability, per-trade and daily-loss rejection, stop-side validation, invalid numeric rejection, long/short P&L including fees, and double-close rejection.

TypeScript and production build are required before deployment. Existing owner-indicator image lint warnings are unrelated. Exact build, preview and browser receipts are appended after verification.

## Source references

- https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/
- https://www.tradingview.com/widget-docs/faq/data/
- https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles
- https://www.cmegroup.com/markets/equities/nasdaq/micro-e-mini-nasdaq-100.contractSpecs.html
- https://www.cmegroup.com/markets/metals/precious/e-micro-gold.contractSpecs.html
- Existing chart asset provenance: `app/lib/products.ts`, main revision `9fae252879633f588648e2825e5446e48f36b235`.

## Dated lesson

2026-10-28: existing public code contains marketing and owner operations, not an established end-user trading platform. Building a separate route preserves the paid products while exposing a reviewable product slice. Browser-only journal/progress and original research signals must remain visibly distinct from production accounts and protected Pine output. Supersede this limitation only with verified backend, entitlement and indicator-validation evidence.
