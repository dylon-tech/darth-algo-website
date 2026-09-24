import {db} from '../affiliate-db';
import type {Evidence} from './sources';

export const supportScope='Native app support ledger only, all recorded cases. An empty ledger means no cases were ingested here, not an empty Gmail/social inbox or verified provider connection. Aggregate counts only; no customer identities or message bodies. Reading this source does not send replies.';
export const retentionScope='Native persisted retention opportunities, not unique customers, a churn rate or a full Stripe reconciliation. The existing sync samples at most the latest 100 subscriptions; older ledger rows may be stale. Last-sync time/status and ledger timestamps are supplied separately. contact_ready is a saved workflow label, not consent, a send receipt or authorization to contact. No customer identities, offers or new provider actions are exposed.';

async function read(id:string,scope:string,work:()=>Promise<unknown>):Promise<Evidence>{
 try{return {id,scope,status:'verified',checkedAt:new Date().toISOString(),data:await work()};}
 catch{return {id,scope,status:'unavailable',checkedAt:new Date().toISOString(),data:null,error:'Native ledger could not be read; no value inferred.'};}
}

export function nativeRevenueEvidence():Promise<Evidence[]>{
 return Promise.all([
  read('support_cases',supportScope,async()=>{
   const sql=db();
   const [totals]=await sql`select count(*)::int as recorded_cases,count(*) filter(where status in ('open','escalated'))::int as open_cases,count(*) filter(where requires_founder and status in ('open','escalated'))::int as needs_owner,max(last_message_at) as last_recorded_message_at from os_support_conversations`;
   const rows=await sql`select status,count(*)::int as recorded_cases from os_support_conversations group by status order by status`;
   return {coverage:'native_ledger_only',providerInboxCoverage:'unavailable',...totals,byStatus:Array.from(rows)};
  }),
  read('retention',retentionScope,async()=>{
   const sql=db();
   const [totals]=await sql`select count(*)::int as recorded_opportunities,max(updated_at) as last_ledger_update_at from os_retention_opportunities`;
   const rows=await sql`select status,count(*)::int as recorded_opportunities from os_retention_opportunities group by status order by status`;
   const [lastSync]=await sql`select created_at as recorded_at,details->>'status' as status,details->>'checkedAt' as checked_at from os_activity where event='retention_sync' order by id desc limit 1`;
   return {coverage:'partial_persisted_ledger',subscriptionScanLimit:100,uniqueCustomerCount:null,churnRate:null,...totals,byStatus:Array.from(rows),lastSync:lastSync||null};
  }),
 ]);
}
