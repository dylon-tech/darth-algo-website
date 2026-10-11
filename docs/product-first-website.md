# Product-first website direction — October 11, 2026 UTC

Work: DA-PRODUCT-FIRST-20261011-v1. Founder explicitly rejected bland, paragraph-led pages and asked for the indicator to lead across the website. The founder also clarified that `/alternatives` was not a specifically requested page. This change improves that existing destination; it does not add another acquisition page or authorize outbound marketing.

## Presentation contract

- Show an authentic Darth Algo indicator in the first screen of acquisition pages, after a short benefit-led headline. Teach with the product, not a wall of introductory copy.
- Give every image a useful explanation: what to look at, why it matters, and the next step. Feature switches are named buttons, not automatic slides or invented live signals.
- Keep original screenshot bytes and proportions. Full-size inspection uses a keyboard-accessible native dialog with scrollable original dimensions. Small chart text must not carry an unsupported claim.
- Use the existing black/charcoal, red, original logo and sharp condensed italic brand. Locally serve the unmodified Barlow Condensed Black Italic font under its included SIL OFL; no paid font or third-party runtime font request.
- Preserve every plan, checkout destination, trial clock, Lifetime/source/commercial license term, affiliate reference, campaign label and exact-username setup instruction.
- Support and purchase-success must help existing buyers first. Legal pages, private owner controls, application fields and permissions are not conversion-copy experiments.
- Do not interpret a product pattern as proof of revenue. The target is qualified exploration and positive-value new purchases, not a promised conversion lift or income deadline.

## Research and original adaptation

Official pages checked October 11, 2026: [Apple AirPods Pro](https://www.apple.com/airpods-pro/), [Linear](https://linear.app/), [TradingView](https://www.tradingview.com/) and [LuxAlgo](https://www.luxalgo.com/). These are current product-presentation observations, not an audit of private advertising performance or profitability.

Apple pairs a short product benefit and buying action with product imagery and feature highlights. Linear demonstrates the interface alongside specific workflows. LuxAlgo pairs a trader problem with a visible chart/interface and a product action. Adapt those principles with original Darth Algo wording and existing product captures; do not copy their claims, artwork, testimonials or financial outcomes. TradingView supplies category context, not a claim of equivalent features.

Advertising example: [the credited designer's AirPods Pro campaign work](https://www.chrissayres.com/apple/) describes visualizing noise cancellation and spatial audio with movement. The transferable lesson is to make a feature visible, not just write a slogan. For Darth Algo, use the real chart's signal, trend and risk-plan layers. This is a creative reference, not evidence of advertising ROI.

## Scope

Full real-chart headers: home, alternatives, compare, all three product pages, education, indicators, community, about and affiliates. `/links` brings its actual Pro chart forward and removes decorative quote scenery. `/start` has a shorter introduction while retaining its interactive lesson and cautions. Support retains help-first content with a secondary product path. Founder profile retains its biography with a direct product destination. Legal and purchase-success content is unchanged.

The homepage's first demonstration is now a recorded product capture instead of the previous scripted winning simulation. Existing tool selection, plan finder, sample disclosures, pricing anchors, FAQs and setup remain. No social campaign, approval, provider receipt, job, scheduler, customer record or message is edited.

## Validation and rollback

Local production build/type checks and existing attribution regression passed before PR preparation. Changed-file lint passes. Chromium download locally returned an invalid archive, so local pixel review is not claimed. The existing iPhone workflow now also runs `scripts/product-first-browser.mjs` against a local production server with no database credentials and blocked external requests/mutations. It covers Chromium/WebKit, 320/390/1280 widths, real image loading and early placement, no overflow, feature selection, full-size dialog/focus restoration, correct selected-product checkout, no-JS checkout, campaign carryover and existing affiliate references. Screenshots are uploaded with the existing validation artifacts for review before merge. Passing CI and exact production evidence must be read separately.

First PR-head checks passed (Business run 38102868809; iPhone run 38102868921). Human-visible screenshot inspection found a WebKit compositing blemish over the link-hub brand despite passing geometry checks. Remove its nonessential 3D logo/perspective decoration and inspect fresh screenshots before release. Also explicitly focus-test and keyboard-pan the full-size chart region; Escape must still restore focus. These are presentation/accessibility changes, not altered image bytes or relaxed assertions.

Render diagnosis (run 38103602181): the top-left black patch reproduced in a fresh WebKit page, remained after removing the off-screen video iframe, and disappeared when CSS filters/backdrop filters were disabled. Removing the 3D logo tilt alone had not fixed it. The bounded fix removes only the link hub's decorative blur/drop-shadow layers, preserving the original image, video, links and content. Regression checks assert those computed filter layers are absent; fresh unmodified-page screenshots must be inspected too. The probe altered only a local test DOM with external requests blocked, never production.

Release base: `dab665b1a4e023ba1082ea2de15341a133e1b6e4`, observed READY production `dpl_GhbirnrSuGbjPkuWf81C1HLedheu`. Roll back by reverting only the product-first release through a reviewed PR, preserving any newer concurrent content. In an outage, this prior READY deployment is a candidate only after confirming compatibility and current aliases; never roll back unrelated later work blindly.

Font source: Google Fonts `ofl/barlowcondensed/BarlowCondensed-BlackItalic.ttf`; SHA-256 `e1ed5d7e50c6a4498454d40509ce2362384a2c7870df3418fdbd010f81dffad3`. License: `public/fonts/darth-social/Barlow-OFL.txt`.

Dated lesson: a real screenshot farther down the page does not make the first impression product-led. Review the first phone screen and the actual next action, not merely the presence of an image in source. Retain or revise this design from owner feedback and measured qualified buying-path outcomes; successful brands' layouts alone do not establish causality.
