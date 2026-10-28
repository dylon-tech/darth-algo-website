# Darth Algo paper-trading platform plan

Status: proposed implementation plan, not a deployed product. Prepared 2026-10-28 after the three-indicator research round. New spend authorized: $0.

## Product goal

A beginner can understand a strategy, see the risk of a simulated order, start a paper session, and understand why each signal was accepted or rejected. Reliability and understandable loss limits precede live execution. Historical performance is research evidence, not a promise.

## First session

1. Display a persistent PAPER / SIMULATED badge and explain that no money is being traded.
2. Choose Gold, NASDAQ or S&P, a supported timeframe, and a clearly versioned research strategy. Explain continuous research symbols versus tradable dated contracts.
3. Show a one-contract example with entry, stop, target, estimated dollar risk, fees and the assumed fill model. Do not default to leveraged position sizing or conceal stop-gap risk.
4. Configure a paper balance and explicit loss/quantity limits. Proposed starter quantity is one micro contract; final risk defaults are a product decision before launch.
5. Start a session without broker credentials. Show Waiting for signal, Signal received, Risk check, Simulated order, and Filled/Rejected as plain-language states.
6. Provide separate controls for Pause new orders and Close paper positions, with clear consequences. Explain that pausing entries does not remove protective exits.
7. Review a compact journal with the signal reason, rule version, order lifecycle, costs, realized/unrealized result and source-data freshness.

Mobile layout: one primary action, readable text, no horizontal overflow at 360/390 px, expandable technical details, accessible contrast, and charts subordinate to current position/risk.

## Proposed architecture

Reuse the repository's existing application/authentication conventions after a focused code audit. Keep the execution engine isolated from marketing pages. The first implementation should be a private paper workspace behind existing owner access; no customer access migration.

Components:
- Versioned strategy registry with source/config hashes, supported symbols/timeframes, test evidence and release status.
- Market-data adapter with entitlement, timestamp, exchange-session, contract-roll and staleness checks.
- HTTPS signal ingress that durably records valid requests before returning quickly.
- Durable queue and deterministic validator/risk engine.
- Paper execution adapter with a durable order/position ledger.
- Reconciliation worker, audit log, health panel and user-facing journal.

Use transactional persistence, unique constraints and an outbox/queue pattern. Select the database/queue provider only after inspecting existing infrastructure and free-tier limits. Do not create paid services as part of planning.

## Signal contract and replay handling

A versioned event contains schema_version, strategy_id, source_hash/config_hash, instance_id, instrument and exchange, timeframe, bar_close_utc, signal direction/intent, signal_id, sequence, and received_at. Normalize timestamps to UTC and validate against the approved registry. Never trust a client-supplied position size to bypass server risk limits.

Deduplicate durably by account + instance + strategy version + instrument + timeframe + bar close + intent. Use a client_order_id derived from that event, not a random new identifier on each retry. Reject unsupported versions, duplicate events, stale/replayed signals, impossible timestamps and out-of-order state transitions. Quarantine conflicting signals and provide a readable reason.

TradingView alerts are snapshots of scripts/settings. Creating a new script version does not migrate existing alerts; version replacement requires a controlled alert inventory and cutover.

## TradingView ingress constraints

Official TradingView guidance describes a three-second processing timeout, ports 80/443, required two-factor authentication, and retries for certain 5xx responses. A receiver should validate/enqueue quickly and do processing asynchronously. Duplicate delivery is expected, not exceptional.

Do not assume TradingView supplies an arbitrary HMAC header. For a sandbox prototype, use a per-instance opaque ingress token, redact it from logs, support revocation/rotation, and combine it with strict schema/instance checks and the published source-IP guidance where appropriate. Never embed broker credentials in Pine, alert text or URLs. Review token handling before customer rollout; source IP alone is insufficient authentication.

References:
- https://www.tradingview.com/support/solutions/43000529348-how-to-configure-webhook-alerts/
- https://www.tradingview.com/support/solutions/43000735201-webhook-resubmission/

## Execution and reconciliation

Lifecycle: received, validated, risk_checked, queued, submitted, acknowledged, partially_filled, filled/cancelled/rejected. Include an unknown outcome state.

A network timeout is not evidence that an order failed. Reconcile using client_order_id before any resubmission. On restart, recover durable state and reconcile positions/orders before accepting new exposure. Repeated delivery must never create repeated exposure.

Continuous symbols such as MES1! are research references. Any future broker adapter must resolve an approved dated tradable contract, rollover policy and exchange calendar. Paper and later live adapters should share lifecycle contracts, while clearly exposing the different fill semantics.

Maintain append-only events and derived positions. Compare internal orders, fills and positions on every restart and periodically. Unexplained divergence blocks new entries and alerts the operator; preserve protective exit handling.

## Risk and paper-fill model

Pre-trade checks include account/session status, allowed instrument/version, market-data freshness, maximum position/quantity, maximum open orders, daily loss budget, duplicate/conflicting intent and rate limits. Enforce limits server-side and record every decision.

Model bid/ask spread when available, commissions on each side, latency, adverse gaps, tick rounding, partial fills and conservative ambiguous OHLC fills. Document assumptions visibly. An OHLC simulator cannot establish queue position or guarantee live execution.

Use explicit states for stale data, disconnected feed and unreconciled order state. Fail closed for new exposure. Separate unrealized and realized results, gross and net P&L, backtest and paper-forward evidence. Do not combine overlapping timeframe backtests into an implied portfolio return.

## Milestones and acceptance criteria

### P0 — Evidence and contracts

Freeze the next candidate and document its assumptions. Acquire longer appropriately licensed history without new spend unless approved. Define event schema, lifecycle, data entitlement, contract mapping and risk defaults. Preserve original/customer versions.

Exit: reproducible source/config hashes; a fresh-data test plan; documented data/fill limitations; no inferred performance claims.

### P1 — Private paper workspace

Implement simulation, journal, readable onboarding and risk controls using deterministic fixtures. Exercise duplicate, stale, out-of-order, restart, timeout, partial-fill, cancel/replace and gap scenarios.

Exit: zero duplicate simulated exposure in fault tests; every tested risk violation blocked; every event traceable to a version and decision; no unexplained position divergence; mobile and accessibility checks pass.

### P2 — TradingView sandbox alerts

Connect one private research instance at a time. Run through at least 20 sessions and 100 accepted signals as initial minimums, extending the evaluation when market regimes or slower timeframes are underrepresented. These are proposed gates, not completed results.

Proposed SLOs: durable ingress acknowledgment under one second at the 99th percentile within the documented provider constraints; no lost acknowledged events; every unknown order outcome reconciled before new exposure. Measure actual latency and revise capacity before rollout.

Exit: TradingView/local/paper signal parity for supported cases; delivery/retry fault tests; observed costs and gaps documented; daily reconciliation; owner approval of a limited paper beta.

### P3 — Paper beta

Release to an explicitly approved small cohort with persistent simulation labels, diagnostics, support and rollback. Track completion, rejected-signal explanations, reliability and user comprehension before monetization or broader release.

### Deferred — Live execution

Require a separate owner decision, broker/market-data terms and permissions review, credential-vault design, least-privilege access, real reconciliation testing, incident runbooks and an explicit live-release approval. Do not connect or trade a brokerage account under this planning task.

## Next implementation ticket

Build a private paper-session vertical slice: approved strategy registry fixture → synthetic event ingress → deduplication → risk decision → simulated fill → journal. Acceptance tests should focus on duplicate/reordered delivery, restart recovery and clear beginner-facing explanations. No broker connection or new spending is required for this slice.
