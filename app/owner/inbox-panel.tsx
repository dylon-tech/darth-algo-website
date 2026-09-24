'use client';
import {useRef,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ChevronRight,RefreshCw} from 'lucide-react';
import {useOwnerFeed} from './use-owner-feed';
import {safeReceiptUrl} from '../lib/business-os/desk-state';
import styles from './iphone-home.module.css';
type Approval={id:string;payload_hash:string;effective_status:string;expires_at:string;payload:{summary:string;details:string;kind:string;executor?:string;text?:string;estimatedCostUsd?:number;assets?:Array<{url:string;altText:string}>};delivery?:{published?:boolean;postId?:string;url?:string;state?:string}};
type Feed={approvals:Approval[];messages:Array<{id:string;department:string;body:string;role:string;created_at:string}>};
export default function InboxPanel({active,disabled,onOpenAgent}:{active:boolean;disabled:boolean;onOpenAgent:(id:string)=>void}){
 const {data,error,loading,checkedAt,refresh}=useOwnerFeed<Feed>('/api/owner/command?view=status',active);
 const [filter,setFilter]=useState<'decisions'|'messages'|'history'>('decisions'),[busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[notes,setNotes]=useState<Record<string,string>>({});
 const lock=useRef(false);
 const unavailable=disabled||Boolean(error)||!checkedAt||Date.now()-checkedAt>45000;
 async function decide(a:Approval,decision:'approved'|'declined'|'revision_requested'){
  if(lock.current||unavailable)return;lock.current=true;setBusy(a.id);setNotice('');const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);
  try{const r=await fetch('/api/owner/command',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:c.signal,body:JSON.stringify({operation:'decide',id:a.id,payloadHash:a.payload_hash,decision,note:notes[a.id]||''})});const result=await r.json();if(!r.ok)throw Error(result.message||result.error||'Decision not confirmed.');setNotice(typeof result.message==='string'?result.message:'Decision saved. Execution is tracked separately.');}
  catch(e){setNotice(e instanceof Error&&e.name!=='AbortError'?e.message:'No confirmation received. Refresh to see whether your decision was saved before retrying.');}
  finally{clearTimeout(timer);lock.current=false;setBusy('');await refresh();}
 }
 const pending=(a:Approval)=>a.effective_status==='pending'&&Date.parse(a.expires_at)>Date.now();
 const approvals=(data?.approvals||[]).filter(a=>filter==='decisions'?pending(a):!pending(a));
 return <section aria-label='Owner inbox'>
  <div className={styles.sectionHeading}><h2>Decisions & messages</h2><button aria-label='Refresh inbox' disabled={loading} onClick={()=>void refresh()}><RefreshCw size={18}/></button></div>
  <div className={styles.segmented} aria-label='Inbox filter'>{(['decisions','messages','history'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='decisions'?'Decisions':f==='messages'?'Messages':'History'}</button>)}</div>
  {error&&<p className={styles.alert} role='alert'>{error}</p>}{notice&&<p className={styles.notice} role='status'>{notice}</p>}
  {filter==='messages'?<div className={styles.group}>{data?.messages.slice(0,30).map(m=><button className={styles.listRow} key={m.id} onClick={()=>onOpenAgent(m.department)}><span><strong>{m.department.replaceAll('_',' ')} · {m.role==='user'?'You':'Agent'}</strong><small className={styles.messagePreview}>{m.body}</small><small>{new Date(m.created_at).toLocaleString()}</small></span><ChevronRight size={17}/></button>)}</div>:approvals.map(a=>{
   const url=safeReceiptUrl(a.delivery?.url||null);
   const media=(a.payload.assets||[]).filter(asset=>{try{const u=new URL(asset.url);return u.origin==='https://www.darthalgo.com'&&u.pathname.startsWith('/api/social-media/');}catch{return false;}});
   const release=a.payload.executor==='indicator_release_v1';
   return <article className={styles.inboxCard} key={a.id}>
    <small>{a.payload.kind} · {pending(a)?'Your decision needed':a.effective_status==='pending'?'expired':a.effective_status.replaceAll('_',' ')}</small><h3>{a.payload.summary}</h3>
    {media.length>0&&<div className={styles.mediaStrip}>{media.map(asset=><Image key={asset.url} src={asset.url} alt={asset.altText} width={540} height={675} unoptimized/>)}</div>}
    <p className={styles.pre}>{a.payload.text||a.payload.details}</p>
    <details className={styles.groupDetails}><summary>Scope & version <ChevronRight size={16}/></summary><div><p>{a.payload.details}</p><p>Exact version: {a.payload_hash}</p><p>Expires: {new Date(a.expires_at).toLocaleString()}</p><p>Cost: {typeof a.payload.estimatedCostUsd==='number'?`$${a.payload.estimatedCostUsd.toFixed(2)} estimated`:'Not specified in this proposal; existing spending limits still apply.'}</p></div></details>
    {a.delivery&&<p className={styles.caption}>{a.delivery.published===true?'Provider confirms publication':a.delivery.state||'Delivery still needs verification'}{a.delivery.postId?` · Receipt ${a.delivery.postId}`:''}{url&&<> · <a href={url} target='_blank' rel='noreferrer'>View post</a></>}</p>}
    {pending(a)&&(release?<Link className={styles.primary} href='/owner/indicators'>Review source & release evidence</Link>:<><label className={styles.revisionLabel}>Direction for this decision<textarea rows={2} maxLength={2000} value={notes[a.id]||''} onChange={e=>setNotes({...notes,[a.id]:e.target.value})} placeholder='Required for Revise; optional otherwise'/></label><div className={styles.decisionActions}><button disabled={unavailable||Boolean(busy)} onClick={()=>void decide(a,'approved')}>{busy===a.id?'Saving…':'Approve'}</button><button disabled={unavailable||Boolean(busy)||!notes[a.id]?.trim()} onClick={()=>void decide(a,'revision_requested')}>Revise</button><button disabled={unavailable||Boolean(busy)} onClick={()=>void decide(a,'declined')}>Decline</button></div></>)}
   </article>;
  })}
  {!data&&!error&&<p className={styles.caption}>Reading your private inbox…</p>}
  {data&&(filter==='messages'?data.messages.length===0:approvals.length===0)&&<p className={styles.caption}>{filter==='decisions'?'No pending decisions in the latest 50 proposals.':filter==='messages'?'No conversations saved yet.':'No decision history in the latest 50 proposals.'}</p>}
 </section>;
}
