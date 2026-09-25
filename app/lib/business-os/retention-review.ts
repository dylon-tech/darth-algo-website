import {createHash,randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {stripe} from '../stripe';
import {ensureRevenueOpsSchema} from './revenue-ops';
import {paymentReminderDraft} from './retention-policy';

export async function retentionReviewSnapshot(){
 await ensureRevenueOpsSchema();const sql=db();
 const [cases,sync]=await Promise.all([
  sql`select o.id,o.reason,o.status,o.details,o.updated_at,r.id as review_id,r.draft_hash,r.recipient,r.subject,r.body,r.state as review_state,r.eligibility,r.created_at as draft_created_at from os_retention_opportunities o left join lateral(select * from os_retention_reviews where opportunity_id=o.id order by created_at desc limit 1) r on true order by case when o.reason='failed_payment' and o.status in ('open','contact_ready') then 0 else 1 end,o.updated_at desc limit 60`,
  sql`select details,created_at from os_activity where event='retention_sync' order by id desc limit 1`,
 ]);
 return {checkedAt:new Date().toISOString(),cases,lastSync:sync[0]||null,sending:'Held: connected Gmail support is a separate workflow. No approved retention sender or controlled send test is recorded here.'};
}
// Produces a private, immutable draft. It never sends mail or grants consent.
export async function prepareRetentionReview(id:string){
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('INVALID_CASE');
 await ensureRevenueOpsSchema();const sql=db();
 const [row]=await sql`select * from os_retention_opportunities where id=${id}`;
 if(!row||row.reason!=='failed_payment'||!['open','contact_ready'].includes(row.status))throw Error('CASE_NOT_ELIGIBLE_FOR_REVIEW');
 const sub=await stripe().subscriptions.retrieve(row.subscription_id,{expand:['customer','latest_invoice']},{timeout:7000,maxNetworkRetries:0});
 const customer=typeof sub.customer==='object'&&!sub.customer.deleted?sub.customer:null;
 if(!customer||customer.id!==row.stripe_customer_id)throw Error('CUSTOMER_NOT_VERIFIED');
 const draft=paymentReminderDraft(sub,customer.email);
 if(!draft)throw Error('CURRENT_PAYMENT_DOES_NOT_SUPPORT_THIS_DRAFT');
 const hash=createHash('sha256').update(JSON.stringify(draft)).digest('hex');
 return sql.begin(async tx=>{
  const [current]=await tx`select status,details from os_retention_opportunities where id=${id} for update`;
  if(!current||!['open','contact_ready'].includes(current.status)||['suppressed','resolved'].includes(current.details.workflowState))throw Error('CASE_CHANGED');
  const eligibility={checkedAt:new Date().toISOString(),payment:'Current live open invoice; attempted and unpaid',emailHistory:'unverified',suppression:'unverified',supportConversation:'unverified',customerAccess:'unverified',sendAuthorization:false,nextAction:'Review this exact recipient and draft against Gmail sent/thread history, opt-outs, bounces and current access. A controlled consenting test and exact sending approval are required.'};
  const [saved]=await tx`insert into os_retention_reviews(id,opportunity_id,draft_hash,recipient,subject,body,invoice_id,eligibility) values(${randomUUID()},${id},${hash},${draft.recipient},${draft.subject},${draft.body},${draft.invoiceId},${tx.json(eligibility)}) on conflict(opportunity_id,draft_hash) do update set eligibility=excluded.eligibility,updated_at=now() returning id,draft_hash,state`;
  await tx`insert into os_activity(actor,event,entity_id,details) values('owner','retention_draft_saved',${id},${tx.json({reviewId:saved.id,hash,invoiceId:draft.invoiceId,sent:false})})`;
  return {saved:true,sent:false,...saved};
 });
}
