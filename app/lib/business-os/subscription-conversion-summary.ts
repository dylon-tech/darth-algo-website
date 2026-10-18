import {parseCampaignReference} from '../campaign-attribution';
import {acquisitionLabels} from '../acquisition-policy';
import type {CheckoutObservation} from './conversion-summary';
export function checkoutSubscriptionId(s:CheckoutObservation):string|null {const value=typeof s.subscription==='string'?s.subscription:s.subscription?.id;return typeof value==='string'&&value.length>0?value:null;}
export type InvoiceObservation={id:string;livemode:boolean;status:string|null;amount_paid:number;currency:string;created:number;paidAt:number|null;subscriptionId:string|null;billingReason:string|null};
// Input must include complete invoice history for each selected subscription.
// Earliest eligible recurring paid invoice is one subscription acquisition, never renewal.
export function summarizeSubscriptionConversions(sessions:CheckoutObservation[],invoices:InvoiceObservation[],start:number,end:number){
  const bySub=new Map<string,CheckoutObservation[]>();
  for(const s of sessions){if(!s.livemode)throw Error('TEST_CHECKOUT_NOT_EVIDENCE');const id=checkoutSubscriptionId(s);if(!id||s.status!=='complete'||!parseCampaignReference(s.client_reference_id))continue;const rows=bySub.get(id)||[];if(!rows.some(r=>r.id===s.id))rows.push(s);bySub.set(id,rows);}
  const seen=new Set<string>(),groups=new Map<string,{source:string;campaign:string;content:string;currency:string;firstPaidSubscriptions:number;trialToPaidSubscriptions:number;firstPaidInvoiceAmount:number}>();let ambiguousSubscriptions=0,renewalInvoicesExcluded=0,upfrontTrialInvoicesExcluded=0;
  for(const [id,rows] of bySub){
    if(rows.length!==1){ambiguousSubscriptions++;continue;}const session=rows[0],tag=parseCampaignReference(session.client_reference_id)!;
    let paid=invoices.filter(i=>{if(!i.livemode)throw Error('TEST_INVOICE_NOT_EVIDENCE');return i.subscriptionId===id&&i.status==='paid'&&Number.isSafeInteger(i.amount_paid)&&i.amount_paid>0;}).filter(i=>{if(seen.has(i.id))return false;seen.add(i.id);return true;}).sort((a,b)=>(a.paidAt??Infinity)-(b.paidAt??Infinity)||a.created-b.created);
    if(!paid.length)continue;if(paid.some(i=>i.paidAt===null)){ambiguousSubscriptions++;continue;}
    const trialStart=typeof session.subscription==='object'?session.subscription?.trial_start:null;
    const trialEnd=typeof session.subscription==='object'?session.subscription?.trial_end:null;
    const beganTrial=Boolean(trialStart&&Math.abs(trialStart-session.created)<3600);
    if(beganTrial){
      if(!trialEnd||!trialStart||trialEnd<=trialStart){ambiguousSubscriptions++;continue;}
      const recurring=paid.filter(i=>i.created>=trialEnd&&i.paidAt!>=trialEnd);
      upfrontTrialInvoicesExcluded+=paid.length-recurring.length;paid=recurring;
    }
    if(!paid.length)continue;const first=paid[0];renewalInvoicesExcluded+=paid.slice(1).filter(i=>i.paidAt!==null&&i.paidAt>=start&&i.paidAt<end).length;
    if(first.paidAt===null||paid.some((i,n)=>n>0&&i.paidAt===first.paidAt)){ambiguousSubscriptions++;continue;}
    // An old paid invoice prevents a later renewal being relabeled acquisition.
    if(first.paidAt<start||first.paidAt>=end||first.paidAt<session.created||first.created<session.created-3600||first.paidAt-session.created>=30*86400)continue;
    if(!['subscription_create','subscription_cycle'].includes(first.billingReason||'')||(beganTrial&&first.billingReason!=='subscription_cycle')){ambiguousSubscriptions++;continue;}
    const labels=acquisitionLabels(tag),key=JSON.stringify([labels.source,labels.campaign,labels.content,first.currency]);
    const group=groups.get(key)||{...labels,currency:first.currency,firstPaidSubscriptions:0,trialToPaidSubscriptions:0,firstPaidInvoiceAmount:0};group.firstPaidSubscriptions++;group.firstPaidInvoiceAmount+=first.amount_paid;
    if(beganTrial)group.trialToPaidSubscriptions++;
    groups.set(key,group);
  }
  return {groups:[...groups.values()],taggedSubscriptions:bySub.size,ambiguousSubscriptions,renewalInvoicesExcluded,upfrontTrialInvoicesExcluded,
    limitations:'First eligible recurring invoice marked paid per tagged subscription, not first-ever paid customer or verified new cash/net revenue. Includes tax and excludes refunds, disputes and fees. Can overlap initial paid checkout counts; never add the two. Only tagged sessions created in the last 30 days and payments within 30 days of Checkout are covered; missing historical attribution is not inferred.'};
}
