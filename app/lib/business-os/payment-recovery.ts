import {db} from "../affiliate-db";
import {stripe} from "../stripe";
import {queueOwnerNotice} from "./delivery";

export async function recordPaymentFailure(invoiceId:string,customerId:string,email:string){
 const sql=db();
 await sql`insert into os_payment_recovery(stripe_invoice_id,stripe_customer_id,customer_email)
 values(${invoiceId},${customerId||null},${email||null})
 on conflict(stripe_invoice_id) do update set last_failed_at=now(),stripe_customer_id=coalesce(excluded.stripe_customer_id,os_payment_recovery.stripe_customer_id),customer_email=coalesce(excluded.customer_email,os_payment_recovery.customer_email),status='failed',recovered_at=null`;
}
export async function recordPaymentRecovered(invoiceId:string){
 await db()`update os_payment_recovery set status='recovered',recovered_at=now() where stripe_invoice_id=${invoiceId} and status='failed'`;
}
export async function paymentRecoveryHealthIssues(){
 const sql=db(),issues:string[]=[];
 const [stale]=await sql`select count(*)::int n from os_payment_recovery where status='failed' and last_failed_at<now()-interval '24 hours'`;
 if(stale.n)issues.push(`${stale.n} failed renewal(s) remain unrecovered for more than 24 hours.`);
 return issues;
}
export async function reconcilePaymentRecovery(){
 const sql=db();
 const rows=await sql`select * from os_payment_recovery where status='failed' order by last_failed_at asc limit 10`;
 let recovered=0,escalated=0;
 for(const row of rows){
  try{
   const invoice=await stripe().invoices.retrieve(row.stripe_invoice_id,{expand:['payment_intent']},{timeout:5000,maxNetworkRetries:0});
   if(invoice.status==='paid'){await recordPaymentRecovered(row.stripe_invoice_id);recovered++;continue;}
   const age=Date.now()-new Date(row.first_failed_at).getTime();
   if(age>24*3600000 && (!row.last_notice_at || Date.now()-new Date(row.last_notice_at).getTime()>24*3600000)){
    await queueOwnerNotice(`payment-recovery:${row.stripe_invoice_id}:${row.notice_count+1}`,`PAYMENT RECOVERY NEEDS ATTENTION\nA Darth Algo renewal is still unpaid after 24 hours.\nCustomer: ${row.customer_email||row.stripe_customer_id||'unknown'}\nInvoice: ${row.stripe_invoice_id}\n\nStripe should remain the source of truth. Do not manually grant access unless payment is verified.`);
    await sql`update os_payment_recovery set last_notice_at=now(),notice_count=notice_count+1 where stripe_invoice_id=${row.stripe_invoice_id}`;escalated++;
   }
  }catch{}
 }
 return {checked:rows.length,recovered,escalated};
}
