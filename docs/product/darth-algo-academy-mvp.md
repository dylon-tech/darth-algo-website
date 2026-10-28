# Darth Algo Academy — beginner chart literacy MVP

Status: product/content proposal, not deployed. Intended as educational content, not investment advice or a guarantee of profitable setups.

## Experience
- Academy tab next to Markets and Portfolio, mobile-first black/red UI.
- Seven short lessons: Candlesticks; Structure (higher highs/lows, BOS, CHoCH); Liquidity and sweeps; FVG; Order blocks; IFVG; Combining evidence and managing risk.
- ICT terms are taught as one popular interpretive framework, not as scientifically validated predictors. Define ambiguous concepts carefully and contrast with ordinary price action.
- Each lesson: simple language, 2–3 annotated **real historical** chart examples, a step-by-step replay, a counterexample/failed setup, a quick recognition exercise, and a clear risk note.
- User actions: Save lesson, bookmark a specific chart/time, add personal notes, mark complete, revisit saved library, optionally export notes and citations.
- In the chart, offer “Learn this pattern” on relevant indicator events and “Practice on historical chart.” No live trading action from lessons.
- Beginner defaults: only Academy, Markets, Practice visible; advanced features tucked away.

## Chart provenance and accuracy
- Acquire permitted licensed OHLCV historical data and verify display/redistribution rights. Prefer reproducible in-app candlestick chart rendering from verified source data over unattributed screenshots.
- Persist symbol, exchange, timeframe, exact UTC window, source, feed latency, corporate actions/contract roll adjustments, and screenshot/replay version.
- Clearly label annotations as educational hindsight vs signals that were observable in real time. Include failed/ambiguous examples to avoid selection bias.
- Never imply price-pattern recognition guarantees a move. Do not copy third-party course images without permission.

## Storage and security
- Per-user tables: lesson_progress(user_id,lesson_id,completed_at), saved_items(user_id,item_type,item_id,chart_context,notes,created_at), lesson_assets(asset_id,symbol,venue,timeframe,start,end,license,source).
- Enforce per-user row-level authorization, backups, export and deletion; private notes not exposed to other users.
- Offline bookmark state may cache locally but server sync is source of truth.

## Suggested first lesson content
Title: Liquidity sweep and reclaim
Definition: Price briefly trades beyond a visible prior swing high/low and returns inside the range. This is a descriptive chart pattern, not proof of institutional intent.
Identify: (1) prior level, (2) wick or close through it, (3) reclaim/confirmation, (4) invalidation level.
Example: annotate a real historical chart after feed licensing and data verification; show a failed sweep where price keeps trending.
Quiz: Given two historical examples, identify whether a reclaim occurred before the next candle.
Risk: False reversals happen, especially around news and thin liquidity. Practice before risking capital.

## Delivery milestones
1. Academy navigation, lesson index, bookmarks/notes mock state.
2. Licensed historical chart ingestion and reproducible chart annotations.
3. Seven lessons with verified examples and counterexamples.
4. Accounts, saved library, progress, mobile accessibility.
5. Historical replay and quizzes; measure completion and retention.

## Acceptance
No fabricated chart examples presented as historical; no unlicensed screenshot assets; save persists across sessions/devices; data access separated by user; clear education vs live signals.
