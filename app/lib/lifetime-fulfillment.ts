import type Stripe from "stripe";
import { db } from "./affiliate-db";
import { stripe } from "./stripe";
import { lifetimeRefundStatus } from "./lifetime-refund-policy";

// This is a PRIVATE order-operations queue, not a content delivery endpoint.
// Never check the proprietary Pine source into the public website repository.
const LIFETIME_PRODUCT_ID = "prod_UdkjbCFI5VHOxQ";
const LIFETIME_PRICE_ID = "price_1Tyg8eLAuZzjYekvdBXIQHU1";
let schemaReady: Promise<void> | undefined;

export async function ensureLifetimeFulfillmentSchema() {
  schemaReady ??= (async () => {
    await db()`
      create table if not exists os_lifetime_fulfillment (
        checkout_session_id text primary key,
        paid_event_id text not null,
        stripe_payment_intent_id text,
        amount_paid_cents integer not null,
        currency text not null,
        source_version text not null default '2026-10-28-archived-pro',
        status text not null default 'awaiting_source_review'
          check(status in ('awaiting_source_review','ready_to_send','delivered','delivery_failed','refunded','refund_review')),
        created_at timestamptz not null default now(),
        delivered_at timestamptz,
        refunded_at timestamptz
      )
    `;
    await db()`create index if not exists os_lifetime_fulfillment_status_idx on os_lifetime_fulfillment(status, created_at)`;
    await db()`create index if not exists os_lifetime_fulfillment_intent_idx on os_lifetime_fulfillment(stripe_payment_intent_id)`;
  })().catch((error) => { schemaReady = undefined; throw error; });
  return schemaReady;
}

function idOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return String(value.id);
  return "";
}

/**
 * Capture an unequivocally paid Lifetime order while preserving all current
 * Stripe/affiliate processing. An order here does NOT trigger an email:
 * the final published Pine version and an authenticated mailer must be
 * verified before private source delivery can safely be automated.
 *
 * Idempotent across retried and out-of-order Checkout webhooks.
 */
export async function captureLifetimeOrder(event: Stripe.Event) {
  if (!event.livemode) return;

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const intentId = idOf(charge.payment_intent);
    if (!intentId || !charge.amount_refunded || !charge.amount_captured) return;
    await ensureLifetimeFulfillmentSchema();
    const fullRefund = charge.amount_refunded >= charge.amount_captured;
    const nextStatus = fullRefund ? "refunded" : "refund_review";
    await db()`
      update os_lifetime_fulfillment
      set status = ${nextStatus},
          refunded_at = now()
      where stripe_payment_intent_id = ${intentId}
        and status <> 'refunded'
    `;
    return;
  }

  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return;
  const session = event.data.object as Stripe.Checkout.Session;
  if (!session.livemode || session.mode !== "payment" || session.payment_status !== "paid") return;
  if (!session.id || !idOf(session.payment_intent) || session.amount_total == null || session.amount_total <= 0) return;

  // Look at the actual Stripe line item, not an arbitrary title, email,
  // client_reference_id, customer metadata, or amount matching a sale.
  const items = await stripe().checkout.sessions.listLineItems(
    session.id,
    { limit: 100 },
    { timeout: 5000, maxNetworkRetries: 1 },
  );
  if (items.has_more) throw new Error("Lifetime fulfillment: unreviewed checkout line item pagination");
  const found = items.data.some(item => item.quantity && item.quantity > 0 &&
    item.price?.id === LIFETIME_PRICE_ID && idOf(item.price.product) === LIFETIME_PRODUCT_ID);
  if (!found) return;
  const intent = idOf(session.payment_intent);

  // Checkout events are not guaranteed to arrive in chronological order.
  // A refund may have completed before a delayed "checkout.session.completed"
  // event is processed. Read the CURRENT Stripe charge so an already-refunded
  // Lifetime order never enters the unrefunded manual delivery queue.
  const paymentIntent = await stripe().paymentIntents.retrieve(
    intent,
    { expand: ["latest_charge"] },
    { timeout: 7000, maxNetworkRetries: 1 },
  );
  if (paymentIntent.status !== "succeeded" || paymentIntent.amount_received <= 0) {
    throw Error("Lifetime fulfillment: payment intent is not settled");
  }
  const lastCharge = paymentIntent.latest_charge;
  const charge = lastCharge && typeof lastCharge !== "string" ? lastCharge : null;
  const initialStatus = lifetimeRefundStatus(
    charge?.amount_refunded,
    charge?.amount_captured,
  );

  await ensureLifetimeFulfillmentSchema();
  await db()`
    insert into os_lifetime_fulfillment (
      checkout_session_id, paid_event_id, stripe_payment_intent_id,
      amount_paid_cents, currency, status, refunded_at
    ) values (
      ${session.id}, ${event.id}, ${intent},
      ${session.amount_total}, ${session.currency || "usd"},
      ${initialStatus},
      ${initialStatus === "awaiting_source_review" ? null : new Date()}
    )
    on conflict (checkout_session_id) do nothing
  `;
}

export async function lifetimeQueueSnapshot() {
  await ensureLifetimeFulfillmentSchema();
  const sql = db();
  const rows = await sql`
    select checkout_session_id, stripe_payment_intent_id, amount_paid_cents, currency,
      status, source_version, created_at, delivered_at, refunded_at
    from os_lifetime_fulfillment order by created_at desc limit 100
  `;
  const counts = await sql`
    select status, count(*)::integer as count
    from os_lifetime_fulfillment group by status order by status
  `;
  return { counts, orders: rows, sourceSentAutomatically: false, sourceVersionVerifiedAgainstLiveTradingView: false };
}
