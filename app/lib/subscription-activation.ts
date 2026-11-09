import type Stripe from "stripe";
import { db } from "./affiliate-db";
import { stripe } from "./stripe";
import { checkoutTradingViewUsername, paidMonthlyPlan } from "./subscription-activation-policy";

let schemaReady: Promise<void> | undefined;
const idOf = (value: unknown): string =>
  typeof value === "string" ? value : value && typeof value === "object" && "id" in value ? String(value.id) : "";

export function ensureSubscriptionActivationSchema() {
  schemaReady ??= (async () => {
    const sql = db();
    await sql`
      create table if not exists os_subscription_activation (
        checkout_session_id text primary key,
        subscription_id text not null unique,
        customer_id text,
        stripe_event_id text not null,
        product_id text not null,
        price_id text not null,
        plan_name text not null check(plan_name in ('Swing','Scalper','Pro')),
        tradingview_username text,
        amount_paid_cents integer not null check(amount_paid_cents > 0),
        currency text not null,
        status text not null default 'access_unverified'
          check(status in ('access_unverified','username_review','subscription_review','canceled','access_verified')),
        created_at timestamptz not null default now(),
        last_checked_at timestamptz,
        access_verified_at timestamptz
      )
    `;
    await sql`create index if not exists os_subscription_activation_pending on os_subscription_activation(status, created_at)`;
  })().catch((error) => { schemaReady = undefined; throw error; });
  return schemaReady;
}

/**
 * One-way, private evidence inbox. Stripe payment and username are verified
 * separately from actual TradingView entitlement. Never auto-grant from here.
 */
export async function captureSubscriptionActivation(event: Stripe.Event) {
  if (!event.livemode) return;

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    if (!subscription.livemode) return;
    await ensureSubscriptionActivationSchema();
    await db()`
      update os_subscription_activation
      set status = 'canceled', last_checked_at = now()
      where subscription_id = ${subscription.id}
        and status <> 'canceled'
    `;
    return;
  }

  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return;
  const session = event.data.object as Stripe.Checkout.Session;
  const subId = idOf(session.subscription);
  if (!session.livemode || session.mode !== "subscription" ||
      session.payment_status !== "paid" || !subId ||
      typeof session.amount_total !== "number" || session.amount_total <= 0) return;

  const lines = await stripe().checkout.sessions.listLineItems(
    session.id, { limit: 100 }, { timeout: 7000, maxNetworkRetries: 1 },
  );
  if (lines.has_more) throw Error("Subscription activation: incomplete checkout items");
  const product = paidMonthlyPlan(lines.data);
  if (!product) return;

  const username = checkoutTradingViewUsername(session.custom_fields);
  const liveSubscription = await stripe().subscriptions.retrieve(
    subId, {}, { timeout: 7000, maxNetworkRetries: 1 },
  );
  if (!liveSubscription.livemode) throw Error("Subscription activation: not a live subscription");
  const status = liveSubscription.status === "canceled"
    ? "canceled"
    : !["active","trialing"].includes(liveSubscription.status)
      ? "subscription_review"
      : username ? "access_unverified" : "username_review";
  await ensureSubscriptionActivationSchema();
  await db()`
    insert into os_subscription_activation (
      checkout_session_id, subscription_id, customer_id, stripe_event_id,
      product_id, price_id, plan_name, tradingview_username,
      amount_paid_cents, currency, status
    ) values (
      ${session.id}, ${subId}, ${idOf(session.customer) || null}, ${event.id},
      ${product.productId}, ${product.priceId}, ${product.name}, ${username},
      ${session.amount_total}, ${session.currency || "usd"}, ${status}
    ) on conflict (checkout_session_id) do nothing
  `;
}

export async function subscriptionActivationSnapshot() {
  await ensureSubscriptionActivationSchema();
  const sql = db();
  const [orders,counts] = await Promise.all([
    sql`
      select checkout_session_id,subscription_id,customer_id,plan_name,
        tradingview_username,amount_paid_cents,currency,status,created_at,
        access_verified_at
      from os_subscription_activation
      order by created_at desc limit 100
    `,
    sql`
      select status,count(*)::integer as count
      from os_subscription_activation group by status order by status
    `,
  ]);
  return {
    counts, orders,
    note: "Payment and order data only; Stripe email or signup is not proof of TradingView access. A human must confirm access separately.",
    autoGrantedTradingViewAccess: false,
  };
}
