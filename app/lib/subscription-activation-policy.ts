/**
 * Known live Stripe Checkout prices. Only these exact recurring products
 * qualify for a Darth Algo TradingView activation review.
 * This is a conservative private monitoring aid, NOT an access grant.
 */
export const monthlyPlans = {
  price_1TyfRJLAuZzjYekvDZhVu7GD: { product: "prod_UycgwPt0RlecEZ", name: "Swing" },
  price_1TyfO6LAuZzjYekvVTZjStmx: { product: "prod_Uycd58YOrTYNIe", name: "Scalper" },
  price_1TeSwbLAuZzjYekvgGYRpqjo: { product: "prod_UdkRkkaCbtk8oJ", name: "Pro" },
} as const;

export type MonthlyPlanName = "Swing" | "Scalper" | "Pro";

export function paidMonthlyPlan(
  lineItems: Array<{ price?: { id?: string; product?: string | { id?: string } } | null; quantity?: number | null }>,
): { productId: string; priceId: string; name: MonthlyPlanName } | null {
  if (lineItems.length !== 1) return null;
  const item = lineItems[0];
  const id = item?.price?.id;
  const known = id && Object.prototype.hasOwnProperty.call(monthlyPlans, id)
    ? monthlyPlans[id as keyof typeof monthlyPlans]
    : null;
  const product = item?.price?.product;
  const productId = typeof product === "string" ? product : product?.id;
  if (!known || item?.quantity !== 1 || productId !== known.product) return null;
  return { productId, priceId: id!, name: known.name };
}

export function checkoutTradingViewUsername(
  fields: Array<{ key?: string; type?: string; text?: { value?: string | null } | null }> | null | undefined,
): string | null {
  const values = (fields || []).filter(f => f.key === "tradingviewusername" && f.type === "text");
  if (values.length !== 1) return null;
  const raw = values[0].text?.value?.trim();
  // Refuse to infer permission from an unverified input or accept markup.
  return raw && /^[a-zA-Z0-9_.-]{3,64}$/.test(raw) ? raw : null;
}

/** Historical checkout evidence only; never an entitlement or revenue ledger. */
export function checkoutActivationEvidence(
  session: { status?: string | null; payment_status?: string; amount_total?: number | null },
  plan: MonthlyPlanName,
  subscription: { status: string; trial_start?: number | null; trial_end?: number | null },
): { kind: "paid_checkout" | "trial_checkout"; amountPaidCents: number; trialEndsAt: string | null } | null {
  const amount = session.amount_total;
  if (session.status !== "complete" || typeof amount !== "number" || !Number.isSafeInteger(amount)) return null;
  if (session.payment_status === "paid" && amount > 0) {
    return { kind: "paid_checkout", amountPaidCents: amount, trialEndsAt: null };
  }
  // Stripe emits both statuses for zero-total trial checkouts. Validate the live
  // subscription rather than treating a zero-dollar paid session as a sale.
  const start = subscription.trial_start, end = subscription.trial_end;
  if (amount !== 0 || !["paid", "no_payment_required"].includes(session.payment_status || "") ||
      plan !== "Swing" || subscription.status !== "trialing" ||
      typeof start !== "number" || !Number.isSafeInteger(start) || start <= 0 ||
      typeof end !== "number" || !Number.isSafeInteger(end) || end <= start ||
      !Number.isFinite(new Date(end * 1000).getTime())) return null;
  return { kind: "trial_checkout", amountPaidCents: 0, trialEndsAt: new Date(end * 1000).toISOString() };
}
