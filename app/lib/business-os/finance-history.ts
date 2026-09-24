import type {PaymentRow} from './payment-summary';
export type ChartPoint={at:string;value:number};
export type CustomerObservation={checkedAt:string;active:number|null};
const day=86400;
export function incomeHistory(rows:PaymentRow[],now:number):ChartPoint[]{
 const start=now-90*day,seen=new Set<string>(),values=Array<number>(90).fill(0);
 for(const row of rows){
  if(!row.livemode||seen.has(row.id))throw Error('INVALID_PAYMENT_EVIDENCE');
  seen.add(row.id);
  if(row.status!=='succeeded'||row.currency!=='usd'||row.created<start||row.created>=now)continue;
  if(!Number.isSafeInteger(row.amount_received)||row.amount_received<0)throw Error('INVALID_PAYMENT_AMOUNT');
  values[Math.floor((row.created-start)/day)]+=row.amount_received;
 }
 return values.map((value,i)=>({at:new Date((start+(i+1)*day)*1000).toISOString(),value}));
}
export function customerHistory(rows:CustomerObservation[],now=Date.now()):ChartPoint[]{
 const days=new Map<string,ChartPoint>();
 for(const row of rows){
  const at=Date.parse(row.checkedAt);
  if(row.active===null||!Number.isSafeInteger(row.active)||row.active<0||!Number.isFinite(at)||at>now+30000||at<now-90*day*1000)continue;
  const key=new Date(at).toISOString().slice(0,10),prior=days.get(key);
  if(!prior||at>Date.parse(prior.at))days.set(key,{at:new Date(at).toISOString(),value:row.active});
 }
 return [...days.values()].sort((a,b)=>a.at.localeCompare(b.at));
}
