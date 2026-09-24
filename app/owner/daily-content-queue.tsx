'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {Check,RefreshCw,X,PenLine,MessageCircle,Clock3} from 'lucide-react';
import type {ContentAction,ContentQueue,QueueItem} from '../lib/business-os/daily-content-model';
import styles from './visual-hq.module.css';
export default function DailyContentQueue({active,disabled,onOpenAgent}:{active:boolean;disabled:boolean;onOpenAgent:()=>void}){
 const [data,setData]=useState<ContentQueue|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(''),[loading,setLoading]=useState(false),[filter,setFilter]=useState<'today'|'upcoming'|'held'>('today'),[editing,setEditing]=useState<string|null>(null),[note,setNote]=useState('');
 const [clock,setClock]=useState(Date.now());
 const mounted=useRef(false),reading=useRef(false),locked=useRef(false),request=useRef<AbortController|null>(null),intent=useRef<{signature:string;key:string}|null>(null);
 const refresh=useCallback(async()=>{if(reading.current)return;reading.current=true;setLoading(true);const c=new AbortController();request.current=c;const timeout=setTimeout(()=>c.abort(),15000);try{const r=await fetch('/api/owner/content-queue',{cache:'no-store',credentials:'same-origin',signal:c.signal});const d=await r.json();if(!r.ok||!d.checkedAt||!Array.isArray(d.items))throw Error(d.error||'The queue could not be verified.');if(mounted.current){setData(d);setError('');setClock(Date.now());}}catch(e){if(mounted.current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'The queue check timed out. Nothing was changed.');}finally{clearTimeout(timeout);reading.current=false;if(mounted.current)setLoading(false);}},[]);
 useEffect(()=>{mounted.current=true;try{const saved=JSON.parse(sessionStorage.getItem('darth-queue-intent')||'null');if(typeof saved?.signature==='string'&&typeof saved?.key==='string')intent.current=saved;}catch{}return()=>{mounted.current=false;request.current?.abort();};},[]);
 useEffect(()=>{if(!active)return;void refresh();const t=setInterval(()=>{setClock(Date.now());if(document.visibilityState==='visible')void refresh();},15000);return()=>clearInterval(t);},[active,refresh]);
 const unavailable=disabled||Boolean(error)||!data||clock-Date.parse(data.checkedAt)>45000;
 async function decide(item:QueueItem,action:ContentAction){
  if(locked.current||unavailable||item.submitted)return;locked.current=true;setBusy(item.id);setNotice('');
  const payload={id:item.id,reviewHash:item.reviewHash,action,expectedDecisionId:item.decision?.id||null,note:action==='remake'?note.trim():''},signature=JSON.stringify(payload);
  if(intent.current?.signature!==signature)intent.current={signature,key:'queue:'+crypto.randomUUID()};
  try{sessionStorage.setItem('darth-queue-intent',JSON.stringify(intent.current));}catch{}
  const c=new AbortController(),timeout=setTimeout(()=>c.abort(),20000);
  try{const r=await fetch('/api/owner/content-queue',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:c.signal,body:JSON.stringify({...payload,requestKey:intent.current.key})});const d=await r.json();if(!r.ok)throw Error(d.error||'Decision not confirmed.');if(typeof d.message!=='string')throw Error('Decision not confirmed.');if(mounted.current){setNotice(d.message);setEditing(null);setNote('');intent.current=null;try{sessionStorage.removeItem('darth-queue-intent');}catch{}}}
  catch(e){if(mounted.current)setNotice(e instanceof Error&&e.name!=='AbortError'?e.message:'The response was not confirmed. Refresh before retrying. An unchanged decision reuses its request key.');}
  finally{clearTimeout(timeout);locked.current=false;if(mounted.current){setBusy('');await refresh();}}
 }
 const items=data?.items.filter(c=>filter==='today'?c.day===data.today:filter==='upcoming'?c.day>data.today:Boolean(c.decision&&(c.decision.action!=='approve_replacement'||c.decision.reviewHash!==c.reviewHash)))||[];
 return <section className={styles.queue} aria-labelledby='daily-queue-title'>
  <div className={styles.sectionTitle}><div><h2 id='daily-queue-title'>Your content queue</h2><p>9 AM & 3 PM Eastern · Review the exact version before it posts.</p></div><button className={styles.iconButton} aria-label='Refresh content queue' onClick={()=>void refresh()} disabled={loading}><RefreshCw size={18}/></button></div>
  <div className={styles.filters} aria-label='Filter content queue'>{(['today','upcoming','held'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='today'?'Today':f==='upcoming'?'Upcoming':'Held'}</button>)}</div>
  {error&&<p className={styles.warning} role='alert'>{error}</p>}{notice&&<p className={styles.notice} role='status'>{notice}</p>}
  <div className={styles.queueGrid}>{items.map(item=><article key={item.id} className={styles.queueCard}>
   <div className={styles.postTime}><span><Clock3 size={15}/>{item.slot==='morning'?'Morning · 9 AM':'Afternoon · 3 PM'}</span><small>{item.day}</small></div>
   <div className={styles.artStrip} aria-label='Campaign artwork'>{item.images.map(image=><Image key={image.path} src={image.path} alt={image.altText} width={1080} height={1350} unoptimized/>)}</div>
   <div className={styles.postBody}><span className={styles.kind}>{item.kind}</span><h3>{item.theme.replaceAll('-',' ')}</h3><p className={styles.postState}>{item.state}</p>
   <details className={styles.details}><summary>Caption & version</summary><p className={styles.pre}>{item.text}</p><small>Version {item.reviewHash.slice(0,12)} · Same campaign across connected destinations.</small></details>
   {item.revision?.brief&&<details className={styles.details}><summary>View replacement brief</summary><p className={styles.pre}>{item.revision.brief}</p><p>The brief is saved. A finished-image renderer is not connected to this worker. The slot stays held until new artwork is created and reviewed.</p></details>}
   {item.canApprove&&<button className={styles.approve} disabled={unavailable||Boolean(busy)} onClick={()=>void decide(item,'approve_replacement')}><Check size={17}/>Approve replacement</button>}
   {!item.submitted&&<div className={styles.queueActions}><button disabled={unavailable||Boolean(busy)||item.decision?.action==='disapprove'} onClick={()=>void decide(item,'disapprove')}><X size={16}/>{busy===item.id?'Saving…':'Disapprove'}</button><button disabled={unavailable||Boolean(busy)||Boolean(item.revision&&['queued','running','unknown'].includes(item.revision.status))} onClick={()=>{setEditing(editing===item.id?null:item.id);setNote('');}}><PenLine size={16}/>Remake</button></div>}
   {editing===item.id&&<form className={styles.remakeForm} onSubmit={e=>{e.preventDefault();void decide(item,'remake');}}><label htmlFor={`note-${item.id}`}>What should change? <small>Optional</small></label><textarea id={`note-${item.id}`} rows={2} maxLength={800} value={note} onChange={e=>setNote(e.target.value)} placeholder='Stronger hook, different visual, clearer feature…'/><p>The original stops posting and your direction is saved. The Content agent can prepare the brief; finished artwork is blocked until a renderer is connected.</p><div><button type='button' onClick={()=>setEditing(null)}>Cancel</button><button type='submit' disabled={unavailable||Boolean(busy)}>Request remake</button></div></form>}
   {item.decision?.action==='remake'&&<button className={styles.agentLink} onClick={onOpenAgent}><MessageCircle size={15}/>Open Content agent</button>}
   {item.submitted&&<p className={styles.help}>Already handed to a publisher. Disapprove cannot undo an in-flight or published post.</p>}
   </div>
  </article>)}</div>{!items.length&&<p className={styles.empty}>{loading&&!data?'Loading the real publishing queue…':filter==='today'?'No content is recorded for today.':filter==='held'?'No held content in the returned queue.':'No upcoming content in the returned queue.'}</p>}
  <p className={styles.help}>Disapprove holds unsent content. Remake saves a tracked request; finished artwork currently needs a rendering connection.</p>
 </section>;
}
