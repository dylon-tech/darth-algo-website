# Three-indicator research status — 2026-10-28

Status: private development and historical research completed; release gates remain open. This extends [the research protocol](three-indicator-reversal-backtest-plan.md).

## Preserved production

The three published Scalp, Swing and Pro source snapshots were archived privately and hashed. Separate private development indicators and standalone strategy wrappers were created. Production publications, customer access and the original chart layout were not modified. No broker execution, paid service purchase, deployment or public indicator release occurred.

This repository is public. Proprietary Pine source, chart exports, trade ledgers and detailed performance evidence remain in the owner's private research package.

## Work completed

- Confirmed the original close-confirmed EMA signal logic and reproduced its exported signals across nine native chart datasets, with zero mismatches after warmup in 27 source/dataset comparisons.
- Added selectable causal quality, liquidity-sweep/structure-shift, inverse-gap retest and combined experimental engines to separate development copies. Baseline remains the default.
- Corrected development trade-plan hit evaluation so the signal candle's earlier range cannot count as a post-signal stop or target. Stop/target ambiguity is handled conservatively.
- Compiled all three development indicators and created independent cost-aware strategy wrappers.
- Tested Scalp on 1/5/15 minutes and Swing on 15/30/60/240 minutes across micro gold, micro NASDAQ and micro S&P continuous futures. Pro's equivalent modes use the same signal logic; they are not independent additional evidence.
- Evaluated five fixed variants using chronological development/validation/test partitions and base/stressed trading costs. The local alternative runner covers 21 unique market/timeframe/mode cells.
- Cross-checked baseline and two experimental variants natively in TradingView on MES 15 minutes. Native and local trade counts and P&L agreed in that bounded comparison; drawdown definitions remain explicitly separate.
- Passed causal-prefix, future-price perturbation, next-bar execution, ambiguous-exit and partition-boundary checks.

## Decision

Do not promote a new signal engine. The validation-selected candidate did not demonstrate a robust improvement across both product modes after costs. A different filter looked promising in parts of the held-out data, but selecting it now would require a new untouched evaluation period. Combining all reversal concepts did not establish a reliable advantage.

These are research observations, not advertised customer returns. Indicators do not have inherent P&L; results depend on the documented strategy wrapper, fill model, costs and data coverage.

## Remaining release gates

1. Longer intraday history, independent futures contract/roll handling, and adequate 4-hour samples.
2. Fresh untouched data after freezing the next candidate; avoid reusing the inspected holdout.
3. TradingView/local parity for every selected candidate across all supported cells, with replay and live paper-forward checks.
4. Physical-phone visual QA and alert lifecycle tests.
5. Owner review of exact source hashes, before/after evidence and publication/customer migration plan.
6. Explicit owner approval before any production overwrite, publication or access change.

The paper-first platform design is in [paper-trading-platform-plan.md](paper-trading-platform-plan.md). No platform implementation or live broker connection is claimed.
