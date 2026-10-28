# Three-indicator reversal optimization research plan

Status: research only. No verified backtests or changes to live invite-only TradingView scripts yet.

## Inputs required
- Current exact Pine Script source/version for Scalp, Swing and Pro, including imported libraries and default settings.
- Historical OHLCV for MGC, MNQ, ES and other supported instruments, with session/timezone and contract-roll methodology.
- Existing alert semantics and representative user screenshots.

## Protocol
1. Freeze current source versions and baseline defaults; compile each on Pine v6 where supported.
2. Implement backtestable strategy counterparts with explicit, causal bar-close entry/exit logic; prevent look-ahead, intrabar repaint, and future-data leaks.
3. Test Scalp on 1m/5m/15m; Swing on 15m/30m/1h/4h; Pro across supported timeframes.
4. Track signal latency to objectively defined pivot events; distinguish hindsight pivots from actionable confirmation.
5. Evaluate candidate improvements: liquidity sweeps + reclaim, break of structure/CHOCH, IFVG inversion with retest, displacement, volatility/volume regime filters, session and higher-timeframe bias.
6. Include fees, slippage, realistic fills, roll effects, trade frequency, expectancy, profit factor, drawdown, win/loss distributions, and sensitivity to parameters.
7. Use chronological train/validation/untouched test periods and paper-forward evaluation; compare with frozen baseline and simpler controls.
8. Reject optimizations that improve only in-sample results, reduce sample size excessively, repaint, or break alert reliability.
9. Stage improvements for review; preserve current paying customers' access and avoid changes to existing price/license terms.

## Release gate
No performance claims, production script replacements, or auto-trading deployment until source, data, and test reports are independently reviewed.