import type Stripe from 'stripe';
import {db} from '../affiliate-db';
import {stripe} from '../stripe';
import {monthlyPlans,checkoutTradingViewUsername} from '../subscription-activation-policy';

export const founderFinanceVersion='DA-FINANCE-20261112-v1';
const DAY=86400;
const productPlans:Record<string,string>=Object.fromEntries(Object.values(monthlyPlans).map(p=>[p.product,p.name]));
productPlans.prod_UdkjbCFI5VHOxQ='Lifetime';
const idOf=(v:unknown):string=>typeof v==='string'?v:v&&typeof v==='object'&&'id' in v?String(v.id):'';
const iso=(n:number|null|undefined)=>n&&Number.isFinite(n)?new Date(n*1000).toISOString():null;
const finiteAmount=(n:unknown):n is number=>Number.isSafeInteger(n)&&Number(n)>=0;
export type FinancePeriod='30d'|'90d'|'all';
type SourceName='subscriptions'|'invoices'|'sessions'|'charges'|'refunds'|'balances';
type Coverage=Record<SourceName,boolean>;
type Preview={amountDue:number;currency:string;endingBalance:number|null;taxCents:number;checkedAt:string};
type AccessRecord={subscription_id:string;tradingview_username:string|null;status:string;access_verified_at:string|null};
export type FinanceEvidence={subscriptions:Stripe.Subscription[];invoices:Stripe.Invoice[];sessions:Stripe.Checkout.Session[];charges:Stripe.Charge[];refunds:Stripe.Refund[];balances:Stripe.BalanceTransaction[];coverage:Coverage;previews:Record<string,Preview|null>;accessRecords:AccessRecord[];now:number;period:FinancePeriod};
export type CustomerPayment={id:string;at:string;amountCents:number;refundedCents:number;currency:string;plan:string;sourceUrl:string};
export type CustomerSubscription={id:string;plan:string;status:string;currency:string;amountCents:number|null;cadence:string;nextChargeAt:string|null;paidThrough:string|null;cancelAtPeriodEnd:boolean;cancelAt:string|null;billingUrl:string};
export type ExpectedAccess={plan:string;sourceId:string;expiresAt:string|null;kind:'paid'|'trial'|'lifetime'|'review'};
export type FounderCustomer={id:string;name:string;email:string|null;tradingViewUsername:string|null;usernameStatus:'recorded'|'conflict'|'unavailable';plans:string[];status:string;subscriptions:CustomerSubscription[];access:{expected:ExpectedAccess[];confirmed:'unknown';lastVerifiedAt:string|null;note:string};payments:CustomerPayment[];billingUrl:string|null;identityStatus:string};
export type FounderFinance=ReturnType<typeof buildFounderFinance>;
function unique<T extends {id?:string}>(rows:T[]):T[]{
 const found=new Map<string,T>();
 for(const row of rows){if(!row.id)throw Error('SOURCE_ID_REQUIRED');const prior=found.get(row.id);if(prior&&JSON.stringify(prior)!==JSON.stringify(row))throw Error('CONFLICTING_SOURCE_OBJECT');found.set(row.id,row);}
 return [...found.values()];
}
function knownProduct(id:string){return Object.prototype.hasOwnProperty.call(productPlans,id);}
function invoiceProduct(line:Stripe.InvoiceLineItem){return line.pricing?.price_details?.product||idOf((line as unknown as {price?:{product?:unknown}}).price?.product);}
function subscriptionId(invoice:Stripe.Invoice){return idOf(invoice.parent?.subscription_details?.subscription)||idOf((invoice as unknown as {subscription?:unknown}).subscription);}
function invoicePaymentIds(invoice:Stripe.Invoice){
 const result=(invoice.payments?.data||[]).filter(p=>p.status==='paid'&&p.livemode).map(p=>idOf(p.payment.payment_intent)||idOf(p.payment.charge));
 const legacy=invoice as unknown as {payment_intent?:unknown;charge?:unknown};
 return [...new Set([...result,idOf(legacy.payment_intent),idOf(legacy.charge)].filter(Boolean))];
}
function isKnownInvoice(invoice:Stripe.Invoice){return invoice.livemode&&!invoice.lines.has_more&&invoice.lines.data.length>0&&invoice.lines.data.every(l=>knownProduct(invoiceProduct(l)));}
function monthlyFactor(interval:string,count:number){if(!Number.isInteger(count)||count<1)return null;return interval==='month'?1/count:interval==='year'?1/(12*count):interval==='week'?52/(12*count):interval==='day'?365/(12*count):null;}
function couponAmount(base:number,discounts:Array<string|Stripe.Discount>,currency:string,at:number,includeOnce:boolean):number|null{
 let amount=base;
 for(const d of discounts){
  if(typeof d==='string'||!d.coupon)return null;
  if(d.start>at||(d.end&&d.end<=at)||(!includeOnce&&d.coupon.duration==='once'))continue;
  if(d.coupon.applies_to?.products?.length)return null; // Product-specific allocation needs invoice evidence.
  if(d.coupon.percent_off!=null)amount=Math.round(amount*(1-d.coupon.percent_off/100));
  else if(d.coupon.amount_off!=null){if(d.coupon.currency!==currency)return null;amount=Math.max(0,amount-d.coupon.amount_off);}
  else return null;
 }
 return amount;
}
/** This calculation does not infer a paid subscription from status alone. */
export function recurringAmount(sub:Stripe.Subscription,at:number):{amountCents:number|null;mrrCents:number|null;currency:string;interval:string;count:number;reason:string|null}{
 const items=sub.items.data,first=items[0];
 const currency=first?.price.currency||sub.currency||'usd',interval=first?.price.recurring?.interval||'',count=first?.price.recurring?.interval_count||1;
 const unavailable=(reason:string)=>({amountCents:null,mrrCents:null,currency,interval,count,reason});
 if(sub.items.has_more||!items.length||items.some(i=>!knownProduct(idOf(i.price.product))))return unavailable('Mixed or incomplete product items');
 if(items.some(i=>i.price.currency!==currency||i.price.recurring?.interval!==interval||i.price.recurring?.interval_count!==count))return unavailable('Mixed recurring intervals or currencies');
 let amount=0;
 for(const item of items){
  if(item.price.type!=='recurring'||item.price.recurring?.usage_type!=='licensed'||item.price.billing_scheme!=='per_unit'||item.price.tax_behavior==='inclusive'||!finiteAmount(item.price.unit_amount)||!finiteAmount(item.quantity))return unavailable('Variable, inclusive-tax, or incomplete price');
  const adjusted=couponAmount(item.price.unit_amount*item.quantity,item.discounts||[],currency,at,false);
  if(adjusted===null)return unavailable('Item discount details unavailable');amount+=adjusted;
 }
 const adjusted=couponAmount(amount,sub.discounts||[],currency,at,false),factor=monthlyFactor(interval,count);
 if(adjusted===null||factor===null)return unavailable('Subscription discount or interval unavailable');
 return {amountCents:adjusted,mrrCents:adjusted*factor,currency,interval,count,reason:null};
}
/** Preserve an original calendar anchor, including Jan 31 -> Feb 28 -> Mar 31. */
export function recurringDate(anchor:number,interval:string,count:number,index:number){
 if(interval==='day'||interval==='week')return anchor+index*count*DAY*(interval==='week'?7:1);
 const date=new Date(anchor*1000),day=date.getUTCDate();date.setUTCDate(1);
 if(interval==='month')date.setUTCMonth(date.getUTCMonth()+index*count);else if(interval==='year')date.setUTCFullYear(date.getUTCFullYear()+index*count);else return NaN;
 const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,end));return date.getTime()/1000;
}
export function forecastSubscription(sub:Stripe.Subscription,preview:Preview|null|undefined,now:number,days:number){
 if(!['active','past_due'].includes(sub.status)||sub.cancel_at_period_end)return {amountCents:0,atRiskCents:0,complete:true,reason:null};
 if(sub.pause_collection||sub.schedule||sub.pending_update)return {amountCents:0,atRiskCents:0,complete:false,reason:'Paused collection or changing subscription schedule requires review'};
 const current=recurringAmount(sub,now),end=Math.min(...sub.items.data.map(i=>i.current_period_end));
 if(!Number.isFinite(end)||end<=now||current.amountCents===null)return {amountCents:0,atRiskCents:0,complete:false,reason:current.reason||'Billing date unavailable'};
 let amount=0;
 for(let index=0;index<400;index++){
  const due=recurringDate(end,current.interval,current.count,index);
  if(due>=now+days*DAY||(sub.cancel_at&&due>=sub.cancel_at))break;
  if(!preview||preview.currency!==current.currency)return {amountCents:0,atRiskCents:0,complete:false,reason:'Upcoming invoice preview unavailable'};
  const future=recurringAmount(sub,due);
  if(index>0&&(future.amountCents===null||preview.endingBalance||preview.taxCents!==0))return {amountCents:0,atRiskCents:0,complete:false,reason:'Future tax, credit, or pricing assumptions are not resolved'};
  amount+=index===0?preview.amountDue:future.amountCents!;
 }
 return {amountCents:amount,atRiskCents:sub.status==='past_due'?amount:0,complete:true,reason:null};
}
function easternDay(at:number){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at*1000));}
export function buildFounderFinance(input:FinanceEvidence){
 const {now,period,coverage}=input,start=period==='all'?0:now-(period==='90d'?90:30)*DAY;
 const checkedAt=new Date(now*1000).toISOString(),issues:string[]=[];
 const subscriptions=unique(input.subscriptions).filter(s=>s.livemode&&s.items.data.some(i=>knownProduct(idOf(i.price.product))));
 const invoices=unique(input.invoices),sessions=unique(input.sessions),charges=unique(input.charges),refunds=unique(input.refunds),balances=unique(input.balances);
 const customers=new Map<string,FounderCustomer>();
 const getCustomer=(id:string,name:string|null,email:string|null)=>{
  let c=customers.get(id);if(!c){c={id,name:name||email||'Customer',email:email||null,tradingViewUsername:null,usernameStatus:'unavailable',plans:[],status:'inactive',subscriptions:[],access:{expected:[],confirmed:'unknown',lastVerifiedAt:null,note:'Current TradingView access has not been read from the provider. Billing evidence is separate from access.'},payments:[],billingUrl:id.startsWith('cus_')?`https://dashboard.stripe.com/customers/${encodeURIComponent(id)}`:null,identityStatus:id.startsWith('cus_')?'Stripe customer ID; duplicate emails are not merged automatically':'Guest checkout; customer identity needs linking'};customers.set(id,c);}else{if(!c.email&&email)c.email=email;if(c.name==='Customer'&&name)c.name=name;}return c;
 };
 type Attribution={customerId:string;plan:string;amount:number;tax:number|null;source:string;paidThrough:number|null;subId:string|null;lifetime:boolean;username:string|null};
 const byPayment=new Map<string,Attribution>();let attributionComplete=coverage.invoices&&coverage.sessions;
 const paidThrough=new Map<string,number>(),refundReview=new Set<string>();
 for(const invoice of invoices){
  if(invoice.livemode&&invoice.amount_paid>0&&(invoice.lines.has_more||(invoice.lines.data.some(l=>knownProduct(invoiceProduct(l)))&&!invoice.lines.data.every(l=>knownProduct(invoiceProduct(l))))))attributionComplete=false;
  if(!isKnownInvoice(invoice))continue;
  const cid=idOf(invoice.customer);if(!cid)continue;
  getCustomer(cid,invoice.customer_name,invoice.customer_email);
  if(invoice.payments?.has_more||(invoice.amount_paid>0&&!invoicePaymentIds(invoice).length))attributionComplete=false;
  const sid=subscriptionId(invoice),end=Math.max(0,...invoice.lines.data.map(l=>l.period.end)),plan=[...new Set(invoice.lines.data.map(l=>productPlans[invoiceProduct(l)]))].join(' + ');
  const data:Attribution={customerId:cid,plan,amount:invoice.total,tax:invoice.total_excluding_tax===null?null:invoice.total-invoice.total_excluding_tax,source:invoice.id!,paidThrough:end||null,subId:sid||null,lifetime:invoice.lines.data.some(l=>productPlans[invoiceProduct(l)]==='Lifetime'),username:null};
  for(const pid of invoicePaymentIds(invoice)){const prior=byPayment.get(pid);if(prior&&prior.source!==invoice.id){attributionComplete=false;continue;}byPayment.set(pid,data);}
 }
 for(const session of sessions){
  if(!session.livemode||session.mode!=='payment'||session.payment_status!=='paid'||!session.amount_total)continue;
  if(!session.line_items||session.line_items.has_more){attributionComplete=false;continue;}
  if(session.line_items.data.some(l=>knownProduct(idOf(l.price?.product)))&&!session.line_items.data.every(l=>knownProduct(idOf(l.price?.product))))attributionComplete=false;
  if(!session.line_items.data.length||!session.line_items.data.every(l=>knownProduct(idOf(l.price?.product))))continue;
  const cid=idOf(session.customer)||`checkout:${session.id}`;
  getCustomer(cid,session.customer_details?.name||null,session.customer_details?.email||session.customer_email||null);
  const pid=idOf(session.payment_intent);if(!pid)continue;
  const data:Attribution={customerId:cid,plan:[...new Set(session.line_items.data.map(l=>productPlans[idOf(l.price?.product)]))].join(' + '),amount:session.amount_total,tax:session.total_details?.amount_tax??null,source:session.id,paidThrough:null,subId:null,lifetime:session.line_items.data.some(l=>productPlans[idOf(l.price?.product)]==='Lifetime'),username:checkoutTradingViewUsername(session.custom_fields)};
  // An invoice and Checkout Session may describe the same cash receipt. Prefer the invoice.
  if(!byPayment.has(pid))byPayment.set(pid,data);
 }
 const knownCharges=new Set<string>(),knownRefunds=new Set<string>(),currencies=new Set<string>();let gross=0,tax=0,taxComplete=true,refundTotal=0,unknownCharges=0;
 const trend=new Map<string,number>(),cashEntries:CustomerPayment[]=[],paidIdentities=new Set<string>(),lifetimeIdentities=new Set<string>();
 for(const charge of charges){
  if(charge.created>=now||!charge.livemode||!charge.paid||charge.status!=='succeeded'||!charge.captured||!finiteAmount(charge.amount_captured)||!charge.amount_captured)continue;
  const source=byPayment.get(idOf(charge.payment_intent))||byPayment.get(charge.id);if(!source){if(charge.created>=start&&charge.created<now)unknownCharges++;continue;}
  const c=getCustomer(source.customerId,charge.billing_details.name,charge.billing_details.email);knownCharges.add(charge.id);currencies.add(charge.currency);paidIdentities.add(c.id);
  const payment={id:charge.id,at:iso(charge.created)!,amountCents:charge.amount_captured,refundedCents:charge.amount_refunded,currency:charge.currency,plan:source.plan,sourceUrl:`https://dashboard.stripe.com/payments/${encodeURIComponent(idOf(charge.payment_intent)||charge.id)}`};c.payments.push(payment);c.plans.push(source.plan);
  if(source.username){if(c.tradingViewUsername&&c.tradingViewUsername!==source.username)c.usernameStatus='conflict';else{c.tradingViewUsername=source.username;c.usernameStatus='recorded';}}
  if(source.subId&&source.paidThrough&&charge.amount_refunded<charge.amount_captured){paidThrough.set(source.subId,Math.max(paidThrough.get(source.subId)||0,source.paidThrough));if(charge.amount_refunded>0)refundReview.add(source.subId);}
  if(source.lifetime&&charge.amount_refunded<charge.amount_captured){
   c.access.expected.push({plan:'Pro Lifetime',sourceId:source.source,expiresAt:null,kind:charge.amount_refunded?'review':'lifetime'});
   if(!charge.amount_refunded)lifetimeIdentities.add(c.id);
  }
  if(charge.created<start||charge.created>=now)continue;
  cashEntries.push(payment);
  if(charge.currency!=='usd')continue;
  gross+=charge.amount_captured;
  if(source.tax===null||source.amount!==charge.amount_captured)taxComplete=false;
  else {tax+=source.tax;const date=easternDay(charge.created);trend.set(date,(trend.get(date)||0)+charge.amount_captured-source.tax);}
 }
 for(const refund of refunds){
  if(refund.status!=='succeeded'||!knownCharges.has(idOf(refund.charge)))continue;
  knownRefunds.add(refund.id);if(refund.created>=start&&refund.created<now&&refund.currency==='usd')refundTotal+=refund.amount;
 }
 let net=0,fees=0,netComplete=coverage.balances;
 for(const transaction of balances){
  if(transaction.created<start||transaction.created>=now||transaction.currency!=='usd')continue;
  const source=transaction.source,sid=idOf(source),sourceCharge=source&&typeof source==='object'&&'charge' in source?idOf(source.charge):'';
  if(knownCharges.has(sid)||knownRefunds.has(sid)||knownCharges.has(sourceCharge)){net+=transaction.net;fees+=transaction.fee;}
  else if(transaction.type==='adjustment'&&(!source||typeof source==='string'))netComplete=false;
 }
 let mrr=0,atRiskMrr=0,mrrComplete=coverage.subscriptions;const recurringIdentities=new Set<string>(),trialIdentities=new Set<string>();
 const forecast=[30,90,365].map(days=>({days,amountCents:0 as number|null,atRiskCents:0 as number|null,status:'estimated' as 'estimated'|'unavailable',assumptions:'Existing customers only, successful collection and unchanged terms. First billing uses an upcoming invoice preview; later billings are estimates. Trials and Lifetime excluded.',issues:[] as string[]}));
 for(const sub of subscriptions){
  const customer=typeof sub.customer==='object'&&!('deleted'in sub.customer)?sub.customer:null,cid=idOf(sub.customer);if(!cid)continue;
  const c=getCustomer(cid,customer?.name||null,customer?.email||null),plans=[...new Set(sub.items.data.filter(i=>knownProduct(idOf(i.price.product))).map(i=>productPlans[idOf(i.price.product)]))],terms=recurringAmount(sub,now);
  c.plans.push(...plans);currencies.add(terms.currency);
  const due=Math.min(...sub.items.data.map(i=>i.current_period_end)),paid=paidThrough.get(sub.id)||null;
  c.subscriptions.push({id:sub.id,plan:plans.join(' + '),status:sub.status,currency:terms.currency,amountCents:terms.amountCents,cadence:`${terms.count>1?terms.count+' ':''}${terms.interval||'unknown'}`,nextChargeAt:!sub.cancel_at_period_end&&['active','past_due','trialing'].includes(sub.status)?iso(due):null,paidThrough:iso(paid),cancelAtPeriodEnd:sub.cancel_at_period_end,cancelAt:iso(sub.cancel_at),billingUrl:`https://dashboard.stripe.com/subscriptions/${encodeURIComponent(sub.id)}`});
  if(paid&&paid>now)for(const plan of plans)c.access.expected.push({plan,sourceId:sub.id,expiresAt:iso(paid),kind:refundReview.has(sub.id)?'review':'paid'});
  if(sub.status==='trialing'&&sub.trial_end&&sub.trial_end>now){trialIdentities.add(cid);for(const plan of plans)c.access.expected.push({plan,sourceId:sub.id,expiresAt:iso(sub.trial_end),kind:'trial'});}
  if(['active','past_due'].includes(sub.status)){
   if(paidIdentities.has(cid))recurringIdentities.add(cid);
   if(terms.currency==='usd'){if(terms.mrrCents===null)mrrComplete=false;else{mrr+=terms.mrrCents;if(sub.status==='past_due')atRiskMrr+=terms.mrrCents;}}
  }
  for(const horizon of forecast){
   if(terms.currency!=='usd')continue;
   const estimate=forecastSubscription(sub,input.previews[sub.id],now,horizon.days);
   if(!estimate.complete){horizon.status='unavailable';horizon.issues.push(`${sub.id}: ${estimate.reason}`);}
   horizon.amountCents!+=estimate.amountCents;horizon.atRiskCents!+=estimate.atRiskCents;
  }
 }
 for(const record of input.accessRecords){
  const c=[...customers.values()].find(x=>x.subscriptions.some(s=>s.id===record.subscription_id));if(!c)continue;
  if(record.tradingview_username){if(c.tradingViewUsername&&c.tradingViewUsername!==record.tradingview_username)c.usernameStatus='conflict';else{c.tradingViewUsername=record.tradingview_username;c.usernameStatus='recorded';}}
  if(record.access_verified_at&&(!c.access.lastVerifiedAt||record.access_verified_at>c.access.lastVerifiedAt))c.access.lastVerifiedAt=record.access_verified_at;
 }
 for(const c of customers.values()){
  c.plans=[...new Set(c.plans)];c.payments.sort((a,b)=>b.at.localeCompare(a.at));
  c.status=lifetimeIdentities.has(c.id)?'Lifetime':c.subscriptions.some(s=>s.status==='past_due')?'Past due':c.subscriptions.some(s=>s.status==='active')?'Recurring':c.subscriptions.some(s=>s.status==='trialing')?'Trial':c.access.expected.some(a=>a.kind==='review')?'Review':'Inactive';
  if(c.usernameStatus==='conflict'){c.tradingViewUsername=null;c.access.note='Conflicting TradingView usernames need owner resolution. No access action is permitted.';}
  if(c.status==='Lifetime'&&c.subscriptions.some(s=>s.status==='active'&&!s.cancelAtPeriodEnd))issues.push('A Lifetime customer also has an active recurring subscription. Review billing separately from Lifetime access.');
 }
 const overdueCents=coverage.invoices?invoices.filter(i=>isKnownInvoice(i)&&i.status==='open'&&i.currency==='usd').reduce((n,i)=>n+i.amount_remaining,0):null;
 const cashComplete=attributionComplete&&coverage.charges,allHistoryComplete=cashComplete&&coverage.subscriptions&&coverage.refunds;
 if(!cashComplete)issues.push('Historical payment/product pagination is incomplete. Cash totals and paid-customer counts are unavailable.');
 if(!mrrComplete)issues.push('One or more recurring amounts require discount, tax, or price review. MRR is unavailable.');
 if(!taxComplete)issues.push('Some payments do not have complete tax linkage. Collected sales excluding tax is unavailable.');
 if(unknownCharges)issues.push(`${unknownCharges} successful charge(s) lack a verified Darth Algo product link and are excluded.`);
 if(currencies.size>1||[...currencies].some(c=>c!=='usd'))issues.push('Money cards show USD only. Other currencies remain separate in customer/payment records; no currency conversion is applied.');
 issues.push('MRR uses this app’s conservative recurring-discount definition; alignment with Stripe Billing’s configurable analytics settings has not been verified.');
 for(const horizon of forecast)if(!coverage.subscriptions||horizon.status==='unavailable'){horizon.status='unavailable';horizon.amountCents=null;horizon.atRiskCents=null;}
 const complete=allHistoryComplete&&mrrComplete&&netComplete&&taxComplete&&coverage.balances&&forecast.every(f=>f.status==='estimated');
 let trendPoints:Array<{date:string;amountCents:number}>|null=null;
 if(cashComplete&&taxComplete){
  trendPoints=[];
  const first=period==='all'?[...trend.keys()].sort()[0]:easternDay(start),last=easternDay(now-1);
  // Complete charge pagination permits an observed zero on days with no cash.
  // Keep missing source coverage null instead of manufacturing a zero series.
  if(first)for(let date=first;date<=last;date=new Date(Date.parse(date+'T12:00:00Z')+DAY*1000).toISOString().slice(0,10))trendPoints.push({date,amountCents:trend.get(date)||0});
 }
 return {version:founderFinanceVersion,status:(complete?'current':'partial') as 'current'|'partial'|'stale',checkedAt,lastSuccessAt:complete?checkedAt:null as string|null,currency:'usd',period:{start:iso(start)||'1970-01-01T00:00:00.000Z',end:checkedAt,label:period==='all'?'All time':`Last ${period==='90d'?90:30} days`},coverage:{...coverage,allTimeAvailable:allHistoryComplete,attributionComplete,taxComplete,excludedUnlinkedCharges:unknownCharges,currencies:[...currencies],source:'Live Stripe; explicit Darth Algo product IDs; current provider objects, not webhook event totals'},metrics:{grossPaymentsCents:cashComplete?gross:null,collectedSalesCents:cashComplete&&taxComplete?gross-tax:null,refundsCents:cashComplete&&coverage.refunds?refundTotal:null,processorNetCents:cashComplete&&coverage.refunds&&netComplete?net:null,processingFeesCents:cashComplete&&coverage.refunds&&netComplete?fees:null,netSalesCashCents:null,overdueCents,mrrCents:mrrComplete?Math.round(mrr):null,atRiskMrrCents:mrrComplete?Math.round(atRiskMrr):null,annualRunRateCents:mrrComplete?Math.round(mrr*12):null,payingCustomers:allHistoryComplete?new Set([...recurringIdentities,...lifetimeIdentities]).size:null,historicalPaidCustomers:allHistoryComplete?paidIdentities.size:null,recurringCustomers:allHistoryComplete?recurringIdentities.size:null,lifetimeCustomers:allHistoryComplete?lifetimeIdentities.size:null,trialCustomers:coverage.subscriptions?trialIdentities.size:null,profitCents:null,payoutsCents:null},forecast,trend:trendPoints,customers:[...customers.values()].sort((a,b)=>(b.payments[0]?.at||'').localeCompare(a.payments[0]?.at||'')),payments:cashEntries.sort((a,b)=>b.at.localeCompare(a.at)),issues:[...new Set(issues)],definitions:{collectedSales:'Successful captured Darth Algo customer charges minus identifiable sales tax, before refunds and fees; charge creation date, America/New_York day labels.',grossPayments:'Successful captured customer charges, including tax. One charge is counted once; invoice/checkout records supply product and tax evidence only.',refunds:'Successful linked refunds by refund creation date, including refunded tax. Refunds of earlier-period purchases remain in this period.',overdue:'Outstanding amount on open Darth Algo invoices, including tax; collection is not assumed.',processorNet:'Sum of actual customer-linked Stripe balance-transaction net amounts by balance transaction creation date, including linked refunds/disputes and fees. Before sales-tax liability; not profit and not payouts.',mrr:'DA-MRR-v1: active and past_due licensed fixed subscriptions, current recurring discounts deducted, one-time discounts excluded, no trial/Lifetime/tax value; annual /12, weekly ×52/12, daily ×365/12. Stripe analytics discount-setting alignment unverified.',customers:'Current paid customer identities: active/past_due recurring customers with positive payment evidence plus unrefunded Lifetime customers. Historical paid count is separate. Trials are separate. Guest checkouts are not automatically merged into Stripe customer identities.',forecast:'Existing-customer estimated billings. Future trials are excluded. No new customers or growth assumed; future tax/credit/schedule ambiguity makes the affected total unavailable.',profit:'Unavailable until actual operating expenses and accounting basis are complete.',access:'Expected access is a union of independently paid periods and Lifetime purchases. A monthly cancellation/refund cannot remove an unrelated Lifetime purchase. Provider confirmation is separate.'}};
}

