'use client';
import {useEffect,useRef,useState} from 'react';
import type Phaser from 'phaser';
import type {RoomId,WorldAgent} from './model';
import styles from './world.module.css';
export default function Canvas({agents,onRoom,onAgent,focus}:{agents:WorldAgent[];onRoom:(room:RoomId)=>void;onAgent:(id:string)=>void;focus:RoomId|null}){
 const root=useRef<HTMLDivElement>(null),game=useRef<Phaser.Game|null>(null),latest=useRef({agents,onRoom,onAgent,focus});latest.current={agents,onRoom,onAgent,focus};
 const [failed,setFailed]=useState(false),[ready,setReady]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let disposed=false;const host=root.current!,motion=matchMedia('(prefers-reduced-motion: reduce)');setFailed(false);setReady(false);
  const fail=()=>{if(!disposed){setFailed(true);game.current?.destroy(true);game.current=null;}};
  const visibility=()=>{if(document.hidden)game.current?.loop.sleep();else game.current?.loop.wake();};
  const reduced=()=>game.current?.events.emit('hq-reduced',motion.matches);
  void import('./scene').then(({bootWorld})=>{if(disposed)return;try{game.current=bootWorld(host,{agents:latest.current.agents,reduced:motion.matches,room:id=>latest.current.onRoom(id),agent:id=>latest.current.onAgent(id),ready:()=>{if(disposed)return;setReady(true);if(latest.current.focus)game.current?.events.emit('hq-camera',latest.current.focus);visibility();},failed:fail});}catch{fail();}}).catch(fail);
  const lost=(e:Event)=>{e.preventDefault();fail();};host.addEventListener('webglcontextlost',lost,true);document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',reduced);
  const resize=new ResizeObserver(()=>{if(game.current)game.current.scale.resize(host.clientWidth,host.clientHeight);});resize.observe(host);
  return()=>{disposed=true;resize.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',reduced);host.removeEventListener('webglcontextlost',lost,true);game.current?.destroy(true);game.current=null;};
 },[retry]);
 useEffect(()=>{game.current?.events.emit('hq-agents',agents);},[agents,ready]);
 useEffect(()=>{if(focus)game.current?.events.emit('hq-camera',focus);},[focus,ready]);
 const camera=(action:string)=>game.current?.events.emit('hq-camera',action);
 return <section className={styles.viewport} aria-label='Interactive headquarters'>
  <div ref={root} className={styles.canvas} tabIndex={0} role='application' aria-label='Headquarters map. Arrow keys pan; plus and minus zoom. Use the Departments buttons for accessible room selection.' onKeyDown={e=>{const action=({ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down','+':'in','=':'in','-':'out',Home:'home'} as Record<string,string>)[e.key];if(action){e.preventDefault();camera(action);}}}/>
  {!ready&&!failed&&<p className={styles.canvasMessage}>Opening your campus…</p>}
  {failed&&<div className={styles.canvasMessage} role='status'><p>The map could not load. All departments and controls are still available below.</p><button onClick={()=>setRetry(n=>n+1)}>Reload map</button></div>}
  <div className={styles.mapCaption}>HQ WORLD <span>Crew status reflects saved work</span></div>
  <div className={styles.camera}><button onClick={()=>camera('out')} aria-label='Zoom out' disabled={!ready||failed}>−</button><button onClick={()=>camera('home')} disabled={!ready||failed}>Whole campus</button><button onClick={()=>camera('in')} aria-label='Zoom in' disabled={!ready||failed}>+</button></div>
 </section>;
}
