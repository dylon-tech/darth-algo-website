'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Archive,Bell,Check,ChevronRight,Clock,Copy,Mail,MessageSquare,RotateCcw,Search} from 'lucide-react';
import type {founderInbox,FounderInboxItem,FounderInboxPatch,FounderInboxState} from '../lib/business-os/founder-inbox';
import {inboxSummaryFor} from '../lib/business-os/founder-inbox-summary';
import {Detail,Empty,ExternalLink,Notice,SaveError,SourceNote,Status,saveRequest,timestamp,useFounderFeed,words} from './founder-shared';
import s from './founder.module.css';

type Snapshot=Awaited<ReturnType<typeof founderInbox>>;
type Feed=ReturnType<typeof useFounderFeed<Snapshot>>;
type Filter='all'|'customer'|'alert'|'agent'|'snoozed'|'hidden';
type Thread={item:FounderInboxItem;messages:Array<{id:string;role:string;body:string;at:string|null;truncated:boolean}>;draftHistory:Array<{version:number;body:string;at:string|null}>;stateAvailable:boolean;email:Snapshot['email'];canSend:boolean;checkedAt:string};
type Saved={status:'saved';state:FounderInboxState;message:string;sent:false};
type LocalDraft={draft:string;baseDraft:string;baseVersion:number};
const filters:Array<{id:Filter;label:string;accessibleLabel?:string}>=[{id:'all',label:'All'},{id:'customer',label:'Customers',accessibleLabel:'Customer messages'},{id:'alert',label:'Alerts',accessibleLabel:'Business alerts'},{id:'agent',label:'Agents',accessibleLabel:'Agent updates'},{id:'snoozed',label:'Snoozed'},{id:'hidden',label:'Hidden'}];
const viewKey='da-founder-inbox-view';
const draftKey=(id:string)=>`da-founder-inbox-draft:${id}`;
function readLocalDraft(id:string):LocalDraft|null{
 try{const d=JSON.parse(sessionStorage.getItem(draftKey(id))||'null');return d&&typeof d.draft==='string'&&d.draft.length<=20000&&typeof d.baseDraft==='string'&&Number.isSafeInteger(d.baseVersion)?d:null;}catch{return null;}
}
function removeLocalDraft(id:string){try{sessionStorage.removeItem(draftKey(id));}catch{/* Account save is independent of optional local recovery. */}}
function validState(value:unknown):value is FounderInboxState{return Boolean(value&&typeof value==='object'&&Number.isSafeInteger((value as FounderInboxState).version)&&typeof (value as FounderInboxState).draft==='string');}

