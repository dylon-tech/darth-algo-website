import {indicatorMarketEvidence} from "./indicator-research";
import {vidiqEvidence} from "./vidiq-research";
import { competitorEvidence } from "./competitor-research";
import { db } from "../affiliate-db";
import { stripe } from "../stripe";
import { summarizePayments, type PaymentRow } from "./payment-summary";
import { businessKnowledge } from "./knowledge";
import { checkoutConversions } from "./conversions";
import { creativePlaybookEvidence } from "./creative-playbook";
import {nativeRevenueEvidence} from './native-revenue-evidence';

export type Evidence = { id: string; status: "verified" | "unavailable"; checkedAt: string; scope: string; data: unknown; error?: string };

async function readSource(id: string, scope: string, read: () => Promise<unknown>): Promise<Evidence> {
  try { return { id, scope, status: "verified", checkedAt: new Date().toISOString(), data: await read() }; }
  catch { return { id, scope, status: "unavailable", checkedAt: new Date().toISOString(), data: null, error: "Source could not be read; no value inferred." }; }
}

export async function collectEvidence(): Promise<Evidence[]> {
  const nativeRevenue = nativeRevenueEvidence();
  const sources = await Promise.all([
    ...(process.env.AI_OS_INDICATOR_LAB_ENABLED==="true"?[indicatorMarketEvidence().catch(()=>({id:"indicator_market",status:"unavailable" as const,checkedAt:new Date().toISOString(),scope:"Market discovery unavailable.",data:null}))]:[]),
    readSource("content_workflows", "Saved media policy and latest publication observations. These are execution records, not a guarantee of future delivery or content performance.", async()=>await db()`select event,created_at,details - 'png' as details from os_activity where event in ('media_policy_enabled','buffer_publish_checked','instagram_carousel_draft_verified') order by id desc limit 6`),
    competitorEvidence().catch(()=>({id:"competitor_public_posts",status:"unavailable" as const,checkedAt:new Date().toISOString(),scope:"Public competitor source check unavailable.",data:null})),
    readSource("paid_conversion", "Live Stripe checkout sessions created in the last 30 days. Campaign-tagged initial paid checkouts and trial starts are separate. Coverage includes untagged sessions; no unique-customer count, click conversion rate, renewals or causation is inferred.", checkoutConversions),
    readSource("growth_30d", "Existing community tracking, last 30 days. Clicks are not purchases; no paid conversion attribution is inferred.", async () => {
      return await db()`select source,event_type,count(*)::int as events from community_growth_events where created_at >= now()-interval '30 days' group by source,event_type order by source,event_type`;
    }),
    readSource("buffer_publications_30d", "App-prepared X and Instagram posts created in the last 30 days, with their latest saved Buffer delivery observation. Counts are per approval, not per polling event. No live provider refresh, impressions, clicks, conversions or revenue are inferred. Unknown outcomes may have published; do not automatically repost them.", async () => {
      return await db()`with publications as (
        select a.id,a.status,a.expires_at,
          (select details from os_activity where entity_id=a.id::text and event in ('buffer_publish_started','buffer_publish_receipt','buffer_publish_checked','buffer_publish_unknown') order by id desc limit 1) as receipt
        from os_approvals a where a.payload->>'executor' in ('buffer_x_v1','buffer_instagram_v1','buffer_social_v2') and a.created_at>=now()-interval '30 days'
      ) select case when receipt->>'published'='true' then 'confirmed_published'
          when receipt is not null then coalesce(receipt->>'state','unknown')
          when status='pending' and expires_at<=now() then 'expired'
          else status end as state,count(*)::int as approvals,
          max(receipt->>'checkedAt') as last_provider_check
        from publications group by 1 order by 1`;
    }),
    readSource("x_campaign_events_30d", "Recorded X community event counts by campaign in the last 30 days. At most 100 campaign/event groups shown. Repeat events are not unique people; source/campaign are URL labels, not proof of attribution. No link between a Buffer post and a payment is verified.", async () => {
      const rows = await db()`select campaign,event_type,count(*)::int as events from community_growth_events where source='x' and created_at>=now()-interval '30 days' group by campaign,event_type order by campaign,event_type limit 101`;
      return { rows: rows.slice(0,100), truncated: rows.length>100, conversionAttribution: "unavailable" };
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
      const now = Math.floor(Date.now()/1000), cutoff = now - 30*86400;
      let endedLast30Days = 0, scheduledToCancel = 0;
      for (let page = 0; page < 10; page++) {
        const batch = await client.subscriptions.list({ status: "all", limit: 100, ...(after ? { starting_after: after } : {}) }, { timeout: 5000, maxNetworkRetries: 0 });
        for (const s of batch.data) {
          if (!s.livemode) throw new Error("Test-mode data is not business evidence");
          counts[s.status] = (counts[s.status] || 0) + 1; scanned++;
          if (s.ended_at && s.ended_at >= cutoff && s.ended_at <= now) endedLast30Days++;
          if (["active", "trialing"].includes(s.status) && (s.cancel_at_period_end || s.cancel_at)) scheduledToCancel++;
        }
        if (!batch.has_more) return { counts, scanned, complete: true, endedLast30Days, scheduledToCancel, periodStart: new Date(cutoff*1000).toISOString(), periodEnd: new Date(now*1000).toISOString(), limitation: "Ended subscriptions are not unique customers or a churn rate; scheduled cancellations can change." };
        after = batch.data.at(-1)?.id;
        if (!after) break;
      }
      throw new Error("Pagination incomplete");
    }),
    readSource("stripe_payments_60d", "Whole live Stripe account, successful PaymentIntents created in the last 30 days versus preceding 30 days. Amount received as of this check, in currency minor units, before refunds, disputes, fees and tax deductions. Creation date is not settlement date. Not profit, MRR, unique customers, product-specific revenue or acquisition attribution. Missing historical legacy payments are not inferred.", async () => {
      const client = stripe(), now = Math.floor(Date.now()/1000);
      const balance = await client.balance.retrieve({}, {timeout:5000,maxNetworkRetries:0});
      if (!balance.livemode) throw new Error("Test-mode account");
      const rows: PaymentRow[] = []; let after: string | undefined;
      for (let page=0; page<10; page++) {
        const batch = await client.paymentIntents.list({limit:100,created:{gte:now-60*86400,lt:now},...(after?{starting_after:after}:{})},{timeout:5000,maxNetworkRetries:0});
        rows.push(...batch.data.map(r=>({id:r.id,created:r.created,livemode:r.livemode,status:r.status,amount_received:r.amount_received,currency:r.currency})));
        if (!batch.has_more) return summarizePayments(rows,now);
        after=batch.data.at(-1)?.id; if (!after) break;
      }
      throw new Error("Pagination incomplete");
    }),
  ]);
  sources.push(...await nativeRevenue);
  sources.push({
    id: 'tradingview_fulfillment', status: "unavailable" as const, checkedAt: new Date().toISOString(), data: null,
    scope: "No verified read adapter connected in Phase 1. Historical setup and plans are not live evidence.",
  });
  if(process.env.AI_OS_INDICATOR_LAB_ENABLED==="true")sources.push(await vidiqEvidence());
  sources.push(businessKnowledge());
  sources.push(creativePlaybookEvidence());
  return sources;
}
