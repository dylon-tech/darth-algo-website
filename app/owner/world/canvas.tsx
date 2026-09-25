'use client';
import Image from 'next/image';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,Expand,Grid2X2,MessageCircle,Plus} from 'lucide-react';
import type {CeoHome} from '../../lib/business-os/ceo-home';
import type {AgentMode} from '../visual-team';
import {rooms,specialties,type RoomId,type WorldAgent} from './model';
import RoomArt,{AgentPortrait} from './room-art';
import s from './studio.module.css';
const date=(at:string|null|undefined)=>at?new Date(at).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET':'No saved timestamp';
export default function Campus({agents,data,fresh,onRoom,onAgent,focus}:{agents:WorldAgent[];data:CeoHome|null;fresh:boolean;onRoom:(room:RoomId)=>void;onAgent:(id:string,mode?:AgentMode)=>void;focus:RoomId|null}){
 const [watch,setWatch]=useState<RoomId>('content'),[overview,setOverview]=useState(false),[zoom,setZoom]=useState(false),[hidden,setHidden]=useState(false),[motion,setMotion]=useState(true),[follow,setFollow]=useState(false);
 const section=useRef<HTMLElement>(null),chosen=useRef(false);
 useEffect(()=>{const f=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',f);return()=>document.removeEventListener('visibilitychange',f);},[]);
 useEffect(()=>{if(focus){setWatch(focus);chosen.current=true;}},[focus]);
 useEffect(()=>{const active=agents.find(a=>a.active);if(active&&(follow||!chosen.current)){setWatch(active.room);chosen.current=true;}},[agents,follow]);
 const r=rooms.find(r=>r.id===watch)!,spec=specialties[watch],crew=agents.filter(a=>a.room===watch),active=crew.filter(a=>a.active),current=data?.team.find(a=>a.id===(active[0]?.id||crew[0]?.id));
 const choose=(id:RoomId)=>{chosen.current=true;setFollow(false);setWatch(id);setOverview(false);setZoom(false);};
 const move=(n:number)=>choose(rooms[(rooms.findIndex(r=>r.id===watch)+n+rooms.length)%rooms.length].id);
 const status=!fresh?'Unverified':active.length?`${active.length} working`:crew.some(a=>['Blocked','Error','Needs approval','Not configured'].includes(a.status))?'Needs attention':crew.some(a=>a.status==='Paused')?'Paused':watch==='publishing'?'Scheduled workflow':'Idle';
 return <section ref={section} className={s.campus} aria-label='Interactive headquarters' data-motion-paused={hidden||!motion} style={{'--room-accent':spec.color} as CSSProperties}>
  <header className={s.topbar}><div><span className={s.kicker}>DARTH ALGO / CAMPUS</span><h2>Inside headquarters<span className={s.connection} data-live={fresh}>{fresh?'Connected':'Unverified'}</span></h2></div><button className={s.overviewToggle} aria-pressed={overview} onClick={()=>setOverview(v=>!v)}><Grid2X2 size={16}/>{overview?'Back to room':'Whole campus'}</button></header>
  <nav className={s.roomNav} aria-label='Watch a department'>{rooms.map((room,i)=><button key={room.id} aria-pressed={!overview&&watch===room.id} onClick={()=>choose(room.id)}><span>{String(i+1).padStart(2,'0')}</span>{room.short}{agents.some(a=>a.room===room.id&&a.active)&&<i aria-label='Working'/>}</button>)}</nav>
  <div className={s.watchbar}><span>{fresh?`${agents.filter(a=>a.active).length} working · ${agents.length} specialists`:'Checking saved worker state'}{follow&&!agents.some(a=>a.active)?' · waiting for activity':''}</span><button aria-pressed={follow} onClick={()=>{setFollow(v=>!v);setOverview(false);}}>Follow work <span>{follow?'On':'Off'}</span></button></div>
  {overview?<div className={s.overview} aria-label='Campus overview'>{rooms.map((room,i)=>{const a=agents.filter(a=>a.room===room.id),busy=a.some(a=>a.active);return <button key={room.id} onClick={()=>choose(room.id)} style={{'--room-accent':specialties[room.id].color} as CSSProperties}><div className={s.miniArt}><RoomArt room={room.id} agents={agents} compact/></div><span className={s.roomIndex}>{String(i+1).padStart(2,'0')}</span><strong>{room.name}</strong><small>{!fresh?'Unverified':busy?'Working now':room.id==='publishing'?'Scheduled workflow':a.some(a=>['Error','Blocked','Needs approval'].includes(a.status))?'Needs attention':'Idle'} <ArrowUpRight size={15}/></small></button>})}</div>:
  <><div className={s.stageGrid}><div className={s.stage} data-zoom={zoom}>
    <div className={s.stageTitle}><span>{spec.label}</span><h3>{r.name}</h3><p data-working={Boolean(active.length)}><i/>{status}</p></div>
    <div className={s.artFrame}><RoomArt room={watch} agents={agents}/></div>
    <div className={s.stageTools}><button aria-label='Previous room' onClick={()=>move(-1)}><ChevronLeft size={19}/></button><span>{String(rooms.findIndex(r=>r.id===watch)+1).padStart(2,'0')} / 08</span><button aria-label='Next room' onClick={()=>move(1)}><ChevronRight size={19}/></button><button aria-label='Enlarge room' aria-pressed={zoom} onClick={()=>setZoom(v=>!v)}><Expand size={17}/></button><button aria-pressed={!motion} onClick={()=>setMotion(v=>!v)}>{motion?'Pause motion':'Resume motion'}</button></div>
   </div>
   <aside className={s.workbench} aria-label='Room workbench'>
    <div className={s.benchHeading}><span className={s.kicker}>THE WORK</span><span>{status}</span></div>
    {crew.length?crew.map(a=>{const raw=data?.team.find(t=>t.id===a.id);return <article className={s.agentCard} key={a.id} data-work-state={a.status}><div className={s.agentIdentity}><span className={s.portrait}><AgentPortrait agent={a}/></span><div><h4>{a.name}</h4><p data-online={a.active}>{a.status}{a.status==='Offline'?' · idle':''}</p></div></div><p className={s.taskLabel}>{a.active?'IN PROGRESS':raw?.next?'NEXT SAVED REQUEST':a.status==='Needs approval'?'YOUR DECISION':'CURRENT STATE'}</p><p className={s.task}>{a.active?(raw?.current?.message||raw?.task?.title||spec.work):raw?.next?.message||a.stage}</p>{a.active&&<p className={s.reported}>Reported stage: {a.stage}<br/>Started {date(a.observedAt)}</p>}<div className={s.agentActions}><button onClick={()=>onAgent(a.id)}>View work<ArrowUpRight size={14}/></button><button disabled={!fresh} onClick={()=>onAgent(a.id,'assign')}><Plus size={14}/>Give work</button><button disabled={!fresh} aria-label={`Help ${a.name}`} onClick={()=>onAgent(a.id,'message')}><MessageCircle size={15}/></button></div>{a.active&&<small className={s.helpHint}>Help saves a follow-up for this agent. It does not interrupt the running request.</small>}</article>;}):<article className={s.agentCard}><h4>Publishing desk</h4><p className={s.task}>9 AM & 3 PM Eastern</p><p>Reviewed work flows through your existing publisher. Open receipts to verify delivery.</p></article>}
    {watch==='content'&&data?.queue[0]?.image&&<button className={s.artifactPreview} onClick={()=>onRoom('content')}><span>SAVED CAMPAIGN ARTWORK</span><Image src={data.queue[0].image} alt='Latest saved campaign artwork' width={480} height={480}/><small>Open artwork & review <ArrowUpRight size={14}/></small></button>}
    {current?.completed&&<button className={s.savedOutput} onClick={()=>onAgent(current.id)}><span>LAST SAVED OUTPUT<ArrowUpRight size={14}/></span><p>{current.completed.brief?.slice(0,220)||'Completed output is available in this agent’s workspace.'}</p><small>{date(current.completed.finishedAt)}</small></button>}
    <button className={s.enterRoom} onClick={()=>onRoom(watch)}>{watch==='publishing'?'Review queue & receipts':'Open department workspace'}<ArrowUpRight size={17}/></button>
   </aside>
  </div><div className={s.evidenceStrip}><span><i/>{active.length?'Work motion follows a running job.':'No active job in this room.'}</span><span>Room illustration · saved worker state, not a screen recording</span></div></>}
 </section>;
}
