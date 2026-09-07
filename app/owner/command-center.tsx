"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Activity, ArrowUpRight, Bot, Check, ChevronRight, CircleHelp, ClipboardList, Database, LockKeyhole, MessageSquare, Pause, Play, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import type { Evidence } from "../lib/business-os/sources";
import type { Department } from "../lib/business-os/policy";
import styles from "./owner.module.css";
import InstallApp from "./install-app";

type Agent={id:Department;mandate:string;state:string};
type Task={id:string;department:Department;title:string;status:string;priority:number;result?:string;result_kind?:string};
type Job={id:string;department:Department;message:string;status:string;created_at:string;error_code?:string};
type Approval={id:string;payload_hash:string;effective_status:string;expires_at:string;payload:{summary:string;details:string;kind:string;evidence:string[]}};
type Message={id:string;department:Department;role:string;body:string;created_at:string};
type Snapshot={agents:Agent[];tasks:Task[];approvals:Approval[];jobs:Job[];activity:Array<{id:string;actor:string;event:string;created_at:string;entity_id?:string}>;messages:Message[];briefs:Array<{day:string;body:string}>;outbox:Array<{id:string;status:string;error_code?:string}>;paused:boolean};
type Ready={checkedAt:string;environment:string;dataScope:string;evidence:Evidence[];blockers:string[];store:{status:string;tablesPresent:boolean|null;missingTables:string[]|null};ai:{enabled:boolean;credentialPresent:boolean;modelConfigured:boolean;connectivity:string};configuration:Record<string,boolean>};
const names:Record<Department,string>={ceo:"CEO",growth:"Growth",content:"Content",support:"Support",affiliates:"Affiliates",analytics:"Analytics",research:"Research",operations:"Operations"};
const sections=["Overview","Departments","Conversations","Decisions","Activity","Connections"] as const;
type Section=typeof sections[number];
const label=(text:string)=>text.replaceAll("_"," ");
const time=(date:string)=>new Date(date).toLocaleString();

