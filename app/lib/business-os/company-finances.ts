import {db} from '../affiliate-db';
import {stripe} from '../stripe';
import {customerSnapshot} from './ceo-scorecard';
import {summarizePayments,type PaymentRow} from './payment-summary';
import {expenseSummary,type Bill} from './ceo-home-model';
import {mergeBillEstimates} from './bill-estimates';
import {incomeHistory,customerHistory,type ChartPoint,type CustomerObservation} from './finance-history';
export async function readBills():Promise<Bill[]>{
 const rows=await db()`select distinct on(entity_id) entity_id,details from os_activity where event='company_bill_saved' order by entity_id,id desc limit 100`;
 const saved=rows.map(r=>r.details as Bill);
 return mergeBillEstimates(saved);
}
export function validateBill(value:unknown):Bill{
 if(!value||typeof value!=='object')throw Error('INVALID_BILL');
 const b=value as Bill;
 if(!/^[a-z0-9-]{1,70}$/.test(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>100||!['monthly','annual','weekly'].includes(b.cadence)||!['confirmed','estimated','unverified','inactive'].includes(b.status)||!(b.amountCents===null||(Number.isSafeInteger(b.amountCents)&&b.amountCents>=0&&b.amountCents<=10000000))||(['confirmed','estimated'].includes(b.status)&&b.amountCents===null))throw Error('INVALID_BILL');
 return {id:b.id,name:b.name.trim(),amountCents:b.amountCents,cadence:b.cadence,status:b.status,source:b.status==='estimated'?'Owner-adjusted estimate':'Owner-maintained company bill',verifiedAt:b.status==='confirmed'?new Date().toISOString():null,...(b.status==='estimated'?{estimatedAt:new Date().toISOString()}: {})};
}
export async function saveBill(value:unknown){const bill=validateBill(value),sql=db();await sql`insert into os_activity(actor,event,entity_id,details) values('owner','company_bill_saved',${bill.id},${sql.json(bill)})`;return bill;}
type Income={incomeCents:number|null;checkedAt:string;periodStart:string;periodEnd:string;otherCurrencies:string[];scope:string;history:ChartPoint[]|null};
export async function incomeSnapshot():Promise<Income>{
 const sql=db(),now=Math.floor(Date.now()/1000);
 const [cached]=await sql`select details from os_activity where event='company_income_snapshot_v2' and created_at>now()-interval '15 minutes' order by id desc limit 1`;
 if(cached)return cached.details as Income;
 const result:Income={incomeCents:null,checkedAt:new Date().toISOString(),periodStart:new Date((now-30*86400)*1000).toISOString(),periodEnd:new Date(now*1000).toISOString(),otherCurrencies:[],history:null,scope:'Successful live Stripe payments by creation date, before refunds, disputes, fees and tax. Whole Stripe account; USD only. Not profit or MRR. Chart uses 24-hour buckets ending at the last check; dates are UTC.'};
 try{
  const client=stripe();const balance=await client.balance.retrieve({},{timeout:3500,maxNetworkRetries:0});if(!balance.livemode)throw Error('LIVE_ONLY');
  const rows:PaymentRow[]=[];let after:string|undefined,complete=false;const deadline=Date.now()+14000;
  for(let page=0;page<10&&Date.now()<deadline;page++){
   const batch=await client.paymentIntents.list({limit:100,created:{gte:now-90*86400,lt:now},...(after?{starting_after:after}:{})},{timeout:3500,maxNetworkRetries:0});rows.push(...batch.data);
   if(!batch.has_more){complete=true;break;}after=batch.data.at(-1)?.id;if(!after)break;
  }
  if(!complete)throw Error('INCOMPLETE');const summary=summarizePayments(rows,now);
  const history=incomeHistory(rows,now);
  result.incomeCents=summary.currencyMinorUnits.usd?.current??0;result.history=history;
  result.otherCurrencies=[...new Set(rows.filter(r=>r.status==='succeeded'&&r.currency!=='usd').map(r=>r.currency))];
 }catch{result.scope='Stripe income is unavailable. No amount has been inferred.';}
 await sql`insert into os_activity(actor,event,details) values('analytics','company_income_snapshot_v2',${sql.json(result)})`;return result;
}
export async function companyFinances(){
 const [income,customers,bills]=await Promise.all([incomeSnapshot(),customerSnapshot(),readBills()]);
 let observations:ChartPoint[]|null=null;
 try{
  const history=await db()`select distinct on ((created_at at time zone 'UTC')::date) details from os_activity where event='ceo_customer_snapshot' and created_at>now()-interval '90 days' and details->>'active' is not null order by (created_at at time zone 'UTC')::date,created_at desc,id desc limit 91`;
  observations=customerHistory([...history.map(r=>r.details as CustomerObservation),customers]);
 }catch{/* Historical failure does not erase current figures. */}
 return {income,customers,customerHistory:observations,bills,expenses:expenseSummary(bills,income.incomeCents),billSync:'Prefilled planning estimates for known tools; saved company bills take priority. Actual invoices, taxes, overages and unlisted subscriptions are not synced.'};
}
