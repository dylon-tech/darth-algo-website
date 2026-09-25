'use client';
import {useEffect,useState,useCallback,useRef} from 'react';
import Link from 'next/link';
import styles from '../visual-hq.module.css';
type Case={id:string;reason:string;status:string;details:{workflowState?:string;verifiedAt?:string;resolution?:string};review_id:string|null;draft_hash:string|null;recipient:string|null;subject:string|null;body:string|null;review_state:string|null};
type Snapshot={checkedAt:string;cases:Case[];sending:string;lastSync:{details:{subscriptionsChecked?:number;hasMore?:boolean;checkedAt?:string}}|null};
export default function RetentionPage(){
 const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState('');const lock=useRef(false);
 const refresh=useCallback(async()=>{try{const r=await fetch('/api/owner/retention',{cache:'no-store'});if(r.status===401){setData(null);throw Error('Connect this browser through your private Telegram /connect flow to see customer records.');}if(!r.ok)throw Error('Customer records are unavailable.');setData(await r.json());setError('');}catch(e){setError(e instanceof Error?e.message:'Records unavailable');}},[]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},30000);return()=>clearInterval(timer);},[refresh]);
 async function prepare(id:string){if(lock.current)return;lock.current=true;setBusy(id);try{const r=await fetch('/api/owner/retention',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'prepare_draft',id})});const result=await r.json();if(!r.ok)throw Error(result.error);await refresh();}catch(e){setError(e instanceof Error?e.message:'Draft not confirmed');}finally{lock.current=false;setBusy('');}}
 return <main style={{maxWidth:760,margin:'0 auto',padding:'max(24px, env(safe-area-inset-top)) 20px 100px',color:'#f7f7f9'}}>
  <Link href='/owner#inbox'>← Command Center</Link><h1>Customer follow-through</h1><p>Private case history and exact drafts. A finding or draft is not a sent message or recovered customer.</p>
  {error&&<p role='alert'>{error}</p>}{data&&<><p>{data.sending}</p><p>Latest scan: {data.lastSync?.details.subscriptionsChecked??'Unreported'} subscriptions · {data.lastSync?.details.hasMore?'Partial coverage':'See saved scan scope'}. Checked {data.lastSync?.details.checkedAt||'not recorded'}.</p>
  <div className={styles.queueGrid}>{data.cases.map(c=><article key={c.id} className={styles.queueCard} style={{padding:18}}><h2>{c.reason.replaceAll('_',' ')}</h2><p>{c.review_state||c.details.workflowState||'Legacy case · eligibility unverified'}</p><small>Case {c.id.slice(0,8)} · {c.details.verifiedAt||'Fresh verification required'}</small>{c.details.resolution&&<p>{c.details.resolution}</p>}
   {c.body?<details className={styles.details}><summary>Review exact recipient and draft</summary><p>To: {c.recipient}</p><strong>{c.subject}</strong><p style={{whiteSpace:'pre-wrap'}}>{c.body}</p><small>Draft version {c.draft_hash?.slice(0,12)}</small><p>Held for Gmail thread/sent-history, opt-out/bounce, current-access and controlled-test checks. No sending approval is implied.</p></details>:c.reason==='failed_payment'&&['open','contact_ready'].includes(c.status)&&<button style={{minHeight:44}} disabled={Boolean(busy)} onClick={()=>void prepare(c.id)}>{busy===c.id?'Checking current payment…':'Check payment & save draft'}</button>}
  </article>)}</div></>}
 </main>;
}
