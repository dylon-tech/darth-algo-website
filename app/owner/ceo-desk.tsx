'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, ArrowLeft, ArrowUpRight, Bot, CheckCircle2, ChevronDown, Clock3, LockKeyhole, Pause, Play, RefreshCw, Settings2, ShieldCheck, Workflow } from 'lucide-react';
import CommandCenter from './command-center';
import InstallApp from './install-app';
import { agentView, freshAt, safeReceiptUrl, serviceView, words, type DeskSnapshot, type ViewState } from '../lib/business-os/desk-state';
import styles from './ceo-desk.module.css';
const serviceNames: Record<string,string> = {social:'Social Publisher',telegram:'Telegram Desk',indicators:'Indicator Lab',research:'YouTube Research',handoffs:'Content Handoffs',team:'Team Scheduler'};
const roles: Record<string,string> = {ceo:'Team Leader',growth:'Growth',content:'Content',support:'Support',affiliates:'Affiliates',analytics:'Analytics',research:'Research',operations:'Operations'};
const events: Record<string,string> = {agent_run_started:'Started work',agent_run_completed:'Saved an internal deliverable',agent_run_failed:'Run needs attention',agent_handoff_created:'Passed work to another agent',job_queued:'Saved a request',job_started:'Picked up a request',job_completed:'Finished a request',job_failed:'Request did not finish',approval_requested:'Requested your decision',buffer_publish_checked:'Checked a publishing receipt',buffer_publish_unknown:'Publishing receipt needs a check',run_lease_expired:'Run stopped reporting',job_lease_expired:'Request stopped reporting'};
const dateText=(value:string|null|undefined)=>value ? new Date(value).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET' : 'No saved time';
function Badge({state}:{state:ViewState}) {return <span className={`${styles.badge} ${styles[state.tone]}`}><i/>{state.label}</span>;}
export default function CeoDesk() {
  const [data,setData]=useState<DeskSnapshot|null>(null), [clock,setClock]=useState(0), [receivedAt,setReceivedAt]=useState(0);
  const [auth,setAuth]=useState<boolean|null>(null), [error,setError]=useState(''), [controls,setControls]=useState(false), [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<'overview'|'team'|'activity'>('overview');
  const active=useRef<AbortController|null>(null), mounted=useRef(false);
  const refresh=useCallback(async()=>{
    if(active.current)return;
    const controller=new AbortController();active.current=controller;
    const timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch('/api/owner/live',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
      if(response.status===401){if(mounted.current && active.current===controller){setAuth(false);setData(null);}return;}
      if(!response.ok)throw Error('The live feed is unavailable. Saved information below may be out of date.');
      const next=await response.json() as DeskSnapshot;
      if(!Array.isArray(next.agents)||!next.checkedAt)throw Error('The live response could not be verified.');
      if(mounted.current && active.current===controller){setAuth(true);setData(next);setError('');setClock(Date.now());setReceivedAt(Date.now());}
    }catch(e){if(mounted.current && active.current===controller)setError(e instanceof Error && e.name!=='AbortError' ? e.message : 'The live check timed out. No work has been changed.');}
    finally{clearTimeout(timer);if(active.current===controller)active.current=null;}
  },[]);
  useEffect(()=>{
    mounted.current=true;void refresh();
    const timer=setInterval(()=>{setClock(Date.now());if(document.visibilityState==='visible'&&!controls)void refresh();},15000);
    const visible=()=>{if(document.visibilityState==='visible'){setClock(Date.now());void refresh();}};
    document.addEventListener('visibilitychange',visible);
    return()=>{mounted.current=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible);active.current?.abort();active.current=null;};
  },[refresh,controls]);
  const fresh=Boolean(data&&receivedAt&&clock-receivedAt<45000&&!error);
  const schedulerFresh=Boolean(data&&fresh&&freshAt(data.scheduler?.lastSeenAt,clock));
  async function togglePause(){
    if(!data||!fresh||busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/owner/command',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'pause',paused:!data.paused})});
      if(response.status===401){setAuth(false);setData(null);return;}
      const result=await response.json();
      if(!response.ok)throw Error(result.message||'The pause change could not be confirmed.');
      active.current?.abort();active.current=null;
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'The change could not be confirmed.');}finally{setBusy(false);}
  }
  if(auth===false)return <CommandCenter/>;
  if(controls)return <><div className={styles.returnBar}><button onClick={()=>setControls(false)}><ArrowLeft size={17}/>Back to live desk</button><span>Existing messages, approvals and business results</span></div><CommandCenter/></>;
  const states=data?.agents.map(agent=>({agent,state:agentView(agent,data,clock,fresh)}))||[];
  const needsAttention=states.filter(x=>x.state.tone==='warn');
  const serviceIssues=data?.services.filter(service=>serviceView(service,clock).tone==='warn')||[];
  const priority=(state:ViewState)=>state.label==='Working'||state.label==='Starting'?0:state.tone==='warn'?1:state.label==='Queued'?2:3;
  const visibleAgents=tab==='team'?states:[...states].sort((a,b)=>priority(a.state)-priority(b.state)).slice(0,3);
  const working=states.filter(x=>x.state.label==='Working'||x.state.label==='Starting').length;
  return <main id="main-content" className={styles.shell}><div className={styles.container}>
    <header className={styles.header}><div className={styles.brand}><Image src="/founder/darth-algo-color.jpg" alt="Darth Algo" width={54} height={54} priority unoptimized/><div><strong>DARTH ALGO</strong><span>CEO COMMAND CENTER</span></div></div><button className={styles.iconButton} onClick={()=>setControls(true)} aria-label="Open existing controls and messages"><Settings2 size={22}/></button></header>
    <nav className={styles.tabs} aria-label="CEO desk sections">{(['overview','team','activity'] as const).map(item=><button key={item} aria-current={tab===item?'page':undefined} onClick={()=>setTab(item)}>{item==='overview'?'Overview':item==='team'?'My team':'Activity'}</button>)}</nav>
    {error&&<div className={styles.alert} role="alert"><span>{error}</span><button onClick={()=>void refresh()}><RefreshCw size={16}/>Retry</button></div>}
    <section className={styles.hero}><div><div className={styles.eyebrow}><LockKeyhole size={13}/>PRIVATE OWNER DESK</div><h1>Your business.<br/><span>In view.</span></h1><p>Real work. Clear next steps. One place to check the team.</p></div><div className={styles.livePanel}><span className={`${styles.liveDot} ${schedulerFresh?styles.live:''}`}/><strong>{!data?'Connecting to your team':!fresh?'Update needs a check':data.paused?'Work is paused':!schedulerFresh?'Scheduler needs a check':working?`${working} ${working===1?'agent is':'agents are'} at work`:'Scheduler is checking in'}</strong><p>{data?`Scheduler last seen ${dateText(data.scheduler?.lastSeenAt)}`:'No agent activity is assumed while connecting.'}</p><small>Live feed refreshes every 15 seconds while open.</small><button onClick={()=>void refresh()}><RefreshCw size={15}/>Refresh status</button></div></section>
    <section className={styles.metrics} aria-label="Verified app activity counts">{[
      {label:'Working now',value:fresh?working:'—',icon:Activity},
      {label:'Queued requests',value:fresh?data?.counts.queued:'—',icon:Clock3},
      {label:'Work saved today',value:fresh?data?.counts.completedToday:'—',icon:CheckCircle2},
      {label:'Needs your decision',value:fresh?data?.counts.needsOwner:'—',icon:ShieldCheck},
    ].map(item=><article key={item.label}><item.icon size={18}/><strong>{item.value??'—'}</strong><span>{item.label}</span></article>)}</section>
    <p className={styles.scope}>Saved work means an internal deliverable, not a sale or published post. Today uses Eastern time.</p>
    {!data&&<section className={styles.panel}><h2>{error?'Unable to load the team':'Opening your live desk…'}</h2><p>No placeholder agents or invented activity will appear here.</p><button onClick={()=>setControls(true)}>Open existing command center<ArrowUpRight size={16}/></button></section>}
    {data&&tab==='overview'&&<>
      <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>THE NEXT THING TO HANDLE</span><h2>{!fresh?'Reconnect the live feed':data.counts.needsOwner?`${data.counts.needsOwner} decisions waiting`:serviceIssues.length||needsAttention.length?'Some work needs attention':'No decisions waiting'}</h2></div><button onClick={()=>setControls(true)}>Open controls<ArrowUpRight size={16}/></button></div><p>{!fresh?'Status labels stay unverified until a new read succeeds.':data.paused?'The owner pause is on. Resume only when you want existing authorized work to continue.':serviceIssues.length?`${serviceIssues.map(s=>serviceNames[s.id]||s.id).join(', ')} need a closer look. The exact reported issues are below.`:needsAttention.length?`${needsAttention.map(x=>x.agent.name).join(', ')} have a setup, failed-run or unverified-work state.`:'The dashboard is reading saved work and scheduler updates. It does not launch extra work when opened.'}</p>{data.decisions.slice(0,3).map(d=><div className={styles.decision} key={d.id}><ShieldCheck size={16}/><span>{d.summary||words(d.kind)}</span></div>)}<div className={styles.actionRow}><button disabled={!fresh||busy} onClick={()=>void togglePause()}>{data.paused?<Play size={16}/>:<Pause size={16}/>} {busy?'Confirming…':data.paused?'Resume existing work':'Pause app work'}</button><small>Existing permissions and spending limits stay in place.</small></div></section>
      <section><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>AUTOMATED WORKFLOWS</span><h2>What is actually running</h2></div><Workflow size={22}/></div><div className={styles.serviceGrid}>{data.services.map(service=>{const state=fresh?serviceView(service,clock):{label:'Update unavailable',tone:'warn' as const,detail:'Showing a saved observation.'};const deliveries=service.details.deliveries as Record<string,string>|undefined;return <article className={styles.serviceCard} key={service.id}><div className={styles.cardTop}><h3>{serviceNames[service.id]||words(service.id)}</h3><Badge state={state}/></div><p>{state.detail}</p>{deliveries&&<div className={styles.deliveryList}>{Object.entries(deliveries).map(([network,result])=><div key={network}><b>{network==='x'?'X':network==='whop'?'Whop':network[0].toUpperCase()+network.slice(1)}</b><span>{words(result)}</span></div>)}</div>}{service.id==='social'&&<small>Posts are scheduled for 9 AM and 3 PM ET; connection or delivery checks can delay a slot. Only confirmed receipts count as published.</small>}{service.id==='indicators'&&<Link href="/owner/indicators">Open Indicator Lab<ArrowUpRight size={14}/></Link>}<time>{dateText(service.observedAt)}</time></article>;})}</div>{!data.telemetryAvailable&&<p className={styles.empty}>Per-workflow telemetry has not reported yet. It will appear only after a scheduler check records a real result.</p>}<p className={styles.scope}>These are website workers. Scheduled ChatGPT assistants are separate and are not live-synced into this feed.</p></section>
      <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>PROOF, NOT ASSUMPTIONS</span><h2>Recent confirmed social posts</h2></div></div>{data.receipts.length?data.receipts.map(receipt=>{const url=safeReceiptUrl(receipt.url);return <div className={styles.receipt} key={receipt.id}><CheckCircle2 size={18}/><div><strong>{receipt.network?words(receipt.network).toUpperCase():'Social post'}</strong><small>{dateText(receipt.sentAt)}</small></div>{url?<a href={url} target="_blank" rel="noopener noreferrer">View post<ArrowUpRight size={15}/></a>:<span>Receipt saved; public URL unavailable</span>}</div>;}):<p className={styles.empty}>No confirmed Buffer publication receipt was returned. Prepared assets are not counted as published.</p>}</section>
    </>}
    {data&&(tab==='team'||tab==='overview')&&<section><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>{data.agents.length} REGISTERED APP ROLES</span><h2>Your team, assignment by assignment</h2></div>{tab==='overview'&&<button onClick={()=>setTab('team')}>See all {data.agents.length}<ArrowUpRight size={16}/></button>}</div><div className={styles.agentGrid}>{visibleAgents.map(({agent,state})=><article key={agent.id} className={styles.agentCard}><div className={styles.cardTop}><span className={styles.avatar}><Bot size={24}/><b>{agent.id.slice(0,2).toUpperCase()}</b></span><Badge state={state}/></div><h3>{agent.name}</h3><p className={styles.mandate}>{agent.mandate}</p><div className={styles.workBlock}><label>NOW</label><p>{agent.current?agent.current.message:state.detail}</p></div><div className={styles.workBlock}><label>UP NEXT{agent.waiting>1?` · ${agent.waiting} QUEUED`:''}</label><p>{agent.next?.message||agent.task?.title||'No saved next assignment.'}</p></div>{agent.completed?<details className={styles.output}><summary>Last saved work<ChevronDown size={15}/></summary><time>{dateText(agent.completed.finishedAt)}</time><pre>{agent.completed.brief||'A completed run is recorded; no readable brief was returned.'}</pre><small>Saved internal output excerpt. Not proof of external execution.</small></details>:<p className={styles.scope}>No completed app deliverable recorded yet.</p>}</article>)}</div></section>}
    {data&&tab==='activity'&&<section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>RECENT SAVED EVENTS</span><h2>The work trail</h2></div><Activity size={22}/></div>{data.activity.length?data.activity.map(item=><div className={styles.timeline} key={item.id}><i/><div><strong>{events[item.event]||words(item.event)}</strong><span>{roles[item.actor]||words(item.actor)}</span></div><time>{dateText(item.at)}</time></div>):<p className={styles.empty}>No matching activity records were returned.</p>}<p className={styles.scope}>Latest 18 matching records. A receipt check is not automatically a successful publication.</p></section>}
    <section className={styles.bottomCard}><div><h2>Your full command center is still here.</h2><p>Send work, read messages, review approvals and open your business results.</p></div><button onClick={()=>setControls(true)}>Messages & controls<ArrowUpRight size={17}/></button></section>
    <InstallApp/>
    <footer className={styles.footer}><span><LockKeyhole size={13}/>Private owner access</span><span>{data?`Data checked ${dateText(data.checkedAt)}`:'Waiting for an authenticated read'}</span></footer>
  </div></main>;
}
