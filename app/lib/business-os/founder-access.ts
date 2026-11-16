import {createHash,randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {freshFounderCustomerBilling,type FounderCustomer} from './founder-finance';
import {checkoutTradingViewUsername} from '../subscription-activation-policy';

export const accessActions=['grant','extend','revoke','correct_username','reconcile'] as const;
export type AccessAction=typeof accessActions[number];
export const accessActionLabels:Record<AccessAction,string>={grant:'Grant access',extend:'Extend access',revoke:'Revoke access',correct_username:'Correct username',reconcile:'Reconcile access'};
export type AccessRequest={id:string;customerId:string;action:AccessAction;targetSourceId:string|null;targetPlan:string|null;recordedUsername:string|null;requestedUsername:string|null;requestedExpiryDay:string|null;reason:string;state:'pending_provider_confirmation'|'request_canceled';version:number;createdAt:string;updatedAt:string;billingCheckedAt:string;evidenceVersion:string};
type Row=Record<string,unknown>;
type Sql=ReturnType<typeof db>;
export class FounderAccessError extends Error{constructor(message:string,public status=400,public code='INVALID_ACCESS_REQUEST'){super(message);}}
export const validAccessCustomer=(value:unknown):value is string=>typeof value==='string'&&/^cus_[a-zA-Z0-9]{1,100}$/.test(value);
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const iso=(value:unknown)=>new Date(String(value)).toISOString();
const easternDay=(value:string|Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const calendarDay=(value:unknown):value is string=>typeof value==='string'&&/^20\d\d-\d\d-\d\d$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
export const founderAccessSchema=`
create table if not exists os_founder_access_control(customer_id text primary key,version integer not null default 0 check(version>=0));
create table if not exists os_founder_access_requests(
 id uuid primary key,customer_id text not null,customer_label text not null,
 request_key uuid not null unique,request_hash text not null,intent_hash text not null,
 action text not null check(action in ('grant','extend','revoke','correct_username','reconcile')),
 target_source_id text,target_plan text,recorded_username text,requested_username text,requested_expiry_day text,reason text not null,
 state text not null check(state in ('pending_provider_confirmation','request_canceled')),
 version integer not null default 1 check(version>0),billing_checked_at timestamptz not null,evidence_version text not null,evidence jsonb not null,
 created_at timestamptz not null,updated_at timestamptz not null
);
create unique index if not exists os_founder_access_pending_intent on os_founder_access_requests(customer_id,intent_hash) where state='pending_provider_confirmation';
create index if not exists os_founder_access_customer_history on os_founder_access_requests(customer_id,created_at desc);
create table if not exists os_founder_access_commands(request_key uuid primary key,request_hash text not null,request_id uuid not null references os_founder_access_requests(id));
`;
let ready:Promise<void>|undefined;
export function ensureFounderAccessSchema(){return ready??=db().begin(async tx=>{await tx`select pg_advisory_xact_lock(73111621)`;await tx.unsafe(founderAccessSchema);}).then(()=>{}).catch(error=>{ready=undefined;throw error;});}
function asRequest(row:Row):AccessRequest{return {id:String(row.id),customerId:String(row.customer_id),action:row.action as AccessAction,targetSourceId:row.target_source_id as string|null,targetPlan:row.target_plan as string|null,recordedUsername:row.recorded_username as string|null,requestedUsername:row.requested_username as string|null,requestedExpiryDay:row.requested_expiry_day as string|null,reason:String(row.reason),state:row.state as AccessRequest['state'],version:Number(row.version),createdAt:iso(row.created_at),updatedAt:iso(row.updated_at),billingCheckedAt:iso(row.billing_checked_at),evidenceVersion:String(row.evidence_version)};}
function billingState(customer:FounderCustomer,checkedAt:string,complete:boolean){
 const lifetimeProtected=customer.access.expected.some(access=>access.kind==='lifetime'||/lifetime/i.test(access.plan));
 const reviewRequired=customer.access.expected.some(access=>access.kind==='review');
 const expected=customer.access.expected.slice().sort((a,b)=>(a.sourceId+a.plan).localeCompare(b.sourceId+b.plan));
 const subscriptions=customer.subscriptions.map(sub=>({id:sub.id,plan:sub.plan,status:sub.status,paidThrough:sub.paidThrough,cancelAtPeriodEnd:sub.cancelAtPeriodEnd,cancelAt:sub.cancelAt})).sort((a,b)=>a.id.localeCompare(b.id));
 const payments=customer.payments.map(payment=>({id:payment.id,plan:payment.plan,amountCents:payment.amountCents,refundedCents:payment.refundedCents})).sort((a,b)=>a.id.localeCompare(b.id));
 const facts={customerId:customer.id,recordedUsername:customer.tradingViewUsername,usernameStatus:customer.usernameStatus,expected,subscriptions,payments,lifetimeProtected,complete,reviewRequired};
 return {...facts,checkedAt,evidenceVersion:hash(facts),canRequest:complete&&!reviewRequired,reason:!complete?'Complete current billing and refund evidence is required before saving an access request.':reviewRequired?'A refunded or uncertain entitlement needs billing review before an access request can be saved.':null};
}
async function readBilling(customerId:string,now:Date){
 const evidence=await freshFounderCustomerBilling(customerId),coverage=evidence.coverage;
 const age=now.getTime()-Date.parse(evidence.checkedAt);
 const complete=coverage.subscriptions&&coverage.invoices&&coverage.sessions&&coverage.charges&&coverage.refunds&&coverage.attributionComplete&&coverage.allTimeAvailable&&age>=-60000&&age<60000;
 if(!evidence.customer){if(complete)throw new FounderAccessError('This Stripe customer has no verified Darth Algo record.',404,'CUSTOMER_NOT_FOUND');throw new FounderAccessError('The current customer and billing records could not be verified.',503,'BILLING_UNAVAILABLE');}
 return {customer:evidence.customer,billing:billingState(evidence.customer,evidence.checkedAt,complete)};
}
export type FounderAccessSnapshot=Awaited<ReturnType<typeof readFounderAccess>>;
export async function readFounderAccess(customerId:string,now=new Date()){
 if(!validAccessCustomer(customerId))throw new FounderAccessError('A linked Stripe customer is required. Guest checkout identities need review.');
 await ensureFounderAccessSchema();const sql=db();
 const [rows,control,evidence]=await Promise.all([
  sql`select * from os_founder_access_requests where customer_id=${customerId} order by created_at desc,id limit 30`,
  sql`select version from os_founder_access_control where customer_id=${customerId}`,
  readBilling(customerId,now).then(value=>({value,error:null as string|null})).catch(error=>({value:null,error:error instanceof FounderAccessError?error.message:'Current billing evidence is unavailable. Refresh before requesting a change.'})),
 ]);
 return {customerId,version:Number(control[0]?.version||0),billing:evidence.value?.billing||null,billingError:evidence.error,requests:rows.map(asRequest),provider:{confirmed:false as const,status:'unavailable' as const,reason:'The existing TradingView fulfillment workflow has not been connected for verified readback. Requests are saved only; no provider action is taken.'}};
}
type Change={operation:'request';requestKey:string;customerId:string;expectedVersion:number;evidenceVersion:string;action:AccessAction;targetSourceId:string|null;requestedUsername:string|null;requestedExpiryDay:string|null;reason:string};
type Cancel={operation:'cancel';requestKey:string;customerId:string;expectedVersion:number;requestId:string;requestVersion:number};
function validate(value:unknown):Change|Cancel{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new FounderAccessError('Invalid access request.');
 const v=value as Row;
 if(!uuid(v.requestKey)||!validAccessCustomer(v.customerId)||!Number.isSafeInteger(v.expectedVersion)||Number(v.expectedVersion)<0)throw new FounderAccessError('A valid customer, saved version and retry key are required.');
 if(v.operation==='cancel'){
  if(Object.keys(v).some(key=>!['operation','requestKey','customerId','expectedVersion','requestId','requestVersion'].includes(key))||!uuid(v.requestId)||!Number.isSafeInteger(v.requestVersion)||Number(v.requestVersion)<1)throw new FounderAccessError('Invalid request withdrawal.');
  return {operation:'cancel',requestKey:v.requestKey,customerId:v.customerId,expectedVersion:Number(v.expectedVersion),requestId:v.requestId,requestVersion:Number(v.requestVersion)};
 }
 if(v.operation!=='request'||Object.keys(v).some(key=>!['operation','requestKey','customerId','expectedVersion','evidenceVersion','action','targetSourceId','requestedUsername','requestedExpiryDay','reason'].includes(key))||!accessActions.includes(v.action as AccessAction)||typeof v.evidenceVersion!=='string'||!/^[a-f0-9]{64}$/.test(v.evidenceVersion))throw new FounderAccessError('Choose a supported request using the current billing version.');
 const requestedUsername=v.requestedUsername==null||v.requestedUsername===''?null:checkoutTradingViewUsername([{key:'tradingviewusername',type:'text',text:{value:typeof v.requestedUsername==='string'?v.requestedUsername:null}}]);
 if(v.requestedUsername!=null&&v.requestedUsername!==''&&!requestedUsername)throw new FounderAccessError('Enter a valid TradingView username, without links or spaces.');
 if(v.targetSourceId!=null&&(typeof v.targetSourceId!=='string'||v.targetSourceId.length>200))throw new FounderAccessError('Choose a verified billing source.');
 if(v.requestedExpiryDay!=null&&!calendarDay(v.requestedExpiryDay))throw new FounderAccessError('Choose a valid requested end date.');
 if(typeof v.reason!=='string'||v.reason.length>500||/[\u0000-\u001f\u007f]/.test(v.reason))throw new FounderAccessError('Keep the reason to one line, up to 500 characters.');
 return {operation:'request',requestKey:v.requestKey,customerId:v.customerId,expectedVersion:Number(v.expectedVersion),evidenceVersion:v.evidenceVersion,action:v.action as AccessAction,targetSourceId:typeof v.targetSourceId==='string'?v.targetSourceId:null,requestedUsername,requestedExpiryDay:typeof v.requestedExpiryDay==='string'?v.requestedExpiryDay:null,reason:v.reason.trim()};
}
function validateIntent(input:Change,billing:ReturnType<typeof billingState>,now:Date){
 if(!billing.canRequest)throw new FounderAccessError(billing.reason||'Billing evidence needs review.',409,'BILLING_REVIEW_REQUIRED');
 if(input.evidenceVersion!==billing.evidenceVersion)throw new FounderAccessError('Billing or the recorded username changed. Refresh and review the current record.',409,'EVIDENCE_CHANGED');
 if(billing.lifetimeProtected&&['revoke','extend'].includes(input.action))throw new FounderAccessError('Lifetime rights are protected. A request cannot revoke them or replace permanent access with an expiration date.',409,'LIFETIME_PROTECTED');
 if(input.action!=='extend'&&input.requestedExpiryDay)throw new FounderAccessError('Only an extension request may include an end date.');
 if(['reconcile','correct_username'].includes(input.action)&&input.targetSourceId)throw new FounderAccessError('This request applies to the recorded customer identity.');
 if(input.action==='reconcile'&&input.requestedUsername)throw new FounderAccessError('Use a username correction request to propose another username.');
 if(input.action!=='reconcile'&&!input.requestedUsername)throw new FounderAccessError('Enter the exact requested TradingView username.');
 if(input.action==='correct_username'&&input.requestedUsername===billing.recordedUsername&&billing.usernameStatus!=='conflict')throw new FounderAccessError('The requested username is already recorded. Use reconciliation to check provider access.');
 if(['grant','extend','revoke'].includes(input.action)&&billing.usernameStatus==='conflict')throw new FounderAccessError('Conflicting recorded usernames need a correction request before an access change.',409,'USERNAME_CONFLICT');
 const expectedMatches=billing.expected.filter(item=>item.sourceId===input.targetSourceId),expected=expectedMatches[0];
 const subscription=billing.subscriptions.find(item=>item.id===input.targetSourceId);
 if(['grant','extend'].includes(input.action)&&(expectedMatches.length!==1||!expected||!['paid','trial','lifetime'].includes(expected.kind)))throw new FounderAccessError('This request needs one unambiguous verified paid, trial or Lifetime entitlement.',409,'ENTITLEMENT_REQUIRED');
 if(input.action==='revoke'&&!subscription)throw new FounderAccessError('Select the exact subscription to review. Customer-wide revocation is not supported.');
 if(input.action==='extend'&&(!expected?.expiresAt||!input.requestedExpiryDay||input.requestedExpiryDay<=easternDay(expected.expiresAt)||input.requestedExpiryDay<=easternDay(now)))throw new FounderAccessError('Choose a requested end date later than the current entitlement.');
 return expected?.plan||subscription?.plan||null;
}
async function replay(sql:Sql,key:string,requestHash:string){
 const [command]=await sql`select request_hash,request_id from os_founder_access_commands where request_key=${key}`;
 if(!command)return null;
 if(command.request_hash!==requestHash)throw new FounderAccessError('This retry key belongs to a different request.',409,'REQUEST_KEY_CONFLICT');
 const [row]=await sql`select * from os_founder_access_requests where id=${command.request_id}`;
 return {saved:true,duplicate:true,providerConfirmed:false,request:asRequest(row)};
}
export async function mutateFounderAccess(value:unknown,now=new Date()){
 const input=validate(value),requestHash=hash(input);await ensureFounderAccessSchema();const sql=db();
 const previous=await replay(sql,input.requestKey,requestHash);if(previous)return previous;
 const evidence=input.operation==='request'?await readBilling(input.customerId,now):null;
 const targetPlan=input.operation==='request'?validateIntent(input,evidence!.billing,now):null;
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(73111622)`;const scoped=tx as unknown as Sql;
  const previous=await replay(scoped,input.requestKey,requestHash);if(previous)return previous;
  await tx`insert into os_founder_access_control(customer_id) values(${input.customerId}) on conflict do nothing`;
  const [control]=await tx`select version from os_founder_access_control where customer_id=${input.customerId} for update`;
  if(Number(control.version)!==input.expectedVersion)throw new FounderAccessError('Access requests changed on another device. Refresh before saving.',409,'VERSION_CONFLICT');
  let row:Row,duplicate=false;
  if(input.operation==='cancel'){
   const [current]=await tx`select * from os_founder_access_requests where id=${input.requestId} and customer_id=${input.customerId} for update`;
   if(!current)throw new FounderAccessError('This customer request was not found.',404,'NOT_FOUND');
   if(Number(current.version)!==input.requestVersion||current.state!=='pending_provider_confirmation')throw new FounderAccessError('This request changed. Refresh its saved version.',409,'VERSION_CONFLICT');
   [row]=await tx`update os_founder_access_requests set state='request_canceled',version=version+1,updated_at=${now.toISOString()} where id=${input.requestId} returning *`;
  }else{
   const intentHash=hash({customerId:input.customerId,action:input.action,targetSourceId:input.targetSourceId,requestedUsername:input.requestedUsername,requestedExpiryDay:input.requestedExpiryDay});
   const [existing]=await tx`select * from os_founder_access_requests where customer_id=${input.customerId} and intent_hash=${intentHash} and state='pending_provider_confirmation'`;
   if(existing){
    if(existing.reason!==input.reason||existing.evidence_version!==evidence!.billing.evidenceVersion)throw new FounderAccessError('This change already has a pending request. Review and withdraw it before changing its reason or billing basis.',409,'PENDING_REQUEST_CHANGED');
    row=existing;duplicate=true;
   }
   else [row]=await tx`insert into os_founder_access_requests(id,customer_id,customer_label,request_key,request_hash,intent_hash,action,target_source_id,target_plan,recorded_username,requested_username,requested_expiry_day,reason,state,billing_checked_at,evidence_version,evidence,created_at,updated_at) values(${randomUUID()},${input.customerId},${evidence!.customer.name},${input.requestKey},${requestHash},${intentHash},${input.action},${input.targetSourceId},${targetPlan},${evidence!.billing.recordedUsername},${input.requestedUsername},${input.requestedExpiryDay},${input.reason},'pending_provider_confirmation',${evidence!.billing.checkedAt},${evidence!.billing.evidenceVersion},${tx.json(evidence!.billing)},${now.toISOString()},${now.toISOString()}) returning *`;
  }
  await tx`insert into os_founder_access_commands(request_key,request_hash,request_id) values(${input.requestKey},${requestHash},${String(row.id)})`;
  if(!duplicate)await tx`update os_founder_access_control set version=version+1 where customer_id=${input.customerId}`;
  return {saved:true,duplicate,providerConfirmed:false,request:asRequest(row)};
 });
}
