'use client';
import {useEffect,useRef,useState} from 'react';
import type {AccessAction,AccessRequest,FounderAccessSnapshot} from '../lib/business-os/founder-access';
import {Notice,SaveError,SourceNote,saveRequest,timestamp,useFounderFeed} from './founder-shared';
import s from './founder.module.css';
const labels:Record<AccessAction,string>={grant:'Grant access',extend:'Extend access',revoke:'Revoke access',correct_username:'Correct username',reconcile:'Reconcile access'};
export default function FounderCustomerAccess({base,customerId}:{base:string;customerId:string}){
 const [open,setOpen]=useState(false),[action,setAction]=useState<AccessAction>('grant'),[target,setTarget]=useState(''),[username,setUsername]=useState(''),[expiry,setExpiry]=useState(''),[reason,setReason]=useState(''),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [baseline,setBaseline]=useState<{version:number;evidenceVersion:string}|null>(null),retry=useRef<{intent:string;key:string}|null>(null);
 const linked=/^cus_[a-zA-Z0-9]{1,100}$/.test(customerId);
 const feed=useFounderFeed<FounderAccessSnapshot>(base+'/founder-access?customer='+encodeURIComponent(customerId),open&&linked),data=feed.data,billing=data?.billing;
 useEffect(()=>{if(billing&&data&&!dirty){setBaseline({version:data.version,evidenceVersion:billing.evidenceVersion});setUsername(billing.recordedUsername||'');setTarget(billing.expected[0]?.sourceId||billing.subscriptions[0]?.id||'');}},[billing,data,dirty]);
 const outdated=Boolean(baseline&&data&&billing&&(baseline.version!==data.version||baseline.evidenceVersion!==billing.evidenceVersion));
 const protectedAction=Boolean(billing?.lifetimeProtected&&(action==='revoke'||action==='extend'));
 const choices=action==='revoke'?(billing?.subscriptions||[]).map(sub=>({id:sub.id,plan:sub.plan})):(billing?.expected||[]).map(item=>({id:item.sourceId,plan:item.plan}));
 const uniqueChoices=choices.filter((choice,index)=>choices.findIndex(item=>item.id===choice.id)===index);
 function change(){setDirty(true);setMessage('');setError('');}
 async function submit(){
  if(!baseline||!data)return;setBusy(true);setError('');setMessage('');
  const payload={operation:'request',customerId,expectedVersion:baseline.version,evidenceVersion:baseline.evidenceVersion,action,targetSourceId:['grant','extend','revoke'].includes(action)?target||null:null,requestedUsername:action==='reconcile'?null:username,requestedExpiryDay:action==='extend'?expiry||null:null,reason};
  const intent=JSON.stringify(payload);if(retry.current?.intent!==intent)retry.current={intent,key:crypto.randomUUID()};
  try{const result=await saveRequest<{duplicate:boolean;request:Pick<AccessRequest,'state'>}>(base+'/founder-access',{...payload,requestKey:retry.current.key});setMessage(result.request.state==='request_canceled'?'This request was already withdrawn. Review Saved requests before creating a new request.':result.duplicate?'This request is already saved. Provider confirmation pending.':'Request saved. Provider confirmation pending.');setDirty(false);retry.current=null;await feed.refresh();}
  catch(e){setError(e instanceof Error?e.message:'Save was not confirmed.');if(e instanceof SaveError&&e.status===409)await feed.refresh();}
  finally{setBusy(false);}
 }
 async function withdraw(request:AccessRequest){
  if(!data)return;setBusy(true);setError('');
  const payload={operation:'cancel',customerId,expectedVersion:data.version,requestId:request.id,requestVersion:request.version};
  const intent=JSON.stringify(payload);if(retry.current?.intent!==intent)retry.current={intent,key:crypto.randomUUID()};
  try{await saveRequest(base+'/founder-access',{...payload,requestKey:retry.current.key});setMessage('Request withdrawn. No provider action was taken.');retry.current=null;await feed.refresh();}
  catch(e){setError(e instanceof Error?e.message:'Withdrawal was not confirmed.');if(e instanceof SaveError&&e.status===409)await feed.refresh();}
  finally{setBusy(false);}
 }
 return <section className={s.card} style={{marginTop:14,overflowWrap:'anywhere'}} aria-label='Customer access requests'>
  <h3>Access requests</h3><p>Save a change for fulfillment review. Access stays unverified until the provider confirms it.</p>
  {!linked?<Notice>This checkout needs a linked Stripe customer before an access request can be saved.</Notice>:<button className={s.secondary} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?'Hide access requests':'Request access change'}</button>}
  {open&&linked&&<>
   {feed.loading&&!data&&<p role='status'>Checking current billing and saved requests…</p>}{(feed.error||error)&&<Notice error>{error||feed.error}</Notice>}{message&&<Notice>{message}</Notice>}
   {data?.billingError&&<Notice error>{data.billingError}</Notice>}
   {billing&&<><dl className={s.detailList}><div><dt>Recorded username</dt><dd>{billing.recordedUsername||'Not verified'}<small style={{display:'block'}}>{billing.usernameStatus}</small></dd></div><div><dt>Provider confirmation</dt><dd>Not verified</dd></div></dl>
   {billing.lifetimeProtected&&<Notice>Lifetime rights are protected. Revocation and expiration changes are unavailable.</Notice>}{billing.reason&&<Notice error>{billing.reason}</Notice>}
   <div className={s.form}><label className={s.field}>Requested change<select aria-label='Requested change' value={action} onChange={e=>{change();setAction(e.target.value as AccessAction);}}>{(Object.keys(labels) as AccessAction[]).map(value=><option key={value} value={value} disabled={billing.lifetimeProtected&&(value==='revoke'||value==='extend')}>{labels[value]}</option>)}</select></label>
   {['grant','extend','revoke'].includes(action)&&<label className={s.field}>Billing record<select aria-label='Billing record' value={target} onChange={e=>{change();setTarget(e.target.value);}}><option value=''>Choose a verified record</option>{uniqueChoices.map(choice=><option key={choice.id} value={choice.id}>{choice.plan} · {choice.id.slice(-8)}</option>)}</select></label>}
   {action!=='reconcile'&&<label className={s.field}>Requested TradingView username<input value={username} maxLength={64} autoComplete='off' autoCapitalize='none' spellCheck={false} onChange={e=>{change();setUsername(e.target.value);}}/><small>This does not replace the recorded username or confirm provider access.</small></label>}
   {action==='extend'&&<label className={s.field}>Requested end date · Eastern<input type='date' value={expiry} onChange={e=>{change();setExpiry(e.target.value);}}/><small>An extension request does not change billing or establish additional entitlement.</small></label>}
   <label className={s.field}>Reason · optional<input value={reason} maxLength={500} onChange={e=>{change();setReason(e.target.value);}}/></label>
   {outdated&&<Notice>Your entries are kept. Review the refreshed billing record and saved requests before continuing.<button className={s.secondary} disabled={busy||feed.loading} onClick={()=>{setBaseline({version:data!.version,evidenceVersion:billing.evidenceVersion});setError('');retry.current=null;}}>Use refreshed record</button></Notice>}
   <div className={s.actions}><button className={s.primary} disabled={busy||feed.loading||Boolean(feed.error)||!billing.canRequest||!baseline||outdated||protectedAction} onClick={()=>void submit()}>{busy?'Saving…':'Save access request'}</button><button className={s.secondary} disabled={busy||feed.loading} onClick={()=>void feed.refresh()}>Refresh record</button></div>
   </div><SourceNote source='Fresh Stripe billing evidence. This request does not execute a Make or TradingView action.' at={billing.checkedAt}/></>}
   {data&&<><h3 style={{marginTop:24}}>Saved requests</h3>{!data.requests.length?<p>No access requests saved for this customer.</p>:data.requests.map(request=><article key={request.id} className={s.card} style={{marginBottom:12}}><strong>{labels[request.action]}</strong><p>{request.state==='request_canceled'?'Request withdrawn':'Provider confirmation pending'}</p>{request.targetPlan&&<p>{request.targetPlan}</p>}{request.requestedUsername&&<p>Requested username: {request.requestedUsername}</p>}{request.requestedExpiryDay&&<p>Requested end date: {request.requestedExpiryDay} · Eastern</p>}{request.reason&&<p>{request.reason}</p>}<small>{timestamp(request.createdAt)}</small>{request.state==='pending_provider_confirmation'&&<div className={s.actions}><button className={s.secondary} disabled={busy||feed.loading||Boolean(feed.error)} onClick={()=>void withdraw(request)}>Withdraw request</button></div>}</article>)}<p className={s.soft}>Latest 30 requests. The full request history remains saved.</p></>}
   {!billing&&<button className={s.secondary} disabled={busy||feed.loading} onClick={()=>void feed.refresh()}>Refresh record</button>}
  </>}
 </section>;
}
