# Growth Tracking Specification

## UTM Standard
Use lowercase values and never publish an untracked campaign link.

Base URL:
https://www.darthalgo.com/

Parameters:
- utm_source: tiktok, youtube, instagram, telegram, creator_{name}
- utm_medium: organic_social, paid_social, community, affiliate
- utm_campaign: campaign name
- utm_content: exact asset identifier
- ref: creator or partner code when applicable

Example:
https://www.darthalgo.com/?utm_source=tiktok&utm_medium=organic_social&utm_campaign=stop_trading_blind&utm_content=video_01_entry_plan#pricing

## Asset Naming
DA-{YYYYMMDD}-{CHANNEL}-{CAMPAIGN}-{ASSET}-{VARIANT}

Example:
DA-20260903-TT-STOPBLIND-V01-A

## Lead Record
Store:
- telegram_user_id
- telegram_username
- joined_at
- first_source
- latest_source
- campaign
- content
- referral_code
- market (ES/NQ/MES/MNQ/other)
- style (scalper/swing/both/unsure)
- intent (learning/trial/monthly/lifetime/support)
- recommended_plan
- checkout_clicked_at
- purchased_plan
- purchased_at
- escalation_status
- last_follow_up_at
- opt_out

## Events
- landing_view
- pricing_view
- telegram_click
- telegram_join
- plan_finder_started
- plan_recommended
- checkout_click
- purchase_confirmed
- access_requested
- access_completed
- support_escalated

## Weekly Scorecard
| Metric | TikTok | YouTube | Instagram | Creators | Telegram |
|---|---:|---:|---:|---:|---:|
| Views | | | | | |
| Link clicks | | | | | |
| Joins | | | | | |
| Qualified leads | | | | | |
| Trial starts | | | | | |
| Purchases | | | | | |
| Revenue | | | | | |

## Decision Rules
- Keep an asset if it creates qualified joins, even when total views are modest.
- Rewrite the hook when watch time is weak.
- Rewrite the CTA when watch time is strong but clicks are weak.
- Fix onboarding when joins are strong but Plan Finder completion is weak.
- Fix the offer explanation when recommendations are strong but checkout clicks are weak.
- Scale only after a campaign produces repeatable qualified joins and purchases.
