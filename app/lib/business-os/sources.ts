import { db } from "../affiliate-db";
import { stripe } from "../stripe";
import { businessKnowledge } from "./knowledge";

export type Evidence = { id: string; status: "verified" | "unavailable"; checkedAt: string; scope: string; data: unknown; error?: string };

async function readSource(id: string, scope: string, read: () => Promise<unknown>): Promise<Evidence> {
  try { return { id, scope, status: "verified", checkedAt: new Date().toISOString(), data: await read() }; }
  catch { return { id, scope, status: "unavailable", checkedAt: new Date().toISOString(), data: null, error: "Source could not be read; no value inferred." }; }
}

export async function collectEvidence(): Promise<Evidence[]> {
  const sources = await Promise.all([
    readSource("growth_30d", "Existing community tracking, last 30 days. Clicks are not purchases; no paid conversion attribution is inferred.", async () => {
      return await db()`select source,event_type,count(*)::int as events from community_growth_events where created_at >= now()-interval '30 days' group by source,event_type order by source,event_type`;
    }),
    readSource("affiliate_ledger", "Existing recorded commissions by currency/status, all time; not total business revenue or current payout authorization.", async () => {
      return await db()`select currency,status,count(*)::int as commissions,sum(commission_cents)::text as commission_cents from affiliate_commissions group by currency,status`;
    }),
    readSource("affiliate_applications", "Existing application counts by status; no customer identities included.", async () => {
      return await db()`select status,count(*)::int as applications from affiliate_applications group by status`;
    }),
    readSource("stripe_subscriptions", "Current live Stripe subscription counts, not paying-customer counts or MRR. Whole-account scope; no product-specific assumption.", async () => {
      const client = stripe();
      // Check mode independently of subscription rows: an empty test account
      // must never become a verified zero-subscription business snapshot.
      const balance = await client.balance.retrieve({}, { timeout: 5000, maxNetworkRetries: 0 });
      if (!balance.livemode) throw new Error("Test-mode account is not business evidence");
      const counts: Record<string, number> = {};
      let after: string | undefined;
      let scanned = 0;
      for (let page = 0; page < 10; page++) {
        const batch = await client.subscriptions.list({ status: "all", limit: 100, ...(after ? { starting_after: after } : {}) }, { timeout: 5000, maxNetworkRetries: 0 });
        for (const s of batch.data) {
          if (!s.livemode) throw new Error("Test-mode data is not business evidence");
          counts[s.status] = (counts[s.status] || 0) + 1; scanned++;
        }
        if (!batch.has_more) return { counts, scanned, complete: true };
        after = batch.data.at(-1)?.id;
        if (!after) break;
      }
      throw new Error("Pagination incomplete");
    }),
  ]);
  sources.push(...["tradingview_fulfillment", "content_workflows", "support_cases", "retention", "paid_conversion"].map(id => ({
    id, status: "unavailable" as const, checkedAt: new Date().toISOString(), data: null,
    scope: "No verified read adapter connected in Phase 1. Historical setup and plans are not live evidence.",
  })));
  sources.push(businessKnowledge());
  return sources;
}
