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

Create two Stripe Payment Links:

- Darth Algo Pro: `$29/month`
- Darth Algo Lifetime: `$230` one-time
- Add a Stripe custom field for the buyer's TradingView username.

Then set these environment variables in Vercel:

```bash
NEXT_PUBLIC_STRIPE_MONTHLY_LINK=https://buy.stripe.com/fZu4gA4T5fRiaeG0g46kg01
NEXT_PUBLIC_STRIPE_LIFETIME_LINK=https://buy.stripe.com/3cI7sM71d48A4Um5Ao6kg00
```

Suggested checkout confirmation message:

```txt
Thanks for your purchase. Darth Algo access is manually activated after order verification. Access is usually granted within 24 hours. Please make sure your TradingView username was entered correctly during checkout.
```

Manual fulfillment workflow:

1. Open the Stripe payment details.
2. Copy the buyer's TradingView username from the custom field.
3. Add the username to the TradingView invite-only script access list.
4. Email the buyer that access has been activated.

## Production Build

```bash
npm run build
npm run start
```
