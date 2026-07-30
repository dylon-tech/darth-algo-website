# Darth Algo Landing Page

Modern responsive landing page for the Darth Algo TradingView invite-only indicator.

## Tech Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- lucide-react icons

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Stripe Payment Links

Create four Stripe Payment Links:

- Darth Algo Buy/Sell Scalper Tool: `$18.99/month`
- Darth Algo Buy/Sell Swing Tool: `$14.99/month`
- Darth Algo Buy and Sell Pro Tool: `$29/month`
- Darth Algo Lifetime: `$134.99` one-time
- Keep Stripe's standard customer email field enabled for receipts and access support.
- Add one required text custom field labeled `TradingView username`.
- Do not use a second custom field for email; Stripe already associates the checkout email with the order.

Then set these environment variables in Vercel:

```bash
NEXT_PUBLIC_STRIPE_SCALPER_LINK=https://buy.stripe.com/14AfZi4T5fRidqS2oc6kg03
NEXT_PUBLIC_STRIPE_SWING_LINK=https://buy.stripe.com/28EcN699l8oQ9aC5Ao6kg02
NEXT_PUBLIC_STRIPE_SWING_TRIAL_LINK=https://buy.stripe.com/28EcN699l8oQ9aC5Ao6kg02
STRIPE_SECRET_KEY=your_stripe_secret_key
NEWSLETTER_WEBHOOK_URL=your_email_platform_or_automation_webhook
NEXT_PUBLIC_SUPPORT_EMAIL=your_support_email
NEXT_PUBLIC_STRIPE_MONTHLY_LINK=https://buy.stripe.com/4gM8wQfxJ6gI1IabYM6kg05
NEXT_PUBLIC_STRIPE_LIFETIME_LINK=https://buy.stripe.com/6oUcN62KX0WoeuW1k86kg04
NEXT_PUBLIC_SITE_URL=https://darthalgo.com
```

## Newsletter

The newsletter form posts subscriber consent and email data through the server-side
`NEWSLETTER_WEBHOOK_URL`. Connect this URL to your email platform directly or through
an automation tool such as Zapier or Make. The webhook receives `email`, `consent`,
`source`, and `subscribedAt` fields.

Suggested checkout confirmation message:

```txt
Thanks for your purchase. Darth Algo access is manually activated after order verification. Access is usually granted within 24 hours. Please make sure your TradingView username was entered correctly during checkout.
```

For every Payment Link, set the after-payment redirect to:

```txt
https://darthalgo.com/purchase-success?session_id={CHECKOUT_SESSION_ID}
```

Keep `{CHECKOUT_SESSION_ID}` exactly as written. The purchase survey uses it to attach
the customer's optional answers to the completed Stripe Checkout Session.

Manual fulfillment workflow:

1. Open the Stripe payment details.
2. Confirm the buyer's checkout email and copy the TradingView username custom field.
3. Add the username to the TradingView invite-only script access list.
4. Email the buyer that access has been activated, or ask for a corrected username if needed.

## Production Build

```bash
npm run build
npm run start
```
