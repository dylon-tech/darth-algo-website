'use client';
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Activity,ArrowUpRight,Bot,ChevronRight,Ellipsis,FlaskConical,House,Inbox,Plus,RefreshCw,Send,Wallet,Wrench,X} from 'lucide-react';
import type {CeoHome} from '../lib/business-os/ceo-home';
import {agentHealth,systemHealth,monthlyCents,type Bill,type Health} from '../lib/business-os/ceo-home-model';
import {agentPresence,shortWork} from '../lib/business-os/agent-presence';
import {ownerViewFromSearch,ownerViewParam,type OwnerView} from './video-studio-model';
import FinanceChart from './finance-chart';
import DailyContentQueue from './daily-content-queue';
import VideoStudio from './video-studio';
import InstallApp from './install-app';
import LabPanel from './lab-panel';
import InboxPanel from './inbox-panel';
import {VisualTeam,AgentPanel,type AgentMode} from './visual-team';
import IphoneSheet from './iphone-sheet';
import styles from './iphone-home.module.css';
import polish from './iphone-polish.module.css';
const money=(cents:number|null|undefined)=>cents==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const time=(value:string|null|undefined)=>value?new Date(value).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET':'Not yet recorded';
const titles:Record<OwnerView,string>={home:'Headquarters',team:'Your team',queue:'Studio',bills:'Money overview',lab:'Indicator Lab',inbox:'Inbox'};
type Panel='more'|'health'|'brief'|'ideas'|null;
const pageScroll=()=>document.body.style.position==='fixed'?Math.abs(Number.parseFloat(document.body.style.top)||0):window.scrollY;
/** A presentation upgrade, not a new agent runtime or an alternate approval path. */
export default function IphoneHome({workspace}:{workspace:ReactNode}){
 const [view,setView]=useState<OwnerView>('home'),[data,setData]=useState<CeoHome|null>(null),[auth,setAuth]=useState<boolean|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[refreshing,setRefreshing]=useState(false),[offline,setOffline]=useState(false),[clock,setClock]=useState(0);
 const [panel,setPanel]=useState<Panel>(null),[selected,setSelected]=useState<string|null>(null),[mode,setMode]=useState<AgentMode>('work'),[bill,setBill]=useState<Bill|null>(null);
 const [advanced,setAdvanced]=useState(false),[studioOpen,setStudioOpen]=useState(false),[pending,setPending]=useState('');
 const mounted=useRef(false),request=useRef<AbortController|null>(null),writing=useRef(false),scroll=useRef<Partial<Record<OwnerView,number>>>({}),currentView=useRef<OwnerView>('home');
 const stale=!data||offline||Boolean(error)||!Number.isFinite(Date.parse(data.checkedAt))||clock-Date.parse(data.checkedAt)>75000||Date.parse(data.checkedAt)-clock>30000;
 const close=useCallback(()=>{setPanel(null);setSelected(null);setBill(null);},[]);
 const modal=Boolean(panel||selected||bill);
 const refresh=useCallback(async()=>{
  if(request.current)return;
  const c=new AbortController();request.current=c;setRefreshing(true);let timeoutReached=false;
  const timeout=setTimeout(()=>{timeoutReached=true;c.abort();},20000);
  try{
   const response=await fetch('/api/owner/dashboard',{cache:'no-store',credentials:'same-origin',signal:c.signal});
   if(response.status===401){if(mounted.current){setAuth(false);setData(null);}return;}
   if(!response.ok)throw Error('Live data could not be refreshed.');
   const next=await response.json() as CeoHome;
   if(!Number.isFinite(Date.parse(next.checkedAt))||!Array.isArray(next.team)||!Array.isArray(next.issues))throw Error('The response could not be verified.');
   if(mounted.current&&!c.signal.aborted){setData(next);setAuth(true);setError('');setClock(Date.now());}
  }catch{if(mounted.current&&(!c.signal.aborted||timeoutReached))setError('Live data could not be refreshed. Saved figures may be out of date.');}
  finally{clearTimeout(timeout);if(request.current===c)request.current=null;if(mounted.current)setRefreshing(false);}
 },[]);
 useEffect(()=>{
  mounted.current=true;
  const previousRestoration=history.scrollRestoration;history.scrollRestoration='manual';
  const readLocation=()=>{const next=ownerViewFromSearch(location.search);scroll.current[currentView.current]=pageScroll();currentView.current=next;setView(next);setStudioOpen(new URLSearchParams(location.search).get('view')==='studio');setAdvanced(false);close();requestAnimationFrame(()=>window.scrollTo({top:scroll.current[next]||0,behavior:'instant'}));};
  const connection=()=>{setOffline(!navigator.onLine);setClock(Date.now());if(navigator.onLine)void refresh();};
  const visible=()=>{if(document.visibilityState==='visible'){setClock(Date.now());void refresh();}};
  readLocation();setOffline(!navigator.onLine);void refresh();
  const timer=setInterval(()=>{setClock(Date.now());if(document.visibilityState==='visible'&&navigator.onLine)void refresh();},15000);
  window.addEventListener('popstate',readLocation);window.addEventListener('online',connection);window.addEventListener('offline',connection);document.addEventListener('visibilitychange',visible);
  return()=>{mounted.current=false;clearInterval(timer);request.current?.abort();request.current=null;history.scrollRestoration=previousRestoration;window.removeEventListener('popstate',readLocation);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);document.removeEventListener('visibilitychange',visible);};
 },[close,refresh]);
 function navigate(next:OwnerView){
  close();setAdvanced(false);
  if(currentView.current===next){requestAnimationFrame(()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));return;}
  scroll.current[currentView.current]=pageScroll();currentView.current=next;setView(next);
  const url=new URL(location.href);url.searchParams.set('view',next==='queue'?'queue':ownerViewParam(next));url.hash='';history.pushState(history.state,'',url);
  requestAnimationFrame(()=>{window.scrollTo({top:scroll.current[next]||0,behavior:'instant'});document.getElementById('hq-heading')?.focus({preventScroll:true});});
 }
 const openAgent=(id:string,next:AgentMode='work')=>{setPanel(null);setBill(null);setMode(next);setSelected(id);};
 async function act(operation:'bill'|'recover'|'suggestion',body:Record<string,unknown>={}){
  if(writing.current||stale)return;writing.current=true;setPending(operation);setNotice('');
  const c=new AbortController(),timeout=setTimeout(()=>c.abort(),20000);
  try{const r=await fetch('/api/owner/dashboard',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:c.signal,body:JSON.stringify({operation,...body})});const result=await r.json();if(!r.ok)throw Error(result.error||'The change was not confirmed.');if(mounted.current){setNotice(result.message||'Saved.');if(operation==='bill')setBill(null);await refresh();}}
  catch(e){if(mounted.current)setNotice(e instanceof Error&&e.name!=='AbortError'?e.message:'No confirmation received. Check the saved record before retrying.');}
  finally{clearTimeout(timeout);writing.current=false;if(mounted.current)setPending('');}
 }
 if(auth===false)return <>{workspace}</>;
 if(advanced)return <><div className={styles.returnBar}><button onClick={()=>{setAdvanced(false);void refresh();}}>← Back to HQ</button></div>{workspace}</>;
 if(!data)return <main className={styles.app}><div className={styles.loading} aria-busy={!error}><Image src='/darth-algo-social-logo.png' width={48} height={48} alt='Darth Algo'/><h1>{error?'Let’s reconnect':'Opening Headquarters'}</h1><p>{error||'Checking your business records.'}</p>{error?<button onClick={()=>void refresh()}>Try again</button>:<div className={styles.skeleton} aria-hidden='true'/>}</div></main>;
 const team=data.team.map(a=>({...a,health:stale?{rating:'Unknown',reason:'Live status is out of date.'} as Health:data.desk?agentHealth(a,data.desk,data.issues,clock):a.health}));
 const health=stale?{rating:'Unknown',reason:'Refresh required before this status can be trusted.'} as Health:systemHealth(team.map(a=>a.health),data.desk,data.issues,data.partial);
 const agent=team.find(a=>a.id===selected),f=data.finances,needs=data.issues.filter(i=>i.needsOwner);
 const completed=team.filter(a=>a.completed).sort((a,b)=>Date.parse(b.completed!.finishedAt||'')-Date.parse(a.completed!.finishedAt||''));
 const online=team.filter(a=>agentPresence(a,!stale&&Boolean(data.desk),clock).active).length;
 const pendingIdeas=data.suggestions.filter(s=>s.state==='pending').length;
 const openInternal=(href:string)=>{if(href==='#team'||href==='#queue'||href==='#bills'){navigate(href==='#team'?'team':href==='#queue'?'queue':'bills');return true;}return false;};
 return <main className={`${styles.app} ${polish.polish}`} id='main-content'>
  <div className={styles.content} inert={modal}>
   <header className={styles.toolbar}><div className={styles.brand}><Image src='/darth-algo-social-logo.png' width={30} height={30} alt='Darth Algo'/><span>Darth Algo</span></div><div><button className={styles.icon} aria-label={refreshing?'Refreshing dashboard':'Refresh dashboard'} disabled={refreshing||offline} onClick={()=>void refresh()}><RefreshCw size={20} className={refreshing?styles.spinning:undefined}/></button><button className={styles.icon} aria-label='More controls' onClick={()=>setPanel('more')}><Ellipsis size={23}/></button></div></header>
   <div className={styles.intro}><h1 id='hq-heading' tabIndex={-1}>{titles[view]}</h1><p>{stale?'Update unavailable':`Updated ${time(data.checkedAt)}`}</p></div>
   {offline&&<p className={styles.alert} role='status'>You are offline. Saved figures may be out of date; new work is disabled until you reconnect.</p>}
   {error&&<p className={styles.alert} role='alert'>{error}</p>}{notice&&!modal&&<p className={styles.notice} role='status'>{notice}</p>}
   <div hidden={view!=='home'&&view!=='bills'} className={styles.finance}><FinanceChart finances={f}/></div>
   <section hidden={view!=='home'} className={styles.screen} aria-label='Business overview'>
    <div className={styles.stats}><button onClick={()=>navigate('bills')}><span>Current customers</span><strong>{f?.customers.active??'—'}</strong><small>Active subscribers <ChevronRight size={13}/></small></button><button onClick={()=>navigate('bills')}><span>Monthly bill budget</span><strong>{money(f?.expenses.monthlyCents)}</strong><small>{f?.expenses.estimated?'Includes estimates':'Company expenses'} <ChevronRight size={13}/></small></button></div>
    <div className={styles.group}>
     <button className={styles.listRow} onClick={()=>setPanel('health')} aria-label={`System health: ${health.rating}. View details`}><span className={styles.rowIcon} data-health={health.rating}><Activity size={21}/></span><span><strong>System health</strong><small>{stale?'Refresh to check':needs.length?`${needs.length} owner decision${needs.length===1?'':'s'} waiting`:`${data.desk?.counts.completedToday??'—'} internal results saved today`}</small></span><b className={styles.healthLabel} data-health={health.rating}>{health.rating}</b><ChevronRight size={17}/></button>
     <button className={styles.listRow} onClick={()=>navigate('team')}><span className={styles.rowIcon}><Bot size={21}/></span><span><strong>Your agents</strong><small>{stale?'Status unavailable':`${online} Online · ${data.desk?.counts.queued??'—'} requests queued`}</small></span><ChevronRight size={17}/></button>
    </div>
    <div className={styles.sectionHeading}><h2>Today’s work</h2><button onClick={()=>setPanel('brief')}>See all</button></div>
    <div className={styles.group}>
     <button className={styles.listRow} onClick={()=>navigate('queue')}>{data.queue[0]?.image?<Image className={styles.artThumb} src={data.queue[0].image} alt='Saved campaign artwork preview' width={58} height={72} unoptimized/>:<span className={styles.rowIcon}><Send size={21}/></span>}<span><strong>Daily content</strong><small>Review, disapprove or request a remake</small><small>9 AM & 3 PM Eastern</small></span><ChevronRight size={17}/></button>
     {completed.slice(0,2).map(a=><button key={a.id} className={styles.listRow} onClick={()=>openAgent(a.id)}><span className={styles.rowIcon}><Inbox size={20}/></span><span><strong>{a.name}</strong><small className={styles.oneLine}>{shortWork(a.completed?.brief,100)||'Internal work saved.'}</small></span><ChevronRight size={17}/></button>)}
     <button className={styles.listRow} onClick={()=>navigate('inbox')}><span className={styles.rowIcon}><Inbox size={21}/></span><span><strong>Your inbox</strong><small>{data.desk?.counts.needsOwner??'—'} pending decisions · agent conversations</small></span><ChevronRight size={17}/></button>
     {pendingIdeas>0&&<button className={styles.listRow} onClick={()=>setPanel('ideas')}><span className={styles.rowIcon}><Plus size={21}/></span><span><strong>Ideas to review</strong><small>{pendingIdeas} saved proposal{pendingIdeas===1?'':'s'}</small></span><ChevronRight size={17}/></button>}
    </div>
   </section>
   <div hidden={view!=='lab'} className={styles.screen}><LabPanel active={view==='lab'}/></div>
   <div hidden={view!=='inbox'} className={styles.screen}><InboxPanel active={view==='inbox'} disabled={stale} onOpenAgent={id=>openAgent(id,'message')}/></div>
   <div hidden={view!=='team'} className={styles.screen}><VisualTeam team={team} fresh={!stale&&Boolean(data.desk)} now={clock} queue={data.queue} onOpen={openAgent}/></div>
   <div hidden={view!=='queue'} className={styles.screen}>
    <DailyContentQueue active={view==='queue'} disabled={stale} onOpenAgent={()=>openAgent('content','message')}/>
    <details className={styles.groupDetails} open={studioOpen} onToggle={e=>setStudioOpen(e.currentTarget.open)}><summary>Create a video <Plus size={18}/></summary><VideoStudio active={view==='queue'&&studioOpen} disabled={stale} onOpenTeam={()=>{navigate('team');openAgent('content','assign');}}/></details>
   </div>
   <section hidden={view!=='bills'} className={styles.screen} aria-label='Company finances'>
    <div className={styles.stats}><div><span>Current customers</span><strong>{f?.customers.active??'—'}</strong><small>{f?.customers.trials??'—'} trials</small></div><div><span>Expenses / Income</span><strong>{f?.expenses.ratio!=null?`${f.expenses.ratio.toFixed(1)}%`:'—'}</strong><small>{f?.expenses.complete?'30-day equivalent costs':'Estimated / incomplete 30-day costs'}</small></div></div>
    <div className={styles.metricDefinitions}><p><strong>Collected revenue</strong><span>{money(f?.income.incomeCents)} · gross receipts over 30 days</span></p><p><strong>Active subscribing customers</strong><span>{f?.customers.active??'—'} unique Stripe customer IDs · {f?.customers.trials??'—'} trials separately</span></p><p><strong>MRR, payouts & all-time customers</strong><span>Not verified by this feed. Collected revenue is not recurring revenue or a processor payout.</span></p></div>
    <div className={styles.sectionHeading}><h2>Company subscriptions</h2><button disabled={!f||stale} onClick={()=>{setNotice('');setBill({id:'',name:'',amountCents:null,cadence:'monthly',status:'unverified',source:'',verifiedAt:null});}}>Add bill</button></div>
    <p className={styles.caption}>{money(f?.expenses.monthlyCents)} monthly budget{f?` · ${f.expenses.estimated} estimated · ${f.expenses.missing} missing`:''}</p>
    <div className={styles.group}>{f?.bills.map(b=><button key={b.id} className={styles.listRow} onClick={()=>{setNotice('');setBill(b);}}><span><strong>{b.name}</strong><small>{b.status==='inactive'?'Inactive':b.status==='unverified'?'Needs verification':`${b.status==='estimated'?'Estimated · ':''}${money(b.amountCents)} / ${b.cadence==='annual'?'year':b.cadence==='weekly'?'week':'month'}`}</small></span><b>{b.status==='confirmed'||b.status==='estimated'?`${money(monthlyCents(b))}/mo`:'—'}</b><ChevronRight size={16}/></button>)}</div>
    <details className={styles.groupDetails}><summary>Sources & estimates <ChevronRight size={17}/></summary><div><p>{f?.income.scope||'Financial records could not be read.'} {f?.customers.scope}</p><p>Monthly bills are equivalent budgets, including estimates. Annual bills are divided by 12. Expenses / Income compares 30 days of prorated operating costs with 30-day income, using a 365.25-day year; this is a budget comparison, not paid invoices, net profit or personal debt-to-income.</p>{Boolean(f?.income.otherCurrencies.length)&&<p>Excluded currencies: {f?.income.otherCurrencies.join(', ').toUpperCase()}. No currency conversion is applied.</p>}<p>Income checked {time(f?.income.checkedAt)}. Customers checked {time(f?.customers.checkedAt)}. {f?.billSync}</p></div></details>
   </section>
  </div>
  <nav className={styles.nav} aria-label='CEO navigation' inert={modal}>{([{id:'home',label:'Home',Icon:House},{id:'team',label:'Agents',Icon:Bot},{id:'queue',label:'Studio',Icon:Send},{id:'lab',label:'Lab',Icon:FlaskConical},{id:'inbox',label:'Inbox',Icon:Inbox}] as const).map(({id,label,Icon})=><button key={id} aria-current={view===id||(id==='home'&&view==='bills')?'page':undefined} onClick={()=>navigate(id)}><span><Icon size={22}/></span>{label}</button>)}</nav>
  {modal&&<IphoneSheet onClose={close}>
   {agent?<AgentPanel key={agent.id} agent={agent} mode={mode} onMode={setMode} fresh={!stale&&Boolean(data.desk)} now={clock} issues={data.issues} onClose={close} onChanged={()=>void refresh()}/>:bill?<form className={styles.dialog} role='dialog' aria-modal='true' aria-labelledby='bill-title' onSubmit={e=>{e.preventDefault();void act('bill',{bill:{...bill,id:bill.id||bill.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,70)}});}}>
    <div className={styles.dialogTitle}><h2 id='bill-title'>Company bill</h2><button className={styles.icon} type='button' aria-label='Close bill' onClick={close}><X size={21}/></button></div>
    <label>Name<input required maxLength={100} value={bill.name} onChange={e=>setBill({...bill,name:e.target.value})}/></label>
    <label>Charge in USD<input inputMode='decimal' type='number' min='0' max='100000' step='0.01' value={bill.amountCents===null?'':bill.amountCents/100} onChange={e=>setBill({...bill,amountCents:e.target.value===''?null:Math.round(Number(e.target.value)*100)})}/></label>
    <label>Billing cycle<select value={bill.cadence} onChange={e=>setBill({...bill,cadence:e.target.value as Bill['cadence']})}><option value='monthly'>Monthly</option><option value='annual'>Yearly</option><option value='weekly'>Weekly</option></select></label>
    <label>Status<select value={bill.status} onChange={e=>setBill({...bill,status:e.target.value as Bill['status']})}><option value='estimated'>Estimated expense</option><option value='unverified'>Needs verification</option><option value='confirmed'>Confirmed company expense</option><option value='inactive'>Inactive / not a company expense</option></select></label>
    <p className={styles.caption}>{bill.source}{bill.estimatedAt?` · Estimated ${time(bill.estimatedAt)}`:''}{bill.sourceUrl&&<> · <a href={bill.sourceUrl} target='_blank' rel='noreferrer'>Pricing source</a></>}</p><p className={styles.caption}>Updates your records, not the provider subscription.</p>{notice&&<p className={styles.notice} role='status'>{notice}</p>}<button className={styles.primary} disabled={Boolean(pending)||stale}>{pending==='bill'?'Saving…':'Save bill'}</button>
   </form>:<section className={styles.dialog} role='dialog' aria-modal='true' aria-labelledby='panel-title'>
    <div className={styles.dialogTitle}><h2 id='panel-title'>{panel==='more'?'Your app':panel==='health'?'System health':panel==='brief'?'Saved work':'Research ideas'}</h2><button className={styles.icon} aria-label='Close panel' onClick={close}><X size={21}/></button></div>
    {notice&&<p className={styles.notice} role='status'>{notice}</p>}
    {panel==='more'&&<><div className={styles.group}><button className={styles.listRow} onClick={()=>navigate('bills')}><Wallet size={21}/><span><strong>Money details & bills</strong></span><ChevronRight size={17}/></button><button className={styles.listRow} onClick={()=>navigate('inbox')}><Inbox size={21}/><span><strong>Inbox & approvals</strong></span><ChevronRight size={17}/></button><button className={styles.listRow} onClick={()=>setPanel('health')}><Activity size={21}/><span><strong>System health</strong><small>{health.rating}</small></span><ChevronRight size={17}/></button><button className={styles.listRow} onClick={()=>setPanel('brief')}><Inbox size={21}/><span><strong>Saved work & briefing</strong></span><ChevronRight size={17}/></button><button className={styles.listRow} onClick={()=>setPanel('ideas')}><Plus size={21}/><span><strong>Research ideas</strong><small>{pendingIdeas} awaiting a decision</small></span><ChevronRight size={17}/></button><button className={styles.listRow} onClick={()=>{close();navigate('queue');setStudioOpen(true);}}><Send size={21}/><span><strong>Create a video</strong></span><ChevronRight size={17}/></button><button className={styles.listRow} onClick={()=>{close();setAdvanced(true);}}><Ellipsis size={21}/><span><strong>Advanced controls</strong><small>Connections, approvals & operations</small></span><ChevronRight size={17}/></button></div><InstallApp/><p className={styles.caption}>Private Home Screen web app. Refreshes while open; financial sources may be cached for up to 15 minutes.</p></>}
    {panel==='health'&&<><div className={styles.healthSummary} data-health={health.rating}><Activity size={26}/><h3>{health.rating}</h3><p>{health.reason}</p></div><p className={styles.caption}>{data.desk?.counts.completedToday??'—'} internal results today · {data.desk?.counts.queued??'—'} queued. Saved work is not proof of an external post or sale.</p><button className={styles.primary} disabled={Boolean(pending)||stale} onClick={()=>void act('recover')}><Wrench size={17}/>{pending==='recover'?'Requesting recovery…':'Fix agents'}</button><p className={styles.caption}>Requests eligible recovery. The maintenance watch checks hourly; uncertain outcomes remain held.</p>{data.issues.map(i=><details className={styles.groupDetails} key={i.id}><summary>{i.title}<ChevronRight size={15}/></summary><div><p>{i.reason}</p><Link href={i.href} onClick={e=>{if(openInternal(i.href))e.preventDefault();}}>{i.action}<ArrowUpRight size={15}/></Link></div></details>)}{data.partial.length>0&&<p className={styles.alert}>Unavailable sources: {data.partial.join(', ')}. Health is unverified until these checks succeed.</p>}</>}
    {panel==='brief'&&<><div className={styles.group}>{completed.map(a=><button className={styles.listRow} key={a.id} onClick={()=>openAgent(a.id)}><span><strong>{a.name}</strong><small>{shortWork(a.completed?.brief,115)||'Internal work saved.'}</small><small>{time(a.completed?.finishedAt)}</small></span><ChevronRight size={17}/></button>)}</div>{!completed.length&&<p className={styles.caption}>No completed agent work has been recorded yet.</p>}{data.brief&&<details className={styles.groupDetails}><summary>Daily briefing <ChevronRight size={17}/></summary><div className={styles.pre}>{String(data.brief.body)}</div></details>}</>}
    {panel==='ideas'&&<>{!data.suggestions.length&&<p className={styles.caption}>Research has not saved a proposal yet.</p>}{data.suggestions.map(s=><article key={s.id} className={styles.idea}><h3>{s.title}</h3><small>{String(s.state).replaceAll('_',' ')}</small><p>{s.deliverable}</p><details className={styles.groupDetails}><summary>Research behind this idea <ChevronRight size={16}/></summary><div className={styles.pre}>{s.sourceBrief}</div></details>{s.result&&<details className={styles.groupDetails}><summary>Completed result <ChevronRight size={16}/></summary><div className={styles.pre}>{s.result}</div></details>}{s.error&&<p className={styles.alert}>{s.error.replaceAll('_',' ')}</p>}{s.state==='pending'&&<div className={styles.actions}><button className={styles.primary} disabled={Boolean(pending)||stale} onClick={()=>void act('suggestion',{id:s.id,hash:s.hash,decision:'approved'})}>Approve & create</button><button disabled={Boolean(pending)||stale} onClick={()=>void act('suggestion',{id:s.id,hash:s.hash,decision:'declined'})}>Decline</button></div>}</article>)}</>}
   </section>}
  </IphoneSheet>}
 </main>;
}
