'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Bot,Search,Headphones,ChartNoAxesCombined,PenLine,Users,Workflow,Code2,TrendingUp,MessageCircle,Plus,ArrowUpRight,X,AlertCircle,FileText,Send} from 'lucide-react';
import type {CeoHome} from '../lib/business-os/ceo-home';
import {agentPresence,shortWork,type Presence} from '../lib/business-os/agent-presence';
import styles from './visual-hq.module.css';
export type AgentMode='work'|'message'|'assign';
type TeamAgent=CeoHome['team'][number];
const icons:Record<string,typeof Bot>={ceo:Bot,growth:TrendingUp,content:PenLine,support:Headphones,affiliates:Users,analytics:ChartNoAxesCombined,research:Search,indicator_builder:Code2,operations:Workflow};
const formatTime=(at:string|null|undefined)=>at?new Date(at).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET':'No completed work yet';
export function PresenceBadge({presence}:{presence:Presence}){return <span className={`${styles.presence} ${presence.active?styles.online:presence.label==='Unknown'?styles.unknown:styles.offline}`}><i aria-hidden='true'/>{presence.label}</span>;}
export function VisualTeam({team,fresh,now,queue,onOpen}:{team:TeamAgent[];fresh:boolean;now:number;queue:CeoHome['queue'];onOpen:(id:string,mode:AgentMode)=>void}){
 const [filter,setFilter]=useState<'all'|'online'|'offline'|'attention'>('all');
 const rows=team.map(agent=>({agent,presence:agentPresence(agent,fresh,now)}));
 const visible=rows.filter(({agent,presence})=>filter==='all'||filter==='online'&&presence.active||filter==='offline'&&presence.label==='Offline'||filter==='attention'&&(presence.warning||agent.health.rating==='Poor'||agent.health.rating==='Unknown'));
 return <section className={styles.team} aria-labelledby='visual-team-title'>
  <div className={styles.sectionTitle}><div><h2 id='visual-team-title'>Your agents</h2><p>{fresh?`${rows.filter(r=>r.presence.active).length} Online · ${rows.filter(r=>r.presence.label==='Offline').length} Offline`:'Checking live status'} · Tap a card to see its work.</p></div></div>
  <div className={styles.filters} aria-label='Filter agents'>{(['all','online','offline','attention'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'All':f==='online'?'Online':f==='offline'?'Offline':'Needs attention'}</button>)}</div>
  <div className={styles.agents}>{visible.map(({agent:a,presence:p})=>{const Icon=icons[a.id]||Bot,art=a.id==='content'?queue.find(c=>c.image):null;const task=shortWork(a.current?.message||a.next?.message||a.task?.title||a.completed?.brief,95)||'No assignment saved.';return <article key={a.id} className={`${styles.agent} ${p.active?styles.agentActive:''}`}>
   <div className={styles.agentTop}><span className={styles.roleIcon}><Icon size={21}/></span><PresenceBadge presence={p}/></div><h3>{a.name}</h3>
   <button className={styles.workPreview} onClick={()=>onOpen(a.id,'work')} aria-label={`View ${a.name} work`}>
    {art?.image?<><Image src={art.image} alt='Next saved content campaign preview, not a live generation' width={270} height={338} unoptimized/><span className={styles.previewCaption}>Next campaign preview</span></>:<div className={styles.documentPreview}><FileText size={24}/><span>{a.current?'CURRENT ASSIGNMENT':a.next?'UP NEXT':a.completed?'LAST SAVED WORK':'WORKSPACE'}</span><strong>{task}</strong></div>}
   </button><div className={styles.workStep}><i className={p.active?styles.pulse:undefined}/><span>{p.step}</span></div>
   {(p.warning||a.health.rating==='Poor')&&<p className={styles.smallWarning}><AlertCircle size={13}/>{p.warning||'Needs attention'}</p>}
   <div className={styles.agentActions}><button onClick={()=>onOpen(a.id,'message')}><MessageCircle size={15}/>Message</button><button onClick={()=>onOpen(a.id,'assign')}><Plus size={15}/>Give work</button></div>
  </article>;})}</div>{!visible.length&&<p className={styles.empty}>No agents match this view.</p>}
  <p className={styles.help}>Online means actively working. Offline means idle—not necessarily broken. Unverified activity is marked Unknown.</p>
 </section>;
}
type ChatMessage={id:string;department:string;role:string;body:string;created_at:string};
export function AgentPanel({agent,mode,onMode,fresh,now,issues,onClose,onChanged,preview,worldStatus}:{agent:TeamAgent;preview?:{image:string;text:string};worldStatus?:string;mode:AgentMode;onMode:(mode:AgentMode)=>void;fresh:boolean;now:number;issues:CeoHome['issues'];onClose:()=>void;onChanged:()=>void}){
 const [draft,setDraft]=useState(''),[messages,setMessages]=useState<ChatMessage[]>([]),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const locked=useRef(false),active=useRef<AbortController|null>(null),mounted=useRef(false),composer=useRef<HTMLTextAreaElement|null>(null);
 const intent=useRef<{message:string;key:string}|null>(null),storage=`darth-agent-draft:${agent.id}`;
 const presence=agentPresence(agent,fresh,now),Icon=icons[agent.id]||Bot;
 useEffect(()=>{mounted.current=true;try{const saved=JSON.parse(sessionStorage.getItem(storage)||'null');if(saved&&typeof saved.draft==='string'){setDraft(saved.draft);if(typeof saved.intent?.key==='string'&&typeof saved.intent?.message==='string')intent.current=saved.intent;}}catch{}return()=>{mounted.current=false;active.current?.abort();};},[storage]);
 useEffect(()=>{if(mode!=='work')composer.current?.focus();},[mode]);
 useEffect(()=>{
  if(mode==='work')return;
  const controller=new AbortController();let reading=false;
  const read=async()=>{if(reading||document.visibilityState!=='visible')return;reading=true;setLoading(true);try{const r=await fetch('/api/owner/command',{cache:'no-store',credentials:'same-origin',signal:controller.signal});if(!r.ok)throw Error();const d=await r.json();if(!Array.isArray(d.messages))throw Error();if(!controller.signal.aborted)setMessages(d.messages.filter((m:ChatMessage)=>m.department===agent.id&&typeof m.body==='string').reverse());}catch{if(!controller.signal.aborted)setNotice('Messages could not be refreshed. Your draft is still here.');}finally{reading=false;if(!controller.signal.aborted)setLoading(false);}};
  void read();const timer=setInterval(()=>void read(),5000);return()=>{controller.abort();clearInterval(timer);};
 },[agent.id,mode]);
 const persist=(value:string,pending= intent.current)=>{try{sessionStorage.setItem(storage,JSON.stringify({draft:value,intent:pending}));}catch{}};
 function change(value:string){setDraft(value);if(intent.current?.message!==value.trim())intent.current=null;persist(value);}
 async function send(){
  const message=draft.trim();if(!message||message.length>4000||locked.current||!fresh)return;
  locked.current=true;setBusy(true);setNotice('');
  if(intent.current?.message!==message)intent.current={message,key:'agent-card:'+crypto.randomUUID()};persist(draft);
  const controller=new AbortController();active.current=controller;const timeout=setTimeout(()=>controller.abort(),20000);
  try{const r=await fetch('/api/owner/command',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({operation:'message',department:agent.id,message,requestKey:intent.current.key})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error||'Request not confirmed.');if(typeof d.id!=='string'||typeof d.status!=='string')throw Error('Request not confirmed.');if(mounted.current){setNotice(`Request ${d.id} saved · ${d.status}. Online appears when a worker actually starts it.`);setDraft('');intent.current=null;persist('',null);onChanged();}}
  catch(e){if(mounted.current)setNotice(`${e instanceof Error&&e.name!=='AbortError'?e.message:'The response was not confirmed.'} An unchanged retry checks the same request, not a duplicate.`);}
  finally{clearTimeout(timeout);locked.current=false;if(mounted.current)setBusy(false);}
 }
 const ownIssues=issues.filter(i=>i.department===agent.id);
 return <section role='dialog' aria-modal='true' aria-labelledby='agent-title' className={styles.sheet}>
  <div className={styles.sheetHeader}><span className={styles.roleIcon}><Icon size={23}/></span><div><h2 id='agent-title'>{agent.name}</h2><PresenceBadge presence={presence}/></div><button className={styles.iconButton} aria-label='Close agent' onClick={onClose}><X size={22}/></button></div>
  <div className={styles.tabs} aria-label='Agent workspace'>{(['work','message','assign'] as const).map(m=><button key={m} aria-pressed={mode===m} onClick={()=>onMode(m)}>{m==='work'?'Work':m==='message'?'Messages':'Give work'}</button>)}</div>
  {notice&&<p className={styles.notice} role='status'>{notice}</p>}
  {mode==='work'?<div className={styles.sheetBody}>
   {worldStatus&&<p className={styles.help}>{worldStatus}</p>}
   {preview&&<div className={styles.taskCard}><Image src={preview.image} alt={preview.text} width={540} height={675} unoptimized style={{width:'100%',maxHeight:360,objectFit:'contain',borderRadius:14}}/><small>{preview.text}</small></div>}

   <div className={styles.taskCard}><span>{presence.active?'WORKING NOW':'CURRENT STATUS'}</span><strong>{presence.step}</strong><p>{shortWork(agent.current?.message||agent.next?.message||agent.task?.title,180)||'No new assignment waiting.'}</p></div>
   <div className={styles.workFacts}><span><b>{agent.waiting}</b>Queued requests</span><span><b>{agent.completed?'Saved':'—'}</b>Last result</span></div>
   {ownIssues.length>0&&<details className={styles.details}><summary><AlertCircle size={15}/>{ownIssues.length} thing{ownIssues.length===1?'':'s'} to check</summary>{ownIssues.map(i=><div key={i.id}><h4>{i.title}</h4><p>{i.reason}</p>{!i.href.startsWith('#')&&<Link href={i.href}>{i.action}<ArrowUpRight size={14}/></Link>}</div>)}</details>}
   <details className={styles.details}><summary>Latest saved work <FileText size={15}/></summary><small>{formatTime(agent.completed?.finishedAt)}</small><p className={styles.pre}>{agent.completed?.brief||'No completed result is recorded yet.'}</p></details>
   <details className={styles.details}><summary>Role & health details</summary><p>{agent.mandate}</p><p>{agent.health.reason}</p></details>
   <div className={styles.sheetActions}><button onClick={()=>onMode('assign')}><Plus size={17}/>Give work</button><button onClick={()=>onMode('message')}><MessageCircle size={17}/>Message</button></div>
   <Link className={styles.workspaceLink} href={agent.id==='indicator_builder'?'/owner/indicators':agent.id==='research'?'/owner/research':'/owner/team'}>Full workspace<ArrowUpRight size={15}/></Link>
  </div>:<>
   <div className={styles.chat} aria-label='Saved agent messages'>{mode==='message'?(messages.length?messages.slice(-12).map(m=><article key={m.id} className={m.role==='owner'?styles.ownerMessage:styles.agentMessage}><small>{m.role==='owner'?'You':agent.name}</small>{m.body.length>500?<details><summary>{shortWork(m.body,180)}</summary><p className={styles.pre}>{m.body}</p></details>:<p>{m.body}</p>}</article>):<p className={styles.empty}>{loading?'Loading saved messages…':'No saved messages for this agent yet.'}</p>):<div className={styles.taskCard}><span>NEW ASSIGNMENT</span><strong>What should {agent.name} do?</strong><p>Be specific about the result you need. Existing permissions and spending limits stay in place.</p></div>}</div>
   <form className={styles.composer} onSubmit={e=>{e.preventDefault();void send();}}><label htmlFor='agent-message'>{mode==='assign'?'Your assignment':'Message this agent'}</label><textarea id='agent-message' ref={composer} rows={3} maxLength={4000} value={draft} disabled={busy} onChange={e=>change(e.target.value)} placeholder={mode==='assign'?'Create… Review… Improve…':'Ask a question or give feedback…'}/><div><small>{!fresh?'Reconnect before sending.':'Requests are saved before work starts.'}</small><button type='submit' disabled={!fresh||busy||!draft.trim()}><Send size={16}/>{busy?'Saving…':mode==='assign'?'Give work':'Send'}</button></div></form>
  </>}
 </section>;
}
