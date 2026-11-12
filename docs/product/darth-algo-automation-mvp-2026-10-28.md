# Darth Algo Automation — MVP product brief (2026-10-28)

Status: proposal for review; no live trading, pricing change, or release authorized.

## Positioning
A beginner-friendly trading research and paper-trading companion, not a guaranteed-profit bot. Existing Swing/Scalp/Pro/Lifetime terms remain unchanged.

## MVP user flow
1. Select gold (MGC) or Nasdaq (MNQ), timeframe, and paper account.
2. See a simple Look for buys / Look for sells / Wait state, with the rule explanations and last update time.
3. Backtest non-repainting, bar-close-confirmed rules using historical data, including commissions and slippage.
4. Paper trade with position-size caps, stop, daily loss limit, max open trades, and emergency stop.
5. Show trade log, expectancy, profit factor, max drawdown, win rate, sample size, and out-of-sample results.
6. Let users export performance and see clear simulated-vs-live labels.

## Technical boundaries
- TradingView Pine v6 for signals/strategy and alerts; webhooks may inform an external backend.
- Do not imply Pine scripts directly execute broker orders.
- No live broker execution until explicit approval, secure authorization, provider terms review, monitoring, and separate end-to-end testing.
- Never present simulated signals or confidence scores as verified live performance.

## Release gates
- Document exact signal rules and remove look-ahead/repainting.
- Backtest with fees/slippage and train/test separation; paper-forward test across sessions.
- Verify risk limits and kill switch in failure cases; audit logs and alert duplication.
- Review beginner onboarding, billing terms, data/privacy, and marketing claims.

## Immediate commercial priorities
- Verify social content is actually published, not merely queued.
- Audit landing-page checkout, onboarding, indicator visibility, access grants, and support.
- Produce chart-based short-form demonstrations and educational content with accurate claims.
- Measure qualified visits, checkout starts, completed purchases, refunds, and retention.
