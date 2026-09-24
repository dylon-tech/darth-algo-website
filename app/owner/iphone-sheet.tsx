'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode,type RefObject} from 'react';
import styles from './iphone-home.module.css';

const ReturnFocusContext=createContext<RefObject<HTMLElement|null>|null>(null);
/** Capture activation before the dialog makes its background inert or moves focus. */
export function SheetFocusProvider({children}:{children:ReactNode}){
 const trigger=useRef<HTMLElement|null>(null);
 return <ReturnFocusContext.Provider value={trigger}><div onClickCapture={event=>{
  if(!(event.target instanceof Element)||event.target.closest('[role="dialog"]'))return;
  const control=event.target.closest<HTMLElement>('button,a[href],summary,[role="button"]');
  if(control&&!control.closest('[inert]'))trigger.current=control;
 }}>{children}</div></ReturnFocusContext.Provider>;
}
/** Presentation only. Child owns its dialog label and business actions. */
export default function IphoneSheet({children,onClose}:{children:ReactNode;onClose:()=>void}) {
 const root=useRef<HTMLDivElement>(null),start=useRef<number|null>(null),returnFocus=useContext(ReturnFocusContext);
 const [drag,setDrag]=useState(0),[viewport,setViewport]=useState<{height:number;top:number}|null>(null);
 useEffect(()=>{
  const body=document.body,scrollY=window.scrollY;
  // Safari activation need not focus a button; a child's effect can also focus first.
  const prior=returnFocus?.current||document.activeElement as HTMLElement|null;
  const saved={position:body.style.position,top:body.style.top,width:body.style.width,overflow:body.style.overflow};
  body.style.position='fixed';body.style.top=`-${scrollY}px`;body.style.width='100%';body.style.overflow='hidden';
  const visible=()=>{const v=window.visualViewport;setViewport(v?{height:v.height,top:v.offsetTop}:{height:window.innerHeight,top:0});};
  visible();window.visualViewport?.addEventListener('resize',visible);window.visualViewport?.addEventListener('scroll',visible);window.addEventListener('resize',visible);
  const focusables=()=>Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')||[]).filter(e=>e.getClientRects().length>0&&!e.closest('[hidden],[inert]'));
  const frame=requestAnimationFrame(()=>{const dialog=root.current?.querySelector<HTMLElement>('[role="dialog"]');if(!dialog?.contains(document.activeElement))focusables()[0]?.focus({preventScroll:true});});
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(event.key==='Tab'){
    const items=focusables(),first=items[0],last=items.at(-1);
    if(!first){event.preventDefault();return;}
    if(!root.current?.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
    else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',key);
  return()=>{
   cancelAnimationFrame(frame);document.removeEventListener('keydown',key);
   window.visualViewport?.removeEventListener('resize',visible);window.visualViewport?.removeEventListener('scroll',visible);window.removeEventListener('resize',visible);
   Object.assign(body.style,saved);window.scrollTo({top:scrollY,behavior:'instant'});
   requestAnimationFrame(()=>{
    if(prior?.isConnected&&prior.getClientRects().length&&!prior.closest('[inert],[hidden]'))prior.focus({preventScroll:true});
    else document.getElementById('hq-heading')?.focus({preventScroll:true});
   });
  };
 },[onClose,returnFocus]);
 return <div ref={root} className={styles.overlay} style={viewport?{top:viewport.top,height:viewport.height}:undefined} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className={styles.sheetFrame} style={{transform:`translateY(${drag}px)`,maxHeight:viewport?viewport.height-8:undefined}}>
   <div className={styles.grabber} aria-hidden='true' onPointerDown={e=>{start.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(start.current!==null)setDrag(Math.max(0,e.clientY-start.current));}} onPointerUp={e=>{const distance=start.current===null?0:e.clientY-start.current;start.current=null;setDrag(0);if(distance>96)onClose();}} onPointerCancel={()=>{start.current=null;setDrag(0);}}><span/></div>
   {children}
  </div>
 </div>;
}
