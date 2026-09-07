# Chart Clarity: acquisition campaign

Prepared September 7, 2026. Status: built for review; no public posts, automated follow-ups, or paid advertising have been launched by this change.

## Objective and audience

Give prospective TradingView users a useful first experience, then invite them into the free community. Measure community interest and verified joins without presenting historical screenshots as evidence of expected returns.

The campaign supports futures traders interested in a clearer chart-reading process. The walkthrough uses existing Swing product captures; it does not claim that every screenshot depicts ES, NQ, MES, MNQ or MGC. Do not add instrument labels absent from the original capture.

## Built deliverables

- `/start`: three interactive lessons covering context, invalidation and targets, each with a knowledge check and visible explanation.
- Real, existing product screenshots, original-image links, and an explicit historical-example label.
- A free checklist available without submitting an email or buying anything.
- A community call to action preserving source and campaign through the existing community landing page.
- Trial terms and customer setup instructions using the currently published offer.
- Education-page entry point and sitemap entry.

## Ready-to-use channel links after release

| Placement | URL |
|---|---|
| Instagram bio | https://www.darthalgo.com/start?source=instagram&campaign=chart_clarity |
| YouTube description | https://www.darthalgo.com/start?source=youtube&campaign=chart_clarity |
| TikTok bio | https://www.darthalgo.com/start?source=tiktok&campaign=chart_clarity |
| Facebook post | https://www.darthalgo.com/start?source=facebook&campaign=chart_clarity |
| X post | https://www.darthalgo.com/start?source=x&campaign=chart_clarity |
| Telegram pin | https://www.darthalgo.com/start?source=telegram&campaign=chart_clarity |
| Permitted creator placement | https://www.darthalgo.com/start?source=affiliate&campaign=chart_clarity |

These are release destinations, not a claim that the new page is already live. Keep the campaign focused on one promise and one destination. Link clicks and community views are measurable through the existing downstream pipeline only if its database and invites are configured. This change does not install full-funnel analytics or attribute individual sales.

## Instagram feed carousel: final copy

1. **A signal needs context.** Three checks before considering a setup.
2. **Read the environment.** Is the market trending, moving sideways, or changing direction?
3. **Define the downside.** Locate invalidation. Evaluate the loss before the target.
4. **Treat targets as possibilities.** A mapped exit is not a promised result.
5. **Try the free walkthrough.** Three short steps. No signup needed. Link in bio.

Caption: “A buy or sell marker is only one part of the picture. Context, invalidation, and targets belong together. 📊 Try our free chart walkthrough through the link in bio, then bring your questions to the Darth Algo community. Educational only. Trading involves risk. #TradingView #TradingEducation #FuturesTrading #DarthAlgo”

Production: Instagram feed post only. Maximum four hashtags in this caption. Use the existing real chart captures; keep annotations accurate and legible. Do not invent profit figures. Slide copy and caption are ready; the final carousel image files are still to be produced.

## Community welcome: final copy

“Welcome to Darth Algo ⚔️

Start with the free chart walkthrough: learn context, invalidation, and targets in three short steps.

Then tell us what you trade and which part of reading your chart you want help with. 📊

Already purchased? Open TradingView → Indicators → Invite-only scripts after your access is activated.

Educational discussion only. Trading involves risk.”

Proposed buttons:

- Start the walkthrough → https://www.darthalgo.com/start?source=telegram&campaign=chart_clarity
- Compare tools → https://www.darthalgo.com/#pricing
- Setup help → https://www.darthalgo.com/support

Use one concise pinned welcome rather than duplicate announcements. The existing bot can expose these destinations, but this change does not send or replace Telegram messages.

## Two community participation prompts

Prompt 1: “Quick check: what is hardest to read on your chart right now? 📊 Market direction / Stop placement / Targets / Getting the indicator set up. Pick one and tell us what you’re stuck on.”

Prompt 2: “When reviewing a setup, what would make you skip it? Share the context or chart question—not a request for someone to place a trade for you. ⚔️”

## Short video: matched script and shots

This is an edit-ready brief, not a completed video. Use stable recorded chart footage. A real TradingView recording is still required; do not simulate an indicator’s historical behavior with generated video.

| Time | Voiceover | Visual | Overlay |
|---|---|---|---|
| 0–4s | “A buy signal is only one piece of the chart.” | Full-screen real chart with the relevant BUY marker in view | One piece |
| 4–9s | “First, read the market context.” | Stable reframe to the recorded dashboard; label the capture historical | Read context |
| 9–14s | “Then locate the entry and where the idea becomes invalid.” | Real capture focused on ENTRY and STOP; no moving fabricated candles | Define downside |
| 14–19s | “Compare the targets with that downside. Targets are possibilities, not promises.” | Same capture expands to include targets | Evaluate targets |
| 19–25s | “Try the free Darth Algo walkthrough. Then bring your questions to our community.” | Record the actual walkthrough interaction | Free walkthrough |

Title: “Three checks before you read a trading signal”

Description: “Context. Invalidation. Targets. 📊 Explore the free walkthrough and keep learning with the Darth Algo community. Selected historical examples are educational and do not establish expected performance. Trading involves risk.”

Use a clean professional voiceover and only music licensed for the intended placements. Ensure captions match speech. Do not label a still image as live replay. Produce the video only after the required source recording is available.

## Release order

1. Complete the code review and production release decision. Check the campaign page and the real community destination before distribution.
2. Add the welcome resource to the community and update approved profile links using the matching source links.
3. Publish the feed carousel and website walkthrough. Publish video only when the real recording and finished edit pass review.
4. Record results after seven days of actual distribution. The window starts at launch, not document creation.
5. Prioritize the source producing useful participation and verified joins. Do not scale spending from views alone.

## What is measurable now versus missing

- Existing system defines community page views, outbound clicks, and Telegram joins. Do not count clicks as members.
- Source is normalized against the existing allowlist; both source/campaign and utm_source/utm_campaign are accepted by `/start`.
- Campaign is preserved to the community page and outbound click. Current source-specific Telegram invites do not establish a unique per-campaign or per-visitor sales journey.
- The walkthrough itself does not record views, answers, or completion. Its knowledge checks run in memory and collect no new personal data.
- Trial starts, paid conversions and retention require a separate verified billing attribution implementation. Do not fill unavailable numbers with estimates.

## Automation findings and next work

Verified from repository code, not production runtime:

- The existing Stripe webhook is for affiliate commissions. It is not a verified TradingView entitlement worker.
- Telegram assistant documentation describes an in-memory support briefing batch; persistence across deployments is not established.
- The existing community redirect depends on the growth database and configured invite links.
- The earlier launch plan sent a community-focused call to action to homepage pricing. Its link now points to the existing community route with recognized source/campaign parameters.

Next operational slice: verify the deployed bot, invite configuration, and customer-access worker; then connect their state to a durable incident queue. Use secure connections; never request passwords or live tokens in chat.