export default function CommandCenter(){
  const [auth,setAuth]=useState<boolean|null>(null),[enabled,setEnabled]=useState(false),[section,setSection]=useState<Section>("Overview");
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[ready,setReady]=useState<Ready|null>(null),[department,setDepartment]=useState<Department>("ceo");
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const [revision,setRevision]=useState<Record<string,string>>({});
  const read=useCallback(async(path:string)=>{
    const response=await fetch(path,{cache:"no-store"});
    if(response.status===401){setAuth(false);throw new Error("Session expired. Sign in again.");}
    const data=await response.json();
    if(!response.ok)throw new Error(data.message || data.error || "Request failed");
    return data;
  },[]);
  const refresh=useCallback(async()=>{
    try{setSnapshot(await read("/api/owner/command"));setError("");}catch(e){setError((e as Error).message);}
  },[read]);
  const checkConnections=useCallback(async()=>{
    try{setReady(await read("/api/owner/command?view=readiness"));}catch(e){setError((e as Error).message);}
  },[read]);
  useEffect(()=>{fetch("/api/owner/session",{cache:"no-store"}).then(r=>r.json()).then(data=>{setAuth(data.authenticated);setEnabled(data.enabled);}).catch(()=>{setAuth(false);setError("Could not check owner access.");});},[]);
  useEffect(()=>{
    if(!auth)return;
    void refresh();void checkConnections();
    const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},15000);
    return()=>clearInterval(timer);
  },[auth,refresh,checkConnections]);
  async function action(body:Record<string,unknown>){
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/owner/command",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json();
      if(response.status===401)setAuth(false);
      if(!response.ok)throw new Error(result.message || result.error || "Action failed");
      setNotice(result.bot ? `Private bot @${result.bot.username || result.bot.id}: ${typeof result.webhook === "object" ? `${result.webhook.url ? "webhook configured" : "webhook not connected"}; ${result.webhook.pendingUpdates} pending updates` : "connection saved"}.` : result.message || (body.operation==="message" ? "Request saved to the durable queue." : body.operation==="work" ? "Worker requested. Watch the job status for the result." : "Saved."));
      await refresh();
      if(body.operation==="initialize")await checkConnections();
      return true;
    }catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}
  }
  async function logout(){await fetch("/api/owner/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation:"logout"})});setAuth(false);setSnapshot(null);setReady(null);}
  async function send(event:FormEvent){event.preventDefault();if(await action({operation:"message",department,message,requestKey:crypto.randomUUID()}))setMessage("");}
  const pending=snapshot?.approvals.filter(a=>a.effective_status==="pending") || [];
  const active=snapshot?.jobs.filter(j=>j.status==="running") || [];
  const waiting=snapshot?.jobs.filter(j=>j.status==="queued") || [];
  const problems=snapshot?.jobs.filter(j=>["failed","unknown"].includes(j.status)) || [];
  const known=ready?.evidence.filter(e=>e.status==="verified").length;

  if(auth===null)return <main id="main-content" className={styles.login}><div className={styles.loginCard}><Bot size={32}/><h1>Opening owner command…</h1></div></main>;
  if(!auth)return <main id="main-content" className={styles.login}><div className={styles.loginCard}><div className={styles.eyebrow}><LockKeyhole size={16}/> PRIVATE OWNER ACCESS</div><h1>DARTH ALGO<span>Command Center</span></h1><p>Open your private setup link to connect this device once. After that, just open your Command Center.</p><p className={styles.muted}>Already connected on another device? Each phone or browser needs its own setup link. Ask for a fresh link if yours has expired.</p>{!enabled && <p className={styles.muted}>Owner access is not enabled on this deployment yet.</p>}{error && <p role="alert" className={styles.error}>{error}</p>}<small>No passcode or passkey to enter. Your private workspace stays available on your connected device.</small></div></main>;

  return <main id="main-content" className={styles.shell}>
    <aside className={styles.sidebar}><div className={styles.brand}><span className={styles.mark}>DA</span><div>DARTH ALGO<small>OWNER COMMAND</small></div></div><div className={styles.ownerBadge}><ShieldCheck size={16}/> Private workspace</div><nav aria-label="Owner navigation">{sections.map((s,i)=><button key={s} className={section===s ? styles.selected : ""} onClick={()=>setSection(s)}><span>{["01","02","03","04","05","06"][i]}</span>{s}{s==="Decisions" && pending.length>0 && <b>{pending.length}</b>}</button>)}</nav><div className={styles.sideBottom}><span className={styles.statusDot}/>{ready?.ai.enabled ? "AI enabled" : "AI disabled"}<p>External business actions require approval and a connected executor.</p><button onClick={logout}>Sign out</button></div></aside>
    <div className={styles.main}><header className={styles.topbar}><div><span className={styles.eyebrow}>BUSINESS OPERATING SYSTEM</span><h1>{section}</h1></div><div className={styles.topActions}><button onClick={logout} title="Disconnect this device" aria-label="Disconnect this device"><LockKeyhole size={16}/></button><span className={styles.environment}>{ready?.environment || "Checking environment"}</span><button title="Refresh stored activity" aria-label="Refresh stored activity" onClick={refresh}><RefreshCw size={17}/></button><button disabled={busy || !snapshot} onClick={()=>action({operation:"pause",paused:!snapshot?.paused})}>{snapshot?.paused ? <Play size={16}/> : <Pause size={16}/>}<span>{snapshot?.paused ? "Resume" : "Pause"}</span></button></div></header>
    {ready?.environment==="preview" && <div className={styles.preview}><Database size={16}/><span>Preview workspace · Data comes from an isolated database copy. Production activity is not continuously synced.</span></div>}
    {error && <div className={styles.error} role="alert">{error}</div>}{notice && <div className={styles.notice} role="status"><Check size={16}/>{notice}</div>}
    {!snapshot && <section className={styles.panel}><h2>Initialize the operating workspace</h2><p>The connection check can run before the task and activity tables exist.</p><div className={styles.buttonRow}><button disabled={busy} onClick={checkConnections}>Check connections</button><button disabled={busy || ready?.store.status!=="verified"} onClick={()=>action({operation:"initialize"})}>Initialize OS tables</button></div><p className={styles.muted}>Creates the OS tables in this deployment’s configured database. Existing business tables are reused.</p></section>}

    {section==="Overview" && <><InstallApp/><section className={styles.hero}><div><span className={styles.eyebrow}>YOUR BUSINESS, IN VIEW</span><h2>One owner.<br/>Eight focused departments.</h2><p>{snapshot?.paused ? "Agent work is paused by the owner." : ready?.ai.enabled ? "Inspect completed work, resolve blockers, and direct the next priority." : "The workspace is ready to record work. AI requests wait until provider access and usage are enabled."}</p><button onClick={()=>{setDepartment("ceo");setSection("Conversations");}}>Talk to your CEO <ArrowUpRight size={17}/></button></div><div className={styles.heroOrb}><Bot size={52}/><span>CEO ORCHESTRATOR</span><b>{active.some(j=>j.department==="ceo") ? "Working" : "On demand"}</b></div></section><section className={styles.metrics}><Metric label="Working now" value={snapshot ? active.length : "—"} detail="Claimed jobs"/><Metric label="Waiting" value={snapshot ? waiting.length : "—"} detail="Durable queue"/><Metric label="Owner decisions" value={snapshot ? pending.length : "—"} detail="Pending approval"/><Metric label="Verified sources" value={known===undefined ? "—" : `${known}/${ready!.evidence.length}`} detail="Latest connection check"/></section><div className={styles.columns}><section className={styles.panel}><div className={styles.panelHeading}><h2>Next work</h2><ClipboardList size={18}/></div>{!waiting.length ? <Empty text="No queued jobs. Send a request to any department."/> : waiting.slice(0,4).map(j=><div className={styles.listItem} key={j.id}><div><small>{names[j.department]}</small><p>{j.message}</p></div><Status value={j.status}/></div>)}</section><section className={styles.panel}><div className={styles.panelHeading}><h2>Needs attention</h2><CircleHelp size={18}/></div><p>{problems.length} failed or interrupted jobs in the recent history.</p>{ready?.blockers.slice(0,5).map(b=><p className={styles.blocker} key={b}>{label(b)}</p>)}<button onClick={()=>setSection("Connections")}>Inspect connections <ChevronRight size={16}/></button></section></div><section className={styles.panel}><div className={styles.panelHeading}><h2>Daily CEO source brief</h2><button disabled={busy || !snapshot} onClick={()=>action({operation:"brief"})}>Collect today’s brief</button></div>{snapshot?.briefs[0] ? <><small>{time(snapshot.briefs[0].day)}</small><pre className={styles.prose}>{snapshot.briefs[0].body}</pre></> : <Empty text="No brief recorded yet. Collect one from the configured business sources; this does not call AI."/>}</section></>}

    {section==="Departments" && <><div className={styles.agentGrid}>{snapshot?.agents.map(a=><button className={styles.agentCard} key={a.id} onClick={()=>{setDepartment(a.id);setSection("Conversations");}}><div><Bot size={23}/><Status value={a.state}/></div><h2>{names[a.id]}</h2><p>{a.mandate}</p><small>{snapshot.tasks.filter(t=>t.department===a.id && t.status!=="completed").length} open tasks <ArrowUpRight size={15}/></small></button>)}</div><section className={styles.panel}><h2>Department task ledger</h2><p className={styles.muted}>Completed means an internal deliverable is saved. External business execution is not connected.</p>{!snapshot?.tasks.length && <Empty text="The CEO has not created any tasks yet."/>}{snapshot?.tasks.map(t=><details className={styles.task} key={t.id}><summary><span><small>{names[t.department]} · Priority {t.priority}</small><b>{t.title}</b></span><Status value={t.status}/></summary>{t.result && <pre className={styles.prose}>{t.result}</pre>}{["queued","blocked"].includes(t.status) && <button disabled={busy} onClick={()=>action({operation:"run_task",id:t.id,requestKey:crypto.randomUUID()})}>Queue internal work</button>}</details>)}</section></>}

    {section==="Conversations" && <section className={styles.conversation}><div className={styles.chatHeader}><div><span className={styles.eyebrow}>DEPARTMENT CONVERSATION</span><h2>{names[department]} Agent</h2></div><select aria-label="Department" value={department} onChange={e=>setDepartment(e.target.value as Department)}>{Object.entries(names).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></div><div className={styles.messages}>{!(snapshot?.messages.some(m=>m.department===department)) && <Empty text={`Your ${names[department]} conversation starts here. Requests are saved in the queue; responses appear after a real agent run.`}/>} {[...(snapshot?.messages || [])].filter(m=>m.department===department).reverse().map(m=><article key={m.id} className={m.role==="owner" ? styles.ownerMessage : styles.agentMessage}><small>{m.role==="owner" ? "You" : `${names[department]} Agent`} · {time(m.created_at)}</small><p>{m.body}</p></article>)}</div><form onSubmit={send} className={styles.composer}><textarea aria-label="Message to agent" value={message} onChange={e=>setMessage(e.target.value)} maxLength={4000} placeholder={`Ask ${names[department]} to focus on a specific business outcome…`} required/><div><small>{ready?.ai.enabled ? "Requests run within the configured usage limits." : "AI disabled · Your request will be saved and queued."}</small><button disabled={busy || !snapshot || !message.trim()}>Send request <ArrowUpRight size={17}/></button></div></form><div className={styles.jobs}><div className={styles.panelHeading}><h3>Recent jobs</h3><button disabled={busy || !ready?.ai.enabled} onClick={()=>action({operation:"work"})}>Process next job</button></div>{snapshot?.jobs.filter(j=>j.department===department).slice(0,8).map(j=><div className={styles.listItem} key={j.id}><p>{j.message}<small>{j.error_code && label(j.error_code)}</small></p><Status value={j.status}/>{j.status==="queued" && <button disabled={busy} onClick={()=>action({operation:"cancel_job",id:j.id})}>Cancel</button>}</div>)}</div></section>}

    {section==="Decisions" && <section className={styles.panel}><div className={styles.panelHeading}><h2>Owner approval desk</h2><ShieldCheck size={21}/></div><p className={styles.muted}>Every decision binds to the exact displayed proposal and expiry. Approval records a decision; it does not execute spending, publishing, refunds, or account changes.</p>{!snapshot?.approvals.length && <Empty text="No proposals recorded. New decisions will appear here and in the connected private Telegram bot."/>}{snapshot?.approvals.map(a=><article className={styles.approval} key={a.id}><div className={styles.panelHeading}><small>{label(a.payload.kind)}</small><Status value={a.effective_status}/></div><h3>{a.payload.summary}</h3><pre className={styles.prose}>{a.payload.details}</pre><small>Evidence: {a.payload.evidence.join(", ")} · Expires {time(a.expires_at)}</small>{a.effective_status==="pending" && <><label>Revision instructions or decision note<textarea aria-label={`Decision note for ${a.payload.summary}`} value={revision[a.id] || ""} onChange={e=>setRevision({...revision,[a.id]:e.target.value})} maxLength={2000}/></label><div className={styles.buttonRow}>{([['approved','Approve'],['revision_requested','Revise'],['declined','Decline']] as const).map(([decision,text])=><button key={decision} disabled={busy || (decision==="revision_requested" && !revision[a.id]?.trim())} onClick={()=>action({operation:"decide",id:a.id,payloadHash:a.payload_hash,decision,note:revision[a.id] || "Owner Command Center decision"})}>{text}</button>)}</div></>}</article>)}</section>}

    {section==="Activity" && <section className={styles.panel}><div className={styles.panelHeading}><h2>Persistent activity</h2><Activity size={20}/></div><p className={styles.muted}>Actual application events, refreshed every 15 seconds while this page is visible.</p>{!snapshot?.activity.length && <Empty text="No activity has been recorded."/>}{snapshot?.activity.map(a=><div className={styles.timeline} key={a.id}><span className={styles.statusDot}/><div><b>{label(a.event)}</b><small>{a.actor} · {time(a.created_at)}{a.entity_id && ` · ${a.entity_id}`}</small></div></div>)}</section>}

    {section==="Connections" && <><section className={styles.panel}><div className={styles.panelHeading}><h2>Business data coverage</h2><button disabled={busy} onClick={checkConnections}><RefreshCw size={16}/>Refresh source checks</button></div><p>{ready?.dataScope}</p><small>Last checked: {ready ? time(ready.checkedAt) : "not checked"}</small><div className={styles.sourceGrid}>{ready?.evidence.map(e=><article className={styles.source} key={e.id}><div className={styles.panelHeading}><h3>{label(e.id)}</h3><Status value={e.status}/></div><p>{e.scope}</p>{e.status==="verified" ? <DataView data={e.data}/> : <p className={styles.muted}>Unavailable · no value inferred</p>}</article>)}</div></section><section className={styles.panel}><h2>Runtime connections</h2><div className={styles.connectionRows}>{ready && Object.entries(ready.configuration).map(([key,value])=><div key={key}><span>{key.replace(/([A-Z])/g," $1")}</span><Status value={value ? "configured" : "missing"}/></div>)}</div><p className={styles.muted}>A configured credential does not establish provider connectivity. AI connectivity remains {ready?.ai.connectivity || "not tested"}.</p><div className={styles.buttonRow}><button disabled={busy || !snapshot} onClick={()=>action({operation:"telegram_check"})}>Check private Telegram</button><button disabled={busy || !snapshot || !ready?.configuration.privateTelegramEnabled} onClick={()=>action({operation:"telegram_connect"})}>Connect private bot webhook</button><button disabled={busy || !snapshot || !ready?.configuration.privateTelegramEnabled} onClick={()=>action({operation:"deliver"})}>Deliver pending owner notices</button></div>{snapshot?.outbox.filter(x=>x.status==="unknown").map(x=><p key={x.id} className={styles.blocker}>Delivery unconfirmed · {x.id}. Review in Telegram before retrying.</p>)}</section></>}
    <footer className={styles.footer}><Zap size={13}/> Evidence before action <span>Acquisition · Conversion · Retention · Referrals</span></footer></div>
  </main>;
}
function Metric({label:caption,value,detail}:{label:string;value:string|number;detail:string}){return <article className={styles.metric}><small>{caption}</small><strong>{value}</strong><span>{detail}</span></article>;}
function Status({value}:{value:string}){return <span className={`${styles.status} ${["working","running","verified","succeeded","completed","approved","configured"].includes(value) ? styles.good : ["failed","unknown","missing","unavailable"].includes(value) ? styles.warning : ""}`}>{label(value)}</span>;}
function Empty({text}:{text:string}){return <div className={styles.empty}><MessageSquare size={22}/><p>{text}</p></div>;}
function DataView({data}:{data:unknown}){
  if(Array.isArray(data)){
    if(!data.length)return <p className={styles.muted}>Verified empty result for this source.</p>;
    const keys=Object.keys(data[0] || {});
    return <div className={styles.tableScroll}><table><thead><tr>{keys.map(k=><th key={k}>{label(k)}</th>)}</tr></thead><tbody>{data.map((row,i)=><tr key={i}>{keys.map(k=><td key={k}>{String(row[k] ?? "—")}</td>)}</tr>)}</tbody></table></div>;
  }
  return <pre className={styles.prose}>{JSON.stringify(data,null,2)}</pre>;
}
