# Darth Algo Trading — beginner-first UX specification

Status: design proposal only; not deployed.

## Product principle
Powerful trading research behind the scenes; simple, calm, readable controls up front. Inspired by chart-first navigation and risk visibility in TradeSea, without copying TradeSea branding or protected design assets.

## Primary navigation (three tabs)
- Home: practice account balance, daily simulated P&L, strategy status, Start Practicing CTA, prominent SIMULATED label.
- Trade: single primary chart, market selector (Gold/MGC, Nasdaq/MNQ, S&P/MES), Auto/Reversal/Trend selector, WAIT/LOOK FOR BUYS/LOOK FOR SELLS with timestamp and explanation, risk limit and practice controls.
- Results: closed-trade log, win rate, net P&L after fees, expectancy, profit factor, max drawdown, number of trades, and clearly labeled backtest vs forward-paper results.

## Defaults and progressive disclosure
- Paper mode only at launch. Default to Auto strategy, one chart, one market, one position maximum.
- Hide timeframe, IFVG/order block settings, indicators, advanced risk parameters and other technical concepts behind Advanced Settings.
- Use plain language and concise tooltips; no guaranteed returns or unverified AI confidence scores.
- Explicit WAIT state is equally important as directional suggestions.
- Mobile-first tap targets, accessible contrast, no color-only signal communication, clear error and disconnected states.
- Do not place live trading controls adjacent to paper trading without prominent environment separation.

## Safety and engineering
- Enforce position sizing, stop, daily loss limit, max exposure, kill switch, duplicate alert prevention and audit trail server-side.
- Treat all charts and performance statistics as simulated until independently validated; show data freshness and feed status.
- Live broker connections require separate permissions, approved providers, legal review and production monitoring.

## Design references (public)
- https://help.tradesea.ai/en/articles/13758195-navigating-in-tradesea-mobile
- https://help.tradesea.ai/en/articles/13670031-order-modes
- https://help.tradesea.ai/en/articles/13669803-tradesea-station-built-for-serious-traders

## Implementation sequence
1. Clickable responsive prototype and usability test with beginners.
2. Read-only strategy signal integration with verified timestamps.
3. Paper-trading ledger and performance results.
4. Advanced settings for experienced traders.
5. Only then evaluate authorized live execution integrations.
