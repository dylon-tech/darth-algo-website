import { stripe } from "../stripe";
import { parseCampaignReference } from "../campaign-attribution";
import { summarizeSubscriptionConversions, checkoutSubscriptionId, type InvoiceObservation } from "./subscription-conversion-summary";
import { summarizeConversions, type CheckoutObservation } from "./conversion-summary";

export async function checkoutConversions() {
  const client=stripe();
  const options={timeout:5000,maxNetworkRetries:0};
  const balance=await client.balance.retrieve({},options);
  if(!balance.livemode) throw new Error("TEST_MODE_NOT_EVIDENCE");
  const end=Math.floor(Date.now()/1000),start=end-30*86400;
  const rows:CheckoutObservation[]=[];
  let after:string|undefined;
  for(let page=0;page<5;page++) {
    const batch=await client.checkout.sessions.list({limit:100,created:{gte:start,lt:end},expand:["data.subscription"],...(after?{starting_after:after}:{})},options);
    rows.push(...batch.data as CheckoutObservation[]);
    if(!batch.has_more) return {...summarizeConversions(rows,start,end),subscriptionPayments:await subscriptionPayments(rows,start,end)};
    after=batch.data.at(-1)?.id;
    if(!after) break;
  }
  throw new Error("CHECKOUT_PAGINATION_INCOMPLETE");
}

async function subscriptionPayments(rows:CheckoutObservation[],start:number,end:number){
  try{
    const subscriptions=[...new Set(rows.filter(s=>s.status==='complete'&&parseCampaignReference(s.client_reference_id)).map(checkoutSubscriptionId).filter((id):id is string=>Boolean(id)))];
    if(subscriptions.length>20)throw Error('SUBSCRIPTION_READ_CAP');
    const invoices:InvoiceObservation[]=[];const client=stripe(),deadline=Date.now()+8000;
    for(const subscription of subscriptions){
      const remaining=deadline-Date.now();if(remaining<100)throw Error('INVOICE_READ_DEADLINE');
      const batch=await client.invoices.list({subscription,limit:100},{timeout:Math.min(3000,remaining),maxNetworkRetries:0});
      if(batch.has_more)throw Error('INVOICE_HISTORY_INCOMPLETE');
      for(const i of batch.data){if(!i.id)throw Error('INVOICE_ID_MISSING');invoices.push({id:i.id,livemode:i.livemode,status:i.status,amount_paid:i.amount_paid,currency:i.currency,created:i.created,paidAt:i.status_transitions.paid_at,subscriptionId:subscription,billingReason:i.billing_reason});}
    }
    return {status:'available',...summarizeSubscriptionConversions(rows,invoices,start,end)};
  }catch{return {status:'unavailable',groups:null,limitation:'Complete live invoice history could not be verified within the bounded read. No zero or trial-to-paid result inferred.'};}
}
