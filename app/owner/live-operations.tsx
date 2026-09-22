'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, ArrowUpRight, Bot, ChevronRight, CircleAlert, FlaskConical, LayoutDashboard, RefreshCw, Send, Settings2, ShieldCheck } from 'lucide-react';
import { operationState, recentTimestamp, type OperationsSnapshot, type OperationState } from '../lib/business-os/operations-model';
import styles from './live-operations.module.css';

const networkNames: Record<string,string> = {x:'X',instagram:'Instagram',threads:'Threads',whop:'Whop Home'};
const roleNames: Record<string,string> = {ceo:'Team lead',growth:'Growth',content:'Content',support:'Support',affiliates:'Affiliates',analytics:'Analytics',research:'Research',operations:'Operations'};
function stamp(value: string | null) { return value ? new Date(value).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET' : 'No recorded check'; }
function Badge({state}: {state: OperationState}) { return <span className={`${styles.badge} ${styles[state.tone]}`}>{state.label}</span>; }

export default function LiveOperations({workspace}: {workspace: ReactNode}) {
  const [snapshot,setSnapshot] = useState<OperationsSnapshot|null>(null);
  const [loading,setLoading] = useState(true);
  const [authorized,setAuthorized] = useState<boolean|null>(null);
  const [error,setError] = useState('');
  const [working,setWorking] = useState(false);
  const [showWorkspace,setShowWorkspace] = useState(false);
  const [clock,setClock] = useState(Date.now());
  const inFlight = useRef(false);
  const controller = useRef<AbortController|null>(null);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current=true;
    const request=new AbortController();controller.current=request;
    const timeout=setTimeout(()=>request.abort(),25000);
    setWorking(true);
    try {
      const response=await fetch('/api/owner/operations',{cache:'no-store',credentials:'same-origin',signal:request.signal});
      if (response.status===401) {setAuthorized(false);setSnapshot(null);return;}
      if (!response.ok) throw new Error('Live status is unavailable. Previously loaded results are not a fresh check.');
      const data=await response.json() as OperationsSnapshot;
      if (!data.checkedAt || !Array.isArray(data.deliveries) || !Array.isArray(data.team)) throw new Error('The live status response needs a check.');
      setSnapshot(data);setAuthorized(true);setError('');setClock(Date.now());
    } catch (cause) {
      setError(cause instanceof Error && cause.name==='AbortError' ? 'The live check timed out. No action was sent.' : cause instanceof Error ? cause.message : 'Live status could not be read.');
    } finally {clearTimeout(timeout);inFlight.current=false;setWorking(false);setLoading(false);}
  },[]);
  useEffect(()=>{
    void refresh();
    const timer=setInterval(()=>{setClock(Date.now());if(document.visibilityState==='visible')void refresh();},30000);
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    document.addEventListener('visibilitychange',visible);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);controller.current?.abort();};
  },[refresh]);

  if (authorized===false) return <>{workspace}</>;
  if (showWorkspace) return <><div className={styles.returnBar}><button onClick={()=>{setShowWorkspace(false);void refresh();}}><LayoutDashboard size={17}/> Back to live overview</button><span>Existing controls · existing limits</span></div>{workspace}</>;
  if (loading && !snapshot) return <main className={styles.shell}><div className={styles.loading}><Activity size={24}/><h1>Opening your command center</h1><p>Reading saved work and publication receipts.</p></div></main>;
  if (!snapshot) return <main className={styles.shell}><div className={styles.loading}><CircleAlert size={25}/><h1>Live status needs a check</h1><p>{error||'No operations data was returned.'}</p><button className={styles.primary} onClick={()=>void refresh()}>Try again</button><button className={styles.secondary} onClick={()=>setShowWorkspace(true)}>Open existing controls</button></div></main>;

  const stale=Boolean(error)||!recentTimestamp(snapshot.checkedAt,clock,75000);
  const schedulerFresh=!stale&&snapshot.scheduler.fresh&&recentTimestamp(snapshot.scheduler.lastSeenAt,clock);
  const publicationsKnown=!snapshot.partial.includes('social_receipts')&&!snapshot.partial.includes('whop_receipts');
  const published=snapshot.deliveries.filter(item=>item.published).length;
  const lab=snapshot.indicator;
  const labState=stale?operationState('stale'):operationState(lab.stage);
  const browserBlocked=lab.browserStartsRemaining===0;
  const schedulerState:OperationState = snapshot.scheduler.paused===true?operationState('paused'):!snapshot.scheduler.enabled?operationState('disabled'):!schedulerFresh?operationState('stale'):{label:'Scheduler checking in',tone:'good'};
  const contentState=snapshot.partial.includes('content')?operationState('unknown'):stale?operationState('stale'):snapshot.content.prepared?operationState('prepared'):operationState('queued');
  return <main className={styles.shell}>
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.wordmark}><span className={styles.mark}>DA</span><div><strong>DARTH ALGO</strong><span>CEO COMMAND CENTER</span></div></div>
        <button className={styles.iconButton} aria-label='Refresh live status' disabled={working} onClick={()=>void refresh()}><RefreshCw size={19} className={working?styles.spin:''}/></button>
      </header>
      <section className={styles.hero}>
        <div className={styles.eyebrow}><span className={styles.dot}/> YOUR BUSINESS. ONE VIEW.</div>
        <h1>See the work.<br/><span>Run the business.</span></h1>
        <p>What the team has done, what comes next, and where you are needed.</p>
        <div className={styles.heroFooter}><Badge state={schedulerState}/><span>Worker: {stamp(snapshot.scheduler.lastSeenAt)}</span></div>
        <button className={styles.primary} onClick={()=>setShowWorkspace(true)}>Manage my business <ArrowUpRight size={18}/></button>
      </section>
      <div className={styles.checkLine} aria-live='polite'><ShieldCheck size={15}/><span>{stale?'STALE VIEW — refresh required':`Read ${stamp(snapshot.checkedAt)}`} · {snapshot.environment}</span></div>
      {error&&<div className={styles.warning} role='alert'>{error}</div>}
      {snapshot.partial.length>0&&<div className={styles.warning}>Some sources could not be read: {snapshot.partial.join(', ').replaceAll('_',' ')}. Missing data is not zero activity.</div>}
      <section className={styles.metrics} aria-label='Today at a glance'>
        <div><span>Confirmed posts today</span><strong>{publicationsKnown?published:'—'}<small> / 4</small></strong><p>Instagram · X · Threads · Whop</p></div>
        <div><span>Indicator review queue</span><strong>{snapshot.partial.includes('indicators')?'—':lab.candidates.filter(item=>item.status==='pending').length}</strong><p>Among the six latest prototypes</p></div>
      </section>
      <section id='publication' className={styles.card}>
        <div className={styles.sectionHeading}><div className={styles.sectionIcon}><Send size={19}/></div><div><h2>Content & publishing</h2><p>One campaign. Four destinations.</p></div><Badge state={contentState}/></div>
        {snapshot.content.previewUrl&&<div className={styles.preview}><Image src={snapshot.content.previewUrl} alt='First slide of the actual saved Darth Algo daily campaign' width={1080} height={1350} unoptimized className={styles.previewImage}/><div><span className={styles.eyebrow}>TODAY’S SAVED CAMPAIGN</span><h3>{snapshot.content.assets} prepared slides</h3><p>{snapshot.content.caption||'Caption available in existing controls.'}</p><span className={styles.small}>Prepared {stamp(snapshot.content.preparedAt)}</span></div></div>}
        <div className={styles.deliveryList}>{snapshot.deliveries.map(item=><div className={styles.delivery} key={item.network}><div><strong>{networkNames[item.network]||item.network}</strong><span>{item.published?`Receipt ${item.postId?.slice(0,18)}`:'No confirmed publication today'}</span></div><div className={styles.deliveryRight}><Badge state={stale?operationState('stale'):operationState(item.state,item.published)}/>{item.url&&<a href={item.url} target='_blank' rel='noopener noreferrer'>View post <ArrowUpRight size={13}/></a>}</div></div>)}</div>
        <p className={styles.note}>Posting opens at 9 AM Eastern. Per-platform spacing and uncertain prior receipts may delay delivery. Prepared is not published. Whop targets Home, not Chats.</p>
      </section>
      <section id='lab' className={styles.card}>
        <div className={styles.sectionHeading}><div className={styles.sectionIcon}><FlaskConical size={21}/></div><div><h2>Indicator Lab</h2><p>Research → build → test → approve → release</p></div><Badge state={labState}/></div>
        <div className={styles.blockerGrid}>
          <div><span>Research handoff</span><strong>{lab.stage==='no_supported_idea'?'Stronger evidence needed':lab.researchState?.replaceAll('_',' ')||'Not verified'}</strong><p>Original ideas only. No copied scripts or invented demand.</p></div>
          <div><span>TradingView test capacity</span><strong>{lab.browserStartsRemaining===null?'Not verified':`${lab.browserStartsRemaining} approved starts left`}</strong><p>{browserBlocked?'The approved browser-session allowance is exhausted.':lab.loginVerified?'Saved login previously verified; new code still needs testing.':'Saved TradingView sign-in is not verified.'}</p></div>
          <div><span>Public releases</span><strong>{lab.releaseExecutorConnected?'Executor connected':'Publishing worker needed'}</strong><p>New indicators stay free. A tested, approved package is required.</p></div>
        </div>
        {lab.candidates.length>0&&<div className={styles.candidates}>{lab.candidates.map(item=><div key={item.id}><div><strong>{item.name}</strong><span>{stamp(item.createdAt)}</span></div><Badge state={operationState(item.status)}/>{item.url&&<a href={item.url} target='_blank' rel='noopener noreferrer' aria-label={`Open ${item.name} on TradingView`}><ArrowUpRight size={17}/></a>}</div>)}</div>}
        {lab.lastHandoff&&<p className={styles.note}>Last build handoff: {lab.lastHandoff.replaceAll('_',' ')} · {stamp(lab.lastHandoffAt)}</p>}
        <div className={styles.actions}><Link href='/owner/indicators'>Open Indicator Lab <ChevronRight size={16}/></Link><Link href='/owner/browser'>TradingView connection <ArrowUpRight size={15}/></Link></div>
      </section>
      <section id='team' className={styles.card}>
        <div className={styles.sectionHeading}><div className={styles.sectionIcon}><Bot size={21}/></div><div><h2>Your specialist team</h2><p>Actual app jobs and the latest saved run</p></div></div>
        <div className={styles.team}>{snapshot.team.map(agent=><div key={agent.id}><div><strong>{roleNames[agent.id]||agent.id}</strong><span>{agent.running?`${agent.running} active request(s)`:agent.queued?`${agent.queued} waiting request(s)`:stamp(agent.finishedAt)}</span></div><Badge state={stale?operationState('stale'):operationState(agent.state)}/></div>)}</div>
        <p className={styles.note}>A finished request is not proof of a successful external action. Separate ChatGPT scheduled tasks are not represented as live app workers.</p>
        <button className={styles.secondary} onClick={()=>setShowWorkspace(true)}>Tasks, approvals & business numbers <ChevronRight size={16}/></button>
      </section>
      <section className={styles.card}>
        <div className={styles.sectionHeading}><div className={styles.sectionIcon}><CircleAlert size={21}/></div><div><h2>Open loops</h2><p>Only unfinished work and decisions that still matter</p></div><Badge state={snapshot.openLoops.length?{label:`${snapshot.openLoops.length} open`,tone:'wait'}:{label:'Clear',tone:'good'}}/></div>
        <div className={styles.deliveryList}>{snapshot.openLoops.length?snapshot.openLoops.map(loop=><div className={styles.delivery} key={loop.id}><div><strong>{loop.title}</strong><span>{loop.why}</span><span>{loop.founderAction?`Needs you: ${loop.founderAction}`:`Next: ${loop.resumeAction}`}</span></div><div className={styles.deliveryRight}><Badge state={{label:loop.founderAction?'Needs you':'Team follow-up',tone:loop.severity==='critical'?'bad':'wait'}}/></div></div>):<p className={styles.note}>No unresolved work is currently recorded.</p>}</div>
      </section>
      <footer className={styles.footer}>Private owner access · Existing spending limits unchanged · Refreshes while visible</footer>
    </div>
    <nav className={styles.bottomNav} aria-label='Command center navigation'><a href='#publication'><Send size={19}/><span>Publishing</span></a><a href='#lab'><FlaskConical size={20}/><span>Indicators</span></a><a href='#team'><Bot size={20}/><span>Team</span></a><Link href='/owner/connections'><Settings2 size={19}/><span>Connections</span></Link></nav>
  </main>;
}
