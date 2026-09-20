# Opening Range Fakeout — private QA, September 20

Status: private beta; partial release evidence, not a public release or an unattended worker.

Observed saved layout: https://www.tradingview.com/chart/Dgus0VP0/

Actual TradingView replay capture: https://www.tradingview.com/x/675CBsZI/

The indicator is `Darth Algo Opening Range Fakeout - Private Beta`, saved source version 2. The exact clipboard source read from Pine Editor (CRLF line endings) has SHA-256 `ac42afa13c5240d0342317c88e727ef2cf2a9bec413c7ede320523189f36578a`. No source or signal logic was changed in this session.

## Observed checks

- Reconnected the authorized chart session after owner approval. A second session displacement occurred; reconnection used the same authorization. Interactive access is not a reliable unattended worker.
- Existing version loaded and calculated on AAPL 3-, 5-, and 15-minute standard candles and MES continuous futures 3-, 5-, and 15-minute standard candles, without a displayed runtime error. This is runtime/load evidence, not a newly submitted compiler log.
- MES September 17 replay produced the same opening range across those three intervals: high 7,716.25 and low 7,688.25. The account uses delayed CME data.
- MES 10-minute candles showed the unsupported-chart red tint, no range, and no reentry signals.
- AAPL September 18 five-minute replay was stepped through the opening range. Range plots were absent during the opening candles, then displayed high 338.49 and low 335.39 on the first post-range bar.
- AAPL September 17 five-minute replay was stepped through a downside break and return inside the 335.55–331.36 range. The cyan FAKEOUT marker appeared on the completed return bar and persisted after advancing. The saved snapshot shows the actual chart. This is not a profitability or non-repainting certification.
- TradingView's alert dialog recognized version 2.0, exposed both `Upper range reentry` and `Lower range reentry`, and allowed `Once per bar close`. The lower alert message correctly described a return after a downside break. The dialog was canceled; no alert was created, triggered or sent.
- Exited replay, returned to AAPL five-minute candles, and reloaded the saved layout. The named indicator and range calculations reopened successfully; the layout reported all changes saved.

## Plain-language explanation

Purple lines mark the high and low of the New York 09:30–09:45 opening range. After the first close beyond either boundary, the script waits up to the configured number of bars for a close back inside. Orange marks a return after an upside break; cyan marks a return after a downside break. It only evaluates confirmed bars, allows one initial break attempt per direction per session, and ends evaluation at 16:00 New York time. An expired first attempt is not rearmed later that day.

Supported chart intervals in source: 1, 3, 5 and 15 minutes, standard candles, weekdays. Complete contiguous opening-range bars are required. This is context for a potential failed breakout; it does not supply a guaranteed entry, profit target, stop loss, or win-rate claim.

## Still needed for release

Fresh compiler evidence tied to a registered candidate/source hash; a worked upper reentry replay; one-minute and missing-bar/session-boundary cases; live closed-bar alert delivery; verified instruction image and educational package; owner package approval. The current production Lab reports zero registered candidates and `worker_not_connected`. This manually saved prototype must not be treated as an approved database candidate or automatically published. New releases remain free and publicly discoverable on TradingView after their release gates pass.

## Publishing incident handled during QA

Production returned `BUFFER_HTTP_429`. PR83 adds durable 30-minute connection discovery caching, fresh checks immediately before publication, five-minute scheduled receipt throttling, a persisted Retry-After cooldown with a one-hour fallback, and a clear health notice. Actual cron output changed to `waiting_for_buffer` / `BUFFER_RATE_LIMIT_COOLDOWN`; the community correctly remained `waiting_for_confirmed_social_post`. This confirms backoff, not successful publication.

Validation: full production build, shared publishing PGlite integration, and legacy Buffer draft/unknown-outcome regression passed. Provider calls in tests are mocked. Production deployment `dpl_8PgRPpESwwpf2sxARP9zJC48Rk47` is READY.
