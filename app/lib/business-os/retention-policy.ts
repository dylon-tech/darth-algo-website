export type SubscriptionEvidence={id:string;livemode:boolean;status:string;cancel_at_period_end?:boolean;latest_invoice?:string|null|{id?:string;status?:string|null;attempted?:boolean;amount_remaining:number;amount_paid:number;hosted_invoice_url?:string|null}};
export function retentionClassification(sub:SubscriptionEvidence){
 const invoice=typeof sub.latest_invoice==='object'?sub.latest_invoice:null;
 if(!sub.livemode)return {reason:null,state:'unverified',resolution:null,invoice:null};
 if(sub.status==='canceled'||sub.cancel_at_period_end)return {reason:'cancellation',state:'suppressed',resolution:'Cancellation recorded; no automatic payment outreach.',invoice};
 if(['past_due','unpaid'].includes(sub.status))return {reason:'failed_payment',state:'detected',resolution:null,invoice};
 if(['active','trialing'].includes(sub.status))return {reason:null,state:'resolved',resolution:sub.status==='trialing'?'Trial status observed; no paid recovery claimed.':'Subscription active; this alone does not prove payment or outreach recovery.',invoice};
 return {reason:null,state:'unverified',resolution:'Subscription state requires review; no outreach eligibility inferred.',invoice};
}
export function safeInvoiceUrl(value:unknown):string|null {
 if(typeof value!=='string')return null;
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='invoice.stripe.com'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export function paymentReminderDraft(sub:SubscriptionEvidence,email:unknown){
 const c=retentionClassification(sub),i=c.invoice,url=safeInvoiceUrl(i?.hosted_invoice_url);
 if(c.reason!=='failed_payment'||!i?.id||i.status!=='open'||i.attempted!==true||i.amount_remaining<=0||!url||typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return null;
 return {recipient:email,subject:'Your Darth Algo payment',body:`Hi,\n\nStripe reports an unpaid invoice for your Darth Algo subscription. You can review it securely here:\n${url}\n\nIf you have already resolved this or need help, please reply here. Never send payment-card details by email.\n\nDarth Algo Support`,invoiceId:i.id};
}
