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
