'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpRight,ArrowLeft,RefreshCw,X,MessageCircle,Plus,Pause,Play,Activity,ChevronRight,Compass} from 'lucide-react';
import type {CeoHome} from '../../lib/business-os/ceo-home';
import {safeReceiptUrl} from '../../lib/business-os/desk-state';
import {shortWork} from '../../lib/business-os/agent-presence';
import {monthlyCents} from '../../lib/business-os/ceo-home-model';
import {AgentPanel,type AgentMode} from '../visual-team';
import IphoneSheet from '../iphone-sheet';
import {rooms,worldState,type RoomId} from './model';
import styles from './world.module.css';
const Canvas=dynamic(()=>import('./canvas'),{ssr:false,loading:()=> <div className={styles.viewport}><p className={styles.canvasMessage}>Loading the campus…</p></div>});
const Content=dynamic(()=>import('../daily-content-queue'));
const Inbox=dynamic(()=>import('../inbox-panel'));
const money=(n:number|null|undefined)=>n==null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n/100);
const time=(at:string|null|undefined)=>at?new Date(at).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET':'Unverified';
const eventLabels:Record<string,string>={agent_run_started:'Started work',agent_run_completed:'Saved a result',agent_run_failed:'Needs attention',agent_handoff_created:'Saved a handoff',job_queued:'Work accepted',job_started:'Picked up a request',job_completed:'Request completed',job_failed:'Request failed',approval_requested:'Decision needed',buffer_publish_checked:'Delivery checked',buffer_publish_unknown:'Delivery needs reconciliation',run_lease_expired:'Run stopped reporting',job_lease_expired:'Job stopped reporting'};
function locationSelection(){const p=new URLSearchParams(location.search);return {room:rooms.find(r=>r.id===p.get('room'))?.id||null,agent:p.get('agent'),metric:p.get('metric')};}
export default function World(){
 const [data,setData]=useState<CeoHome|null>(null),[error,setError]=useState(''),[offline,setOffline]=useState(false),[loading,setLoading]=useState(false),[clock,setClock]=useState(Date.now());
 const [room,setRoom]=useState<RoomId|null>(null),[agent,setAgent]=useState<string|null>(null),[metric,setMetric]=useState<string|null>(null),[mode,setMode]=useState<AgentMode>('work');
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState('');
 const mounted=useRef(false),request=useRef<AbortController|null>(null),lock=useRef(false),lastStamp=useRef(0),lastStart=useRef(0);
 const refresh=useCallback(async(force=false)=>{
  if(request.current||!navigator.onLine||document.hidden||(!force&&Date.now()-lastStart.current<10000))return;
  lastStart.current=Date.now();const c=new AbortController();request.current=c;setLoading(true);const timeout=setTimeout(()=>c.abort(),18000);
  try{const r=await fetch('/api/owner/dashboard',{cache:'no-store',credentials:'same-origin',signal:c.signal});if(r.status===401){setData(null);throw Error('Connect this browser from your private Telegram chat: send /connect, open its button, then Connect this device.');}if(!r.ok)throw Error('Business records could not be refreshed. No work was started.');const next=await r.json() as CeoHome;
   if(!Array.isArray(next.team)||!Array.isArray(next.issues)||!Number.isFinite(Date.parse(next.checkedAt)))throw Error('The saved snapshot could not be verified.');
   if(mounted.current&&!c.signal.aborted&&Date.parse(next.checkedAt)>=lastStamp.current){lastStamp.current=Date.parse(next.checkedAt);setData(next);setError('');setClock(Date.now());}
  }catch(e){if(mounted.current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'The record check timed out. Reconnect to verify activity.');}
  finally{clearTimeout(timeout);if(request.current===c)request.current=null;if(mounted.current)setLoading(false);}
 },[]);
 useEffect(()=>{
  mounted.current=true;try{localStorage.setItem('darth-owner-view-v1','world');}catch{}
  const read=()=>{const s=locationSelection();setRoom(s.room);setAgent(s.agent);setMetric(s.metric);};read();
  const connectivity=()=>{setOffline(!navigator.onLine);if(navigator.onLine&&!document.hidden)void refresh();};connectivity();
  const tick=setInterval(()=>{setClock(Date.now());if(!document.hidden)void refresh();},45000);
  const age=setInterval(()=>{if(!document.hidden)setClock(Date.now());},5000);
  window.addEventListener('popstate',read);window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);document.addEventListener('visibilitychange',connectivity);
  return()=>{mounted.current=false;request.current?.abort();clearInterval(tick);clearInterval(age);window.removeEventListener('popstate',read);window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity);document.removeEventListener('visibilitychange',connectivity);};
 },[refresh]);
 const navigate=useCallback((r:RoomId|null,a:string|null=null,m:string|null=null,replace=false)=>{
  const url=new URL(location.href);for(const [k,v] of [['room',r],['agent',a],['metric',m]] as Array<[string,string|null]>)if(v)url.searchParams.set(k,v);else url.searchParams.delete(k);
  history[replace?'replaceState':'pushState'](history.state,'',url);setRoom(r);setAgent(a);setMetric(m);setNotice('');
 },[]);
 const close=useCallback(()=>navigate(agent?room:null,null,null,true),[agent,room,navigate]);
 const openAgent=(id:string,next:AgentMode='work')=>{setMode(next);navigate(room,id);};
 const state=data?worldState(data,!offline&&!error,clock):null;
 const fresh=Boolean(state?.fresh),selectedRoom=rooms.find(r=>r.id===room),selectedAgent=data?.team.find(a=>a.id===agent);
 const modal=Boolean(selectedAgent||selectedRoom||metric),f=data?.finances;
 async function act(operation:'pause'|'work'){
  if(lock.current||!fresh||!data)return;lock.current=true;setBusy(operation);setNotice('');const c=new AbortController(),timeout=setTimeout(()=>c.abort(),20000);
  try{const r=await fetch('/api/owner/command',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:c.signal,body:JSON.stringify({operation,...(operation==='pause'?{paused:!data.desk?.paused}:{})})});const result=await r.json();if(!r.ok)throw Error(result.error||'Request not confirmed.');if(operation==='pause'&&result.paused!==!data.desk?.paused)throw Error('Pause state not confirmed.');setNotice(operation==='pause'?(result.paused?'New work paused. In-flight provider calls may finish.':'New work resumed within existing policies and budgets.'):'One bounded worker check requested. Watch the saved job below for its actual result.');await refresh(true);}
  catch(e){setNotice(e instanceof Error&&e.name!=='AbortError'?e.message:'Response not confirmed. Check saved state before retrying.');}
  finally{clearTimeout(timeout);lock.current=false;if(mounted.current)setBusy('');}
 }
 const title=metric==='health'?'System health':metric==='revenue'?'Revenue & growth':metric==='customers'?'Active customers':metric==='bills'?'Business bills':selectedRoom?.name||'HQ World';
 return <main id='main-content' className={styles.world}>
  <div inert={modal}>
   <header className={styles.header}><Link href='/owner' onClick={()=>{try{localStorage.setItem('darth-owner-view-v1','dashboard');}catch{}}} className={styles.brand}><Image src='/darth-algo-social-logo.png' alt='Darth Algo' width={34} height={34}/><span>DARTH ALGO<small>YOUR BUSINESS, IN MOTION</small></span></Link><div className={styles.switch}><span aria-current='page'><Compass size={15}/>HQ World</span><Link href='/owner' onClick={()=>{try{localStorage.setItem('darth-owner-view-v1','dashboard');}catch{}}}>Dashboard</Link></div></header>
   <div className={styles.heading}><div><p className={styles.eyebrow}>COMMAND CAMPUS / 01</p><h1 id='hq-heading' tabIndex={-1}>Welcome to your world<span>.</span></h1><p>See the work. Meet your crew. Move the business forward.</p></div><button className={styles.refresh} disabled={loading||offline} onClick={()=>void refresh(true)} aria-label='Refresh headquarters'><RefreshCw size={17}/>{loading?'Checking…':'Refresh'}</button></div>
   {(error||offline)&&<p className={styles.alert} role='alert'>{offline?'Disconnected. New actions are disabled until you reconnect.':error}</p>}
   <div className={styles.metrics}>
    <button onClick={()=>navigate(null,null,'revenue')}><span>Revenue <ArrowUpRight size={14}/></span><strong>{money(f?.income.incomeCents)}</strong><small>Gross receipts · last 30 days</small></button>
    <button onClick={()=>navigate(null,null,'customers')}><span>Active customers <ArrowUpRight size={14}/></span><strong>{f?.customers.active??'Unknown'}</strong><small>Unique subscribing customers</small></button>
    <button onClick={()=>navigate(null,null,'bills')}><span>Business bills <ArrowUpRight size={14}/></span><strong>{money(state?.billsCents)}</strong><small>Confirmed monthly subtotal · {state?.missingBills??'unknown'} unverified</small></button>
    <button onClick={()=>navigate(null,null,'health')}><span>System health <Activity size={14}/></span><strong data-health={state?.health.rating}>{state?.health.rating||'Unknown'}</strong><small>{data?`Checked ${time(data.checkedAt)}`:'Reading real records…'}</small></button>
   </div>
   <div className={styles.campusLayout}><div><Canvas agents={state?.agents||[]} onRoom={id=>navigate(id)} onAgent={id=>openAgent(id)} focus={room}/><p className={styles.legend}><i/>Online = verified active work <span>•</span> Offline = idle <span>•</span> Walking is decorative</p></div>
    <aside className={styles.missions}><div className={styles.missionTitle}><span>TODAY AT HQ</span><span>{state?.fresh?'Connected':'Unverified'}</span></div><h2>Your mission feed</h2>
     <button className={styles.goal} onClick={()=>navigate(null,null,'revenue')}><span>Next growth milestone<ArrowUpRight size={15}/></span><strong>{money(state?.goal.targetCents??100000)}</strong><div className={styles.track}><i style={{width:`${(state?.goal.fraction??0)*100}%`}}/></div><small>30-day gross receipts · {state?.goal.fraction==null?'Unverified':`${Math.round(state.goal.fraction*100)}% of next goal`}</small></button>
     {data?.issues.slice(0,2).map(i=><button className={styles.mission} key={i.id} onClick={()=>navigate(rooms.find(r=>r.agents.includes(i.department))?.id||'operations')}><i data-tone='attention'/><span><b>{shortWork(i.title,65)}</b><small>{i.needsOwner?'Needs your decision':'Needs attention'}</small></span><ChevronRight size={15}/></button>)}
     {state?.events.slice(0,4).map(e=><button key={e.id} className={styles.mission} onClick={()=>data?.team.some(a=>a.id===e.actor)?openAgent(e.actor):navigate('operations')}><i/><span><b>{eventLabels[e.event]||e.event.replaceAll('_',' ')}</b><small>{e.actor.replaceAll('_',' ')} · {time(e.at)}</small></span></button>)}
     {!state?.events.length&&<p className={styles.muted}>No activity has been verified in this snapshot.</p>}
     <button className={styles.fullButton} onClick={()=>navigate('ceo')}>Open Command Center <ArrowUpRight size={16}/></button>
    </aside>
   </div>
   <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>EIGHT DEPARTMENTS. ONE BUSINESS.</p><h2>Where do you want to go?</h2></div><small>All controls are also available here.</small></div>
   <nav aria-label='Departments' className={styles.departments}>{rooms.map((r,i)=>{const crew=state?.agents.filter(a=>a.room===r.id)||[],count=crew.filter(a=>a.active).length;return <button key={r.id} onClick={()=>navigate(r.id)}><span className={styles.roomNumber}>{String(i+1).padStart(2,'0')}</span><span><b>{r.short}</b><small>{!state?.fresh?'Unverified':count?`${count} Online`:crew.length?`${crew.length} agents · ${crew.some(a=>['Blocked','Error','Not configured'].includes(a.status))?'Needs attention':'Offline'}`:'Existing workflow'}</small></span><ArrowUpRight size={17}/></button>;})}</nav>
   <footer className={styles.footer}><span>Private owner headquarters</span><span>Jobs run through your existing server-side workers.</span><Link href='/owner'>Original dashboard <ArrowUpRight size={13}/></Link></footer>
  </div>
  {modal&&<IphoneSheet onClose={close}>{selectedAgent&&data?<AgentPanel key={selectedAgent.id} agent={selectedAgent} mode={mode} onMode={setMode} fresh={fresh} now={clock} issues={data.issues} onClose={close} onChanged={()=>void refresh(true)}/>:<section className={styles.panel} role='dialog' aria-modal='true' aria-labelledby='world-panel-title'>
   <div className={styles.panelHeader}><div><p className={styles.eyebrow}>{selectedRoom?'DEPARTMENT WORKSPACE':'VERIFIED BUSINESS RECORDS'}</p><h2 id='world-panel-title'>{title}</h2></div><button aria-label='Close department' onClick={close}><X size={21}/></button></div>
   {selectedRoom&&<><p className={styles.muted}>{selectedRoom.description}</p><Link className={styles.workspace} href={selectedRoom.href}>Open full workspace<ArrowUpRight size={17}/></Link></>}
   {!fresh&&<p className={styles.alert}>Live status is unavailable. Refresh before sending work or decisions.</p>}
   {notice&&<p className={styles.notice} role='status'>{notice}</p>}
   {selectedRoom&&state&&data&&<>
    {state.agents.filter(a=>a.room===room).map(a=><article className={styles.crew} key={a.id}><div><span className={styles.avatar} aria-hidden='true'>{a.name.slice(0,1)}</span><div><h3>{a.name}</h3><small data-status={a.status}>{a.status}{data.desk?.paused&&a.active?' · future jobs paused':''}</small></div></div><p>{shortWork(data.team.find(t=>t.id===a.id)?.current?.message||a.stage,150)}</p><small>Last evidence: {time(a.observedAt)}</small><div className={styles.actions}><button onClick={()=>openAgent(a.id)}>View work</button><button onClick={()=>openAgent(a.id,'message')}><MessageCircle size={15}/>Message</button><button onClick={()=>openAgent(a.id,'assign')}><Plus size={15}/>Give work</button></div><details><summary>Saved job and output</summary><p>Stage: {a.stage}</p><p>Job: {a.jobId||'No queued or running job'}</p><p>Run: {a.runId||'No run recorded'}</p><p>Output: {a.outputId||'No completed output recorded'}</p>{a.errorCode&&<p>Error: {a.errorCode}</p>}</details></article>)}
    {data.issues.filter(i=>selectedRoom.agents.includes(i.department)||(room==='publishing'&&i.department==='content')).map(i=><details key={i.id} className={styles.issue}><summary>{i.title}</summary><p>{i.reason}</p><Link href={i.href.startsWith('#')?selectedRoom.href:i.href}>{i.action}</Link></details>)}
    {room==='content'&&<Content active disabled={!fresh} onOpenAgent={()=>openAgent('content','message')}/>}
    {room==='publishing'&&<><p className={styles.notice}>9 AM and 3 PM · America/New_York. Opening this room never starts a publication.</p><Content active disabled={!fresh} onOpenAgent={()=>openAgent('content','message')}/><h3>Saved delivery receipts</h3>{data.desk?.receipts.map(r=><article className={styles.receipt} key={r.id}><strong>{r.network?.toUpperCase()||'Destination unreported'}</strong><p>Receipt {r.id} · {time(r.sentAt)}</p>{safeReceiptUrl(r.url)?<a href={safeReceiptUrl(r.url)!} target='_blank' rel='noreferrer'>View verified published content <ArrowUpRight size={14}/></a>:<p>Public URL not recorded. Check the destination evidence.</p>}</article>)}{!data.desk?.receipts.length&&<p>No verified published links in the latest snapshot.</p>}</>}
    {room==='ceo'&&<>{data.brief&&<details className={styles.issue}><summary>Latest daily briefing</summary><p className={styles.pre}>{String(data.brief.body)}</p></details>}<Inbox active disabled={!fresh} onOpenAgent={id=>openAgent(id,'message')}/></>}
    {room==='research'&&<><h3>Saved recommendations</h3>{data.suggestions.map(s=><details className={styles.issue} key={s.id}><summary>{s.title} · {s.state}</summary><p>{s.deliverable}</p><p className={styles.pre}>{s.sourceBrief}</p>{s.result&&<p className={styles.pre}>{s.result}</p>}<Link href='/owner?view=inbox'>Review exact version & decision</Link></details>)}{!data.suggestions.length&&<p>No saved recommendation in the latest snapshot.</p>}<Link className={styles.workspace} href='/owner/research'>Sources & handoff history <ArrowUpRight size={16}/></Link></>}
    {room==='indicators'&&<p className={styles.notice}>Open the Indicator Lab for genuine chart previews, private Pine copy/download and version-specific release decisions. A draft is not proof of TradingView compilation or publication.</p>}
    {room==='support'&&<div className={styles.actions}><Link href='/owner/retention'>Support & payment recovery</Link><Link href='/owner/welcome'>Welcome workflow</Link></div>}
    {room==='operations'&&<><h3>Worker & workflow evidence</h3><p>Scheduler: {data.desk?.scheduler?.status||'Unverified'} · {time(data.desk?.scheduler?.lastSeenAt)}</p><p>{data.desk?.counts.queued??'Unknown'} saved requests queued. In-flight jobs are separate from the pause control.</p><div className={styles.actions}><button disabled={!fresh||Boolean(busy)||!data.desk} onClick={()=>void act('pause')}>{data.desk?.paused?<Play size={15}/>:<Pause size={15}/>} {data.desk?.paused?'Resume':'Pause'} new work</button><button disabled={!fresh||Boolean(busy)||data.desk?.paused||!data.desk?.counts.queued||data.desk?.budget.available===false} onClick={()=>void act('work')}><Play size={15}/>Run now</button></div><p className={styles.muted}>Run now checks one eligible saved job. It is unavailable while paused, without queued work, or when the existing budget is exhausted. It does not create a new job.</p>{data.desk?.services.map(s=><details className={styles.issue} key={s.id}><summary>{s.id} · {time(s.observedAt)}</summary><pre>{JSON.stringify(s.details,null,2)}</pre></details>)}</>}
   </>}
   {(metric==='revenue'||room==='finance')&&<><h3>{money(f?.income.incomeCents)} collected</h3><p>{f?.income.scope||'Revenue source unavailable.'}</p><p>{time(f?.income.periodStart)} – {time(f?.income.periodEnd)}</p><p>Source check: {time(f?.income.checkedAt)}</p><h3>Next goal: {money(state?.goal.targetCents??100000)}</h3><p>Rolling 30-day USD gross receipts. Goals: $1,000, $3,000, $9,000, then triple. All business features remain accessible at every level. {state?.goal.level?`${state.goal.level} milestone threshold(s) reached in this snapshot.`:''}</p></>}
   {(metric==='customers'||room==='finance')&&<><h3>{f?.customers.active??'Unknown'} active subscribing customers</h3><p>{f?.customers.trials??'Unknown'} trials, counted separately.</p><p>{f?.customers.scope||'Customer records are unavailable.'}</p><p>Updated: {time(f?.customers.checkedAt)}. Lifetime customers, followers and all-time customers are not included in this metric.</p></>}
   {(metric==='bills'||room==='finance')&&<><h3>{money(state?.billsCents)} confirmed monthly subtotal</h3><p>Coverage is incomplete until all business invoices are verified. Estimates are excluded from the top summary.</p>{f?.bills.map(b=><div className={styles.bill} key={b.id}><span><b>{b.name}</b><small>{b.source} · {b.status}</small><small>Verified: {time(b.verifiedAt)}</small></span><b>{b.status==='confirmed'?money(monthlyCents(b)):b.status==='estimated'?`${money(monthlyCents(b))} estimate`:'Unknown'}</b></div>)}<Link className={styles.workspace} href='/owner?view=bills'>Manage company bill records <ArrowUpRight size={16}/></Link></>}
   {metric==='health'&&<><h3>{state?.health.rating||'Unknown'}</h3><p>{state?.health.reason||'Waiting for business records.'}</p><p>Active runs must have evidence within five minutes. A fresh dashboard snapshot must be less than 90 seconds old. Offline agents are idle, not automatically broken.</p>{data?.issues.map(i=><details className={styles.issue} key={i.id}><summary>{i.title}</summary><p>{i.reason}</p><Link href={i.href.startsWith('#')?'/owner?view=team':i.href}>{i.action}</Link></details>)}{data?.partial.length? <p>Unavailable sources: {data.partial.join(', ')}</p>:null}</>}
   <button className={styles.fullButton} onClick={close}><ArrowLeft size={16}/>Back to campus</button>
  </section>}</IphoneSheet>}
 </main>;
}