export default function FounderInbox({base,feed}:{base:string;feed:Feed}){
 const [filter,setFilter]=useState<Filter>('all'),[query,setQuery]=useState(''),[selected,setSelected]=useState<string|null>(null),[limit,setLimit]=useState(40),[viewReady,setViewReady]=useState(false);
 useEffect(()=>{
  try{const saved=JSON.parse(sessionStorage.getItem(viewKey)||'null');if(filters.some(f=>f.id===saved?.filter))setFilter(saved.filter);if(typeof saved?.query==='string')setQuery(saved.query.slice(0,150));}catch{}
  const id=new URLSearchParams(location.search).get('item');if(id&&/^(support|loop|message|approval):[a-f0-9-]{36}$/.test(id))setSelected(id);
  setViewReady(true);
 },[]);
 useEffect(()=>{if(viewReady)try{sessionStorage.setItem(viewKey,JSON.stringify({filter,query}));}catch{}},[filter,query,viewReady]);
 useEffect(()=>setLimit(40),[filter,query]);
 const open=useCallback((id:string)=>{setSelected(id);const url=new URL(location.href);url.searchParams.set('item',id);history.replaceState({},'',url);},[]);
 const close=useCallback(()=>{setSelected(null);const url=new URL(location.href);url.searchParams.delete('item');history.replaceState({},'',url);},[]);
 const setFeedData=feed.setData,refreshFeed=feed.refresh;
 const applyState=useCallback((id:string,state:FounderInboxState)=>{
  setFeedData(previous=>{
   if(!previous)return previous;
   const items=previous.items.map(item=>item.id===id?{...item,state,unread:!state.readAt||Boolean(item.at&&Date.parse(item.at)>Date.parse(state.readAt))}:item);
   const unreadCount=previous.unreadCount===null?null:items.filter(item=>item.unread&&!item.state.resolvedAt&&!(item.state.snoozedUntil&&Date.parse(item.state.snoozedUntil)>Date.now())).length;
   return {...previous,items,unreadCount};
  });
  void refreshFeed();
 },[setFeedData,refreshFeed]);
 const now=Date.now(),normalizedQuery=query.trim().toLowerCase();
 const items=(feed.data?.items||[]).filter(item=>{
  const hidden=Boolean(item.state.resolvedAt),snoozed=Boolean(item.state.snoozedUntil&&Date.parse(item.state.snoozedUntil)>now);
  const inFilter=filter==='hidden'?hidden:filter==='snoozed'?snoozed&&!hidden:!hidden&&!snoozed&&(filter==='all'||item.category===filter);
  return inFilter&&(!normalizedQuery||[item.title,item.preview,item.sender,item.customerId].join(' ').toLowerCase().includes(normalizedQuery));
 });
 return <>
  {feed.error&&<Notice error>{feed.data?'Couldn’t refresh. Showing saved messages.':feed.error}</Notice>}
  {feed.data?.status==='partial'&&<Notice>Some messages couldn’t refresh. Your saved messages are below.</Notice>}
  <div className={s.search}><Search size={19}/><input aria-label='Search Inbox' placeholder='Search messages and alerts' value={query} onChange={event=>setQuery(event.target.value)} maxLength={150}/></div>
  <div className={s.filters} aria-label='Inbox categories'>{filters.map(f=><button key={f.id} aria-label={f.accessibleLabel} aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}>{f.label}</button>)}</div>
  {feed.data&&!feed.data.capabilities.emailSync&&(filter==='all'||filter==='customer')&&<div className={s.card} style={{marginBottom:16}}><div className={s.actions}><Mail size={18}/><h3>Email isn’t connected</h3></div><p>Read full conversations and send replies in Gmail.</p><ExternalLink href={feed.data?.email.href||'https://mail.google.com/'}>Open Gmail</ExternalLink></div>}
  {!feed.data&&feed.loading?<div aria-label='Loading Inbox' aria-busy='true'><div className={s.skeleton} style={{height:110}}/><div className={s.skeleton} style={{height:110}}/></div>:items.length?<>
   <div className={s.summaryRow}><span>{items.length} {items.length===1?'message':'messages'}</span><span>{filter==='hidden'?'Restore any time':filter==='snoozed'?'Returns after snooze':'Newest first'}</span></div>
   <div className={s.group}>{items.slice(0,limit).map(item=>{
    const Icon=item.category==='customer'?Mail:item.category==='agent'?MessageSquare:Bell,summary=inboxSummaryFor(item);
    return <button key={item.id} className={s.row} onClick={()=>open(item.id)} aria-label={`${item.unread?'Unread. ':''}${summary?.result||item.title}${summary?.action?` Next: ${summary.action}`:''}`}>
     <span className={s.avatar}><Icon size={20}/></span><div><strong className={s.inboxPreview}>{summary?.result||item.title}</strong><small className={s.inboxPreview} style={{color:'#c4c7ce'}}>{summary?(summary.action?`${summary.actionLabel}: ${summary.action}`:'Open the full update'):item.preview}</small><small>{item.sender||words(item.category)}</small>{filter==='snoozed'&&<small>Until {timestamp(item.state.snoozedUntil)}</small>}</div>
     <span className={s.rowTime}>{item.at?new Date(item.at).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/New_York'}):'Date unknown'}{item.unread&&<span className={s.unread} style={{display:'block',margin:'8px 0 0 auto'}} aria-hidden='true'/>}</span><ChevronRight size={16}/>
    </button>;
   })}</div>{items.length>limit&&<button className={s.secondary} style={{marginTop:16}} onClick={()=>setLimit(value=>value+40)}>Show more</button>}
  </>:<Empty title={feed.error?'Inbox unavailable':filter==='customer'?'No saved customer summaries':filter==='hidden'?'Nothing hidden':filter==='snoozed'?'Nothing snoozed':query?'No matches':'No messages here'}>{filter==='customer'?'Check Gmail for new emails.':filter==='hidden'?'Hidden messages can be restored here.':filter==='snoozed'?'Snoozed messages return when their time is up.':'New saved updates will appear here.'}</Empty>}
  <SourceNote source={feed.data?.coverage||'Persisted business records have not returned yet.'} at={feed.data?.checkedAt}>{feed.data?.sources.map(source=><p key={source.id}>{words(source.id)}: {source.status==='read'?`${source.returned} returned${source.bounded?' · bounded to latest records':''}`:'Unavailable'}</p>)}</SourceNote>
  {selected&&<InboxThread key={selected} id={selected} base={base} onClose={close} onState={applyState}/>}
 </>;
}