async function collect<T extends {id?:string}>(fetchPage:(after?:string)=>Promise<{data:T[];has_more:boolean}>,deadline:number){
 const rows:T[]=[];let after:string|undefined;
 try{for(let page=0;page<20&&Date.now()<deadline;page++){const result=await fetchPage(after);rows.push(...result.data);if(!result.has_more)return {rows,complete:true};const next=result.data.at(-1)?.id;if(!next||next===after)break;after=next;}}catch{/* Partial coverage is explicit. */}
 return {rows,complete:false};
}
async function readEvidence(period:FinancePeriod):Promise<FinanceEvidence>{
 const client=stripe(),options={timeout:4500,maxNetworkRetries:0},now=Math.floor(Date.now()/1000),deadline=Date.now()+43000;
 const balance=await client.balance.retrieve({},options);if(!balance.livemode)throw Error('LIVE_STRIPE_REQUIRED');
 const [subscriptions,invoices,sessions,charges,refunds,balances,accessRecords]=await Promise.all([
  collect(after=>client.subscriptions.list({status:'all',limit:100,expand:['data.customer','data.discounts'],...(after?{starting_after:after}:{})},options),deadline),
  collect(after=>client.invoices.list({limit:100,expand:['data.payments'],...(after?{starting_after:after}:{})},options),deadline),
  collect(after=>client.checkout.sessions.list({status:'complete',limit:100,expand:['data.line_items'],...(after?{starting_after:after}:{})},options),deadline),
  collect(after=>client.charges.list({limit:100,...(after?{starting_after:after}:{})},options),deadline),
  collect(after=>client.refunds.list({limit:100,...(after?{starting_after:after}:{})},options),deadline),
  collect(after=>client.balanceTransactions.list({limit:100,created:{...(period==='all'?{}:{gte:now-(period==='90d'?90:30)*DAY}),lt:now},expand:['data.source'],...(after?{starting_after:after}:{})},options),deadline),
  (async()=>{try{const rows=await db()`select subscription_id,tradingview_username,status,access_verified_at from os_subscription_activation order by created_at desc limit 2000`;return rows.map(row=>({...row,access_verified_at:row.access_verified_at?new Date(row.access_verified_at).toISOString():null})) as AccessRecord[];}catch{return [];}})(),
 ]);
 const previews:Record<string,Preview|null>={};
 const candidates=subscriptions.rows.filter(s=>s.livemode&&['active','past_due'].includes(s.status)&&!s.cancel_at_period_end&&s.items.data.some(i=>knownProduct(idOf(i.price.product))));
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(4,candidates.length)},async()=>{while(cursor<candidates.length&&Date.now()<deadline){const s=candidates[cursor++];try{const preview=await client.invoices.createPreview({subscription:s.id},options);previews[s.id]={amountDue:preview.amount_due,currency:preview.currency,endingBalance:preview.ending_balance,taxCents:(preview.total_taxes||[]).reduce((n,t)=>n+t.amount,0),checkedAt:new Date().toISOString()};}catch{previews[s.id]=null;}}}));
 return {subscriptions:subscriptions.rows,invoices:invoices.rows,sessions:sessions.rows,charges:charges.rows,refunds:refunds.rows,balances:balances.rows,coverage:{subscriptions:subscriptions.complete,invoices:invoices.complete,sessions:sessions.complete,charges:charges.complete,refunds:refunds.complete,balances:balances.complete},accessRecords,previews,now,period};
}
const flights=new Map<FinancePeriod,Promise<FounderFinance>>();
export async function founderFinanceSnapshot(period:FinancePeriod='30d'):Promise<FounderFinance>{
 const existing=flights.get(period);if(existing)return existing;
 const run=(async()=>{
  let cached:FounderFinance|null=null;
  try{const [row]=await db()`select details from os_activity where event='founder_finance_snapshot_v1' and entity_id=${period} order by id desc limit 1`;cached=row?.details as FounderFinance||null;if(cached?.version===founderFinanceVersion&&Date.now()-Date.parse(cached.checkedAt)<300000)return cached;}catch{/* Live reads do not depend on the cache. */}
  try{
   const result=buildFounderFinance(await readEvidence(period));
   if(cached?.version===founderFinanceVersion&&((result.metrics.grossPaymentsCents===null&&cached.metrics.grossPaymentsCents!==null)||(result.metrics.mrrCents===null&&cached.metrics.mrrCents!==null)))return {...cached,status:'stale' as const,issues:['A Stripe source could not refresh completely. The previous snapshot, reporting period, and timestamps are preserved.',...result.issues,...cached.issues]};
   try{const sql=db();await sql`insert into os_activity(actor,event,entity_id,details) values('analytics','founder_finance_snapshot_v1',${period},${sql.json(result)})`;}catch{result.issues.push('Snapshot persistence is unavailable. Values came from this live Stripe read.');}
   return result;
  }catch{
   if(cached?.version===founderFinanceVersion)return {...cached,status:'stale' as FounderFinance['status'],issues:['Stripe refresh failed. Showing the last saved snapshot at its original timestamp.',...cached.issues]};
   const result=buildFounderFinance({subscriptions:[],invoices:[],sessions:[],charges:[],refunds:[],balances:[],accessRecords:[],previews:{},coverage:{subscriptions:false,invoices:false,sessions:false,charges:false,refunds:false,balances:false},period,now:Math.floor(Date.now()/1000)});
   result.issues.unshift('Live Stripe data is unavailable. Check the existing Stripe connection in Settings. No amount has been inferred.');return result;
  }
 })();flights.set(period,run);try{return await run;}finally{flights.delete(period);}
}
