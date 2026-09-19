import { parseCampaignReference } from "../campaign-attribution";

export type CheckoutObservation = { id:string; livemode:boolean; created:number; status:string|null; payment_status:string; amount_total:number|null; currency:string|null; client_reference_id:string|null; mode:string; subscription?: string | {trial_start?:number|null} | null };
export function summarizeConversions(rows: CheckoutObservation[], start: number, end: number) {
  const seen=new Set<string>();
  const groups=new Map<string,{source:string;campaign:string;content:string;currency:string;checkoutSessions:number;completedSessions:number;paidCheckouts:number;initialAmountTotal:number;trialStarts:number;noInitialPayment:number}>();
  let scanned=0,tagged=0;
  for(const r of rows) {
    if(!r.livemode) throw new Error("TEST_CHECKOUT_NOT_EVIDENCE");
    if(seen.has(r.id) || r.created<start || r.created>=end) continue;
    seen.add(r.id);scanned++;
    const tag=parseCampaignReference(r.client_reference_id);
    if(!tag) continue;
    tagged++;
    const currency=r.currency || "unknown";
    const key=JSON.stringify([tag.source,tag.campaign,tag.content,currency]);
    const g=groups.get(key) || {...tag,currency,checkoutSessions:0,completedSessions:0,paidCheckouts:0,initialAmountTotal:0,trialStarts:0,noInitialPayment:0};
    g.checkoutSessions++;
    if(r.status==="complete") {
      g.completedSessions++;
      if(r.payment_status==="paid" && Number.isSafeInteger(r.amount_total) && r.amount_total!>0) {g.paidCheckouts++;g.initialAmountTotal+=r.amount_total!;}
      else if(r.payment_status==="no_payment_required" || (r.payment_status==="paid" && r.amount_total===0)) {
        g.noInitialPayment++;
        const trialStart=typeof r.subscription==="object" ? r.subscription?.trial_start : null;
        if(r.mode==="subscription" && trialStart && Math.abs(trialStart-r.created)<3600) g.trialStarts++;
      }
    }
    groups.set(key,g);
  }
  return {periodStart:new Date(start*1000).toISOString(),periodEnd:new Date(end*1000).toISOString(),scannedSessions:scanned,taggedSessions:tagged,untaggedSessions:scanned-tagged,groups:[...groups.values()],
    attribution:"Observed campaign labels carried to Stripe; labels are client-controlled, not proof of causation or verified clicks.",
    limitations:"Sessions are not unique customers. Initial paid checkout totals in currency minor units include tax and exclude later renewals, refunds, disputes and fees. A trial start is not a paid conversion. Cross-device journeys and untagged historical sessions are unknown; no click-to-purchase rate is computed."};
}
