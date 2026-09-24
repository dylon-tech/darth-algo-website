import {db} from '../affiliate-db';
import {stripe} from '../stripe';
import {customerSnapshot} from './ceo-scorecard';
import {summarizePayments,type PaymentRow} from './payment-summary';
import {expenseSummary,type Bill} from './ceo-home-model';
const vendors=['TradingView','Vercel','Neon','Buffer','OpenAI','ElevenLabs','GoDaddy'];
export const emptyBills:Bill[]=vendors.map(name=>({id:name.toLowerCase(),name,amountCents:null,cadence:'monthly',status:'unverified',source:'Amount and active billing not verified',verifiedAt:null}));
export async function readBills():Promise<Bill[]>{
 const rows=await db()`select distinct on(entity_id) entity_id,details from os_activity where event='company_bill_saved' order by entity_id,id desc limit 100`;
 const saved=rows.map(r=>r.details as Bill);
 return [...emptyBills.filter(b=>!saved.some(s=>s.id===b.id)),...saved];
}
export function validateBill(value:unknown):Bill{
 if(!value||typeof value!=='object')throw Error('INVALID_BILL');
 const b=value as Bill;
 if(!/^[a-z0-9-]{1,70}$/.test(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>100||!['monthly','annual','weekly'].includes(b.cadence)||!['confirmed','unverified','inactive'].includes(b.status)||!(b.amountCents===null||(Number.isSafeInteger(b.amountCents)&&b.amountCents>=0&&b.amountCents<=10000000))||(b.status==='confirmed'&&b.amountCents===null))throw Error('INVALID_BILL');
 return {id:b.id,name:b.name.trim(),amountCents:b.amountCents,cadence:b.cadence,status:b.status,source:'Owner-maintained company bill',verifiedAt:new Date().toISOString()};
}
export async function saveBill(value:unknown){const bill=validateBill(value),sql=db();await sql`insert into os_activity(actor,event,entity_id,details) values('owner','company_bill_saved',${bill.id},${sql.json(bill)})`;return bill;}
type Income={incomeCents:number|null;checkedAt:string;periodStart:string;periodEnd:string;otherCurrencies:string[];scope:string};
export async function incomeSnapshot():Promise<Income>{
 const sql=db(),now=Math.floor(Date.now()/1000);
 const [cached]=await sql`select details from os_activity where event='company_income_snapshot' and created_at>now()-interval '15 minutes' order by id desc limit 1`;
 if(cached)return cached.details as Income;
 const result:Income={incomeCents:null,checkedAt:new Date().toISOString(),periodStart:new Date((now-30*86400)*1000).toISOString(),periodEnd:new Date(now*1000).toISOString(),otherCurrencies:[],scope:'Successful live Stripe payments created in the last 30 days, before refunds, disputes, fees and tax. Whole Stripe account; not profit or MRR.'};
 try{
  const client=stripe();const balance=await client.balance.retrieve({},{timeout:3500,maxNetworkRetries:0});if(!balance.livemode)throw Error('LIVE_ONLY');
  const rows:PaymentRow[]=[];let after:string|undefined,complete=false;const deadline=Date.now()+14000;
  for(let page=0;page<10&&Date.now()<deadline;page++){
   const batch=await client.paymentIntents.list({limit:100,created:{gte:now-30*86400,lt:now},...(after?{starting_after:after}:{})},{timeout:3500,maxNetworkRetries:0});rows.push(...batch.data);
   if(!batch.has_more){complete=true;break;}after=batch.data.at(-1)?.id;if(!after)break;
  }
  if(!complete)throw Error('INCOMPLETE');const summary=summarizePayments(rows,now);
  result.incomeCents=summary.currencyMinorUnits.usd?.current??0;
  result.otherCurrencies=Object.keys(summary.currencyMinorUnits).filter(c=>c!=='usd');
 }catch{result.scope='Stripe income is unavailable. No amount has been inferred.';}
 await sql`insert into os_activity(actor,event,details) values('analytics','company_income_snapshot',${sql.json(result)})`;return result;
}
export async function companyFinances(){
 const [income,customers,bills]=await Promise.all([incomeSnapshot(),customerSnapshot(),readBills()]);
 return {income,customers,bills,expenses:expenseSummary(bills,income.incomeCents),billSync:'Owner-maintained ledger. No automatic bank or invoice sync is connected to this app.'};
}
