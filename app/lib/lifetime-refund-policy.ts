/**
 * Fail closed for any paid Lifetime purchase whose charge state is missing,
 * inconsistent, or partly/full refunded. No sending action is authorized here.
 */
export type LifetimeRefundStatus = "awaiting_source_review" | "refund_review" | "refunded";

export function lifetimeRefundStatus(
  amountRefunded: unknown,
  amountCaptured: unknown,
): LifetimeRefundStatus {
  if (
    typeof amountRefunded !== "number" ||
    typeof amountCaptured !== "number" ||
    !Number.isSafeInteger(amountRefunded) ||
    !Number.isSafeInteger(amountCaptured) ||
    amountCaptured <= 0 ||
    amountRefunded < 0 ||
    amountRefunded > amountCaptured
  ) return "refund_review";

  if (amountRefunded === 0) return "awaiting_source_review";
  if (amountRefunded === amountCaptured) return "refunded";
  return "refund_review";
}