function InboxThread({id,base,onClose,onState}:{id:string;base:string;onClose:()=>void;onState:(id:string,state:FounderInboxState)=>void}){
 const detail=useFounderFeed<Thread>(`${base}/founder-inbox?id=${encodeURIComponent(id)}`);
 const [state,setState]=useState<FounderInboxState|null>(null),[draft,setDraft]=useState(''),[baseline,setBaseline]=useState(''),[conflict,setConflict]=useState<FounderInboxState|null>(null),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[offline,setOffline]=useState(false),[recoveryUnavailable,setRecoveryUnavailable]=useState(false),[saveFailed,setSaveFailed]=useState(false);
 const initialized=useRef(false),lock=useRef(false),draftRef=useRef(''),stateRef=useRef<FounderInboxState|null>(null),baselineRef=useRef('');
 const item=detail.data?.item,dirty=draft!==baseline;
 draftRef.current=draft; stateRef.current=state; baselineRef.current=baseline;
 useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 useEffect(()=>{
  const incoming=detail.data?.item.state;if(!incoming||detail.data?.stateAvailable===false)return;
  if(!initialized.current){
   initialized.current=true;const local=readLocalDraft(id);setState(incoming);setBaseline(incoming.draft);
   if(local&&local.draft!==incoming.draft){setDraft(local.draft);setNotice('Your unfinished reply is restored.');if(local.baseVersion!==incoming.version&&local.baseDraft!==incoming.draft)setConflict(incoming);}
   else {setDraft(incoming.draft);removeLocalDraft(id);}
  }else if(stateRef.current&&incoming.version>stateRef.current.version){
   if(draftRef.current!==baselineRef.current&&incoming.draft!==baselineRef.current)setConflict(incoming);
   else {setState(incoming);setBaseline(incoming.draft);if(draftRef.current===baselineRef.current)setDraft(incoming.draft);}
  }
 },[detail.data,id]);
 useEffect(()=>{
  if(!initialized.current||!state)return;
  if(dirty){try{sessionStorage.setItem(draftKey(id),JSON.stringify({draft,baseDraft:baseline,baseVersion:state.version}));setRecoveryUnavailable(false);}catch{setRecoveryUnavailable(true);}}
  else removeLocalDraft(id);
 },[draft,baseline,state,id,dirty]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 async function change(patch:FounderInboxPatch){
  if(!state||detail.data?.stateAvailable===false||lock.current||conflict)return;
  lock.current=true;setBusy(true);setError('');setNotice('');setSaveFailed(false);
  try{
   const result=await saveRequest<Saved>(base+'/founder-inbox',{operation:'update',id,expectedVersion:state.version,patch});
   setState(result.state);setBaseline(result.state.draft);if(patch.draft!==undefined){setDraft(result.state.draft);removeLocalDraft(id);}setNotice(result.message);onState(id,result.state);
  }catch(e){
   setSaveFailed(true);
   if(e instanceof SaveError&&e.status===409&&validState(e.current)){setConflict(e.current);setError('A newer version exists. Your reply is safe below.');}
   else setError(e instanceof Error?e.message:'Save failed. Your unfinished reply is preserved.');
  }finally{lock.current=false;setBusy(false);}
 }
 function chooseConflict(useAccount:boolean){
  if(!conflict)return;setState(conflict);setBaseline(conflict.draft);if(useAccount){setDraft(conflict.draft);removeLocalDraft(id);}setConflict(null);setError('');setSaveFailed(false);setNotice(useAccount?'Using the saved account draft.':'Review your reply, then save to replace the account version.');
 }
 async function copyDraft(){try{await navigator.clipboard.writeText(draft);setNotice('Reply copied. Review it in the original thread before sending.');}catch{setError('Couldn’t copy. Select the reply and use Copy on your device.');}}
 const saveLabel=busy?'Saving…':detail.data?.stateAvailable===false?'Saved draft unavailable':!state?'Loading saved draft':offline&&dirty?'Offline draft':conflict?'Review conflict':saveFailed?'Save failed':dirty?'Draft on this device':'Saved to account';
 const unread=state?(!state.readAt||Boolean(item?.at&&Date.parse(item.at)>Date.parse(state.readAt))):item?.unread;
 const hidden=Boolean(state?.resolvedAt),snoozed=Boolean(state?.snoozedUntil&&Date.parse(state.snoozedUntil)>Date.now());
 const summary=item?inboxSummaryFor(item):null;
 return <Detail title={item?.category==='customer'?'Customer conversation':item?.category==='agent'?'Agent update':'Business alert'} onClose={onClose} actions={item?.category==='customer'?<><small className={s.saveLabel} role='status'>{saveLabel}</small><button className={s.primary} disabled={!state||detail.data?.stateAvailable===false||!dirty||busy||Boolean(conflict)||offline} onClick={()=>void change({draft})}>{busy?'Saving…':'Save draft'}</button></>:undefined}>
  {detail.error&&<Notice error>{detail.error}<button className={s.secondary} onClick={()=>void detail.refresh()} disabled={detail.loading}>Refresh saved record</button></Notice>}
  {!item?<Empty title={detail.loading?'Reading saved messages':'Conversation unavailable'}>{detail.loading?'Your account record is loading.':'Return to the Inbox or refresh this record.'}</Empty>:<>
   <div className={s.actions}><span className={s.avatar}>{item.category==='customer'?<Mail size={22}/>:item.category==='agent'?<MessageSquare size={22}/>:<Bell size={22}/>}</span><div style={{flex:1,minWidth:0}}><h2 style={{overflowWrap:'anywhere'}}>{item.category==='customer'?item.title:item.sender||'Business update'}</h2><p className={s.soft}>{item.category==='customer'&&<>{item.sender} · </>}{timestamp(item.at)}</p></div></div>
   {(hidden||snoozed)&&<div className={s.actions} style={{marginTop:16}}><Status value={hidden?'hidden from Inbox':'snoozed'}/></div>}
   {item.category==='customer'&&item.contentCoverage==='summary_only'&&<Notice>This is a saved summary, not the complete original thread.</Notice>}
   {detail.data?.stateAvailable===false&&<Notice error>Couldn’t load saved changes. Refresh before editing.</Notice>}
   {summary?<>
    <div className={s.card} style={{marginTop:20}}><h3>{summary.result}</h3>{summary.action&&<p style={{color:'#d5d8df'}}><strong>{summary.actionLabel}:</strong> {summary.action}</p>}{item.sourceHref&&<ExternalLink href={item.sourceHref}>{item.kind==='decision'?'Review decision':item.kind==='content_update'?'Open content':item.category==='agent'?'Open team':'Review action'}</ExternalLink>}</div>
    <details className={s.source}><summary style={{minHeight:44}}>Original update</summary><h3>{item.title}</h3><OriginalMessages messages={detail.data?.messages||[]} sender={item.sender}/></details>
   </>:<OriginalMessages messages={detail.data?.messages||[]} sender={item.sender}/>}
   {notice&&<Notice>{notice}</Notice>}{error&&<Notice error>{error}</Notice>}
   {conflict&&<Notice error><strong>Review the newer account version</strong><details style={{marginTop:12}}><summary>Show account draft · version {conflict.version}</summary><p className={s.prose} style={{marginTop:12}}>{conflict.draft||'No reply draft saved.'}</p></details><div className={s.actions}><button className={s.secondary} onClick={()=>chooseConflict(true)}>Use account draft</button><button className={s.secondary} onClick={()=>chooseConflict(false)}>Keep my draft</button></div></Notice>}
   {item.category==='customer'&&<section style={{marginTop:24}}><h3>Reply draft</h3><p className={s.soft} style={{marginBottom:14}}>Draft only. Review and send in the original thread.</p><label className={s.field}>Your reply<textarea rows={8} maxLength={20000} value={draft} onChange={event=>{setDraft(event.target.value);setNotice('');}} placeholder='Write your reply…' disabled={!state||detail.data?.stateAvailable===false||busy}/><small>{draft.length.toLocaleString()} / 20,000 characters · {saveLabel}</small></label>
    {recoveryUnavailable&&<Notice error>Local recovery is unavailable. Save or copy your reply before leaving.</Notice>}
    {offline&&dirty&&<Notice>Offline draft. Your reply stays in this browser session. Reconnect, review, and save it explicitly.</Notice>}
    <div className={s.actions} style={{marginTop:14}}><button className={s.secondary} onClick={()=>void copyDraft()} disabled={!draft}><Copy size={16}/>Copy reply</button><ExternalLink href={item.sourceHref||detail.data?.email.href}>{item.sourceHref?'Open original thread':'Open business email'}</ExternalLink></div>
    {detail.data?.draftHistory.length? <details className={s.source}><summary>Saved reply versions</summary>{detail.data.draftHistory.map(version=><article className={s.card} key={version.version} style={{marginTop:10}}><small>Version {version.version} · {timestamp(version.at)}</small><p className={s.prose}>{version.body||'Empty draft'}</p><button className={s.linkButton} disabled={busy} onClick={()=>{setDraft(version.body);setNotice('Previous reply restored. Review and save it.');}}><RotateCcw size={15}/>Use this reply</button></article>)}</details>:null}
   </section>}
   <div className={s.actions} style={{marginTop:20}}>
    <button className={s.secondary} disabled={!state||detail.data?.stateAvailable===false||busy||Boolean(conflict)||offline} onClick={()=>void change({read:Boolean(unread)})}>{unread?<Check size={16}/>:<Mail size={16}/>}Mark {unread?'read':'unread'}</button>
   </div><details className={s.source}><summary style={{minHeight:44}}>Snooze or hide</summary><div className={s.actions}>
    <button className={s.secondary} disabled={!state||detail.data?.stateAvailable===false||busy||Boolean(conflict)||offline} onClick={()=>void change({snoozedUntil:snoozed?null:new Date(Date.now()+24*3600000).toISOString()})}><Clock size={16}/>{snoozed?'End snooze':'Snooze 24 hours'}</button>
    <button className={s.secondary} disabled={!state||detail.data?.stateAvailable===false||busy||Boolean(conflict)||offline} onClick={()=>void change({resolved:!hidden})}>{hidden?<RotateCcw size={16}/>:<Archive size={16}/>} {hidden?'Restore to Inbox':'Hide from Inbox'}</button>
   </div><p>Changes this Inbox view only. The original case, decision, or job stays unchanged.</p></details>
   <SourceNote source={item.source} at={detail.data?.checkedAt}><p>{item.contentCoverage==='full_message'?'Persisted message text':item.contentCoverage==='summary_only'?'Summary coverage only':'Recorded business alert'} · {timestamp(item.at)}</p>{summary&&<p>{summary.basis==='message_excerpt'?'Short excerpts from the saved agent report; not an independent provider check.':'Short result and next step from the saved alert fields.'}</p>}{item.customerId&&<p>Customer: {item.customerId}</p>}{item.jobId&&<p>Job: {item.jobId}</p>}{item.runId&&<p>Run: {item.runId}</p>}<p>Account state version: {state?.version??'Unavailable'}</p></SourceNote>
  </>}
 </Detail>;
}

function OriginalMessages({messages,sender}:{messages:Thread['messages'];sender:string}){
 return <div style={{display:'grid',gap:12,marginTop:20}}>{messages.map(message=><article key={message.id} className={s.card}><div className={s.summaryRow} style={{padding:'0 0 12px'}}><span>{message.role==='owner'?'You':message.role==='agent'?sender:message.role==='summary'?'Saved customer summary':'Recorded update'}</span><time dateTime={message.at||undefined}>{timestamp(message.at)}</time></div><p className={s.prose} style={{margin:0,color:'#d5d8df'}}>{message.body}</p>{message.truncated&&<small>Partial record · open the source for the full conversation.</small>}</article>)}</div>;
}
