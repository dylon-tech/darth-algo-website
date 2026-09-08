export type PaymentRow = { id: string; created: number; livemode: boolean; status: string; amount_received: number; currency: string };
export function summarizePayments(rows: PaymentRow[], now: number) {
 const cutoff = now - 30 * 86400, start = now - 60 * 86400;
 const buckets: Record<string, { current: number; previous: number; currentPayments: number; previousPayments: number }> = {};
 const seen = new Set<string>();
 for (const row of rows) {
  if (!row.livemode) throw new Error("Test data is not business evidence");
  if (seen.has(row.id)) throw new Error("Duplicate pagination record");
  seen.add(row.id);
  if (row.created < start || row.created >= now || row.status !== "succeeded") continue;
  if (!Number.isSafeInteger(row.amount_received) || row.amount_received < 0) throw new Error("Invalid amount");
  const bucket = buckets[row.currency] ||= {current:0,previous:0,currentPayments:0,previousPayments:0};
  if (row.created >= cutoff) { bucket.current += row.amount_received; bucket.currentPayments++; }
  else { bucket.previous += row.amount_received; bucket.previousPayments++; }
 }
 return { complete: true, periodEnd: new Date(now * 1000).toISOString(), currentStart: new Date(cutoff * 1000).toISOString(), previousStart: new Date(start * 1000).toISOString(), currencyMinorUnits: buckets, scanned: rows.length };
}
