# Darth Algo Opening Range Fakeout: read a return inside the opening range

Publication draft — private beta, not yet released.

The first 15 minutes of the New York session establish a reference range. This indicator marks a particular event: price closes beyond that range, then closes back inside within the selected number of bars.

## Read the chart

- Purple boundaries: the 09:30–09:45 New York high and low.
- Orange FAKEOUT: a confirmed return inside after an upside break.
- Cyan FAKEOUT: a confirmed return inside after a downside break.
- Red background: unsupported chart settings; change to standard 1-, 3-, 5- or 15-minute candles.

Default: three bars to reenter. Each direction gets one initial breakout attempt per session. If the first attempt expires, the indicator does not rearm that direction later the same day. It requires complete opening-range bars and evaluates the session through 16:00 New York time.

## Worked examples from the actual private chart

[September 14 upside replay](https://www.tradingview.com/x/KtxJYwT4/): AAPL on five-minute candles formed a 334.99–331.34 opening range. The replay showed a break above the upper boundary followed by a return inside, with an orange marker. The marker remained visible as replay advanced.

[September 17 downside replay](https://www.tradingview.com/x/675CBsZI/): AAPL on five-minute candles formed a 335.55–331.36 range. After the downside break, the completed return bar was marked in cyan.

Actual downside image: https://s3.tradingview.com/snapshots/6/675CBsZI.png . The image has not yet been packaged with a verified byte digest for release approval.

## Use and limitations

Use the marker as context when reviewing a failed breakout. Decide separately whether the broader market and your risk plan support a trade. A marker is not an entry order and does not provide a profit target, stop loss or guarantee.

A setup is not flagged when the return is outside the configured window, the first attempt already expired, opening-range data is incomplete, or chart settings are unsupported. A move through the opposite boundary cancels the pending attempt. Markers use confirmed closes, so an intrabar crossing alone is insufficient.

Both alert conditions are present in the private version. For a closed-bar workflow, choose Once per bar close. Actual live alert delivery remains unverified; replay observations do not establish profitability or guarantee behavior on every feed.

Planned release: free, public and protected on TradingView, with no invitation required. No public script or educational-post URL exists yet.
