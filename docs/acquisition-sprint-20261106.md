# Acquisition conversion and content update — November 6, 2026

The homepage displayed an 87% win rate and other 100-trade figures without the instrument, dates, trade ledger, execution assumptions or independent verification needed to substantiate them. Replace that block with a practical product-comparison path and preserve the existing section anchor. No new performance claim is introduced.

The pricing introduction now distinguishes recurring monthly access from a separate one-time Lifetime purchase and directs existing subscribers to support before switching. Internal site-building language is replaced with customer-facing product guidance. Prices, trial duration, product definitions, licenses, checkout URLs, subscriptions and customer access are unchanged.

Two captioned, silent 20-second vertical lessons use full, unmodified owned screenshot contents mapped in `app/lib/products.ts`:

| Asset | Product source | Lesson | Intended slot (America/New_York) |
|---|---|---|---|
| `/growth-sprint/2026-11-06/two-targets.mp4` | `/indicators/swing-risk-plan.png` | Write separate rules for Target 1 and Target 2 | Nov 7, 9 AM |
| `/growth-sprint/2026-11-06/read-the-dashboard.mp4` | `/indicators/scalper-dashboard.png` | Read Market and Current Candle as separate fields | Nov 7, 3 PM |

These are recorded product feature examples, not live footage, executed trade evidence or a profitability claim. The full original images are retained within the compositions. Source and video SHA-256 values are in the colocated provenance manifest. The selected source families are outside the last six approved campaign families. Both slots are educational under the existing alternating calendar.

Publication owner: the Metricool acquisition sprint. **Do not also add these assets to the app publisher queue.** A hosted asset is not proof of a scheduled or published social post. Provider receipts and private prospect records belong in the private acquisition tracker, not this repository.

Validation: production build and existing campaign attribution test passed; final encoded video frames at 1, 6, 11 and 16 seconds inspected at 390px-wide phone size. Both files are 1080x1920 H.264, 30fps, 20 seconds with silent AAC audio. No new paid media or generation services used. Reproduce using Python with Pillow and ffmpeg: `python3 scripts/render-sprint-20261106.py`.

A separate live Pro checkout configuration proposal was held by automatic approval review and is not included in this commit. Do not use this release to perform that held change.
